import React, { useEffect, useState } from 'react';
import { Button, ButtonSet, Dropdown, InlineLoading, InlineNotification, TextInput, Tag } from '@carbon/react';
import { showSnackbar, Workspace2, type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { mutate } from 'swr';
import { useTranslation } from 'react-i18next';
import { extractFetchError } from '../claims-management/table/virtual-claim-preauth/utils';
import {
  identifyEmergencyPatient,
  sendSHAOtp,
  useHieIdentificationTypes,
  useSHAPatientSearch,
  type EmergencyCatalogEntry,
} from '../../billing-form/social-health-authority/sha-virtual-claim.resource';
import OtpBoxes from './otp-boxes.component';
import styles from './identify-emergency-patient.scss';

export type IdentifyEmergencyPatientWorkspaceProps = {
  consentToken: string;
  interventionCode?: string;
  patientUuid?: string;
  workspaceTitle?: string;
  onIdentified?: () => void;
};

const IdentifyEmergencyPatientWorkspace: React.FC<
  Workspace2DefinitionProps<IdentifyEmergencyPatientWorkspaceProps, {}, {}>
> = ({ workspaceProps, closeWorkspace }) => {
  const { t } = useTranslation();
  const { consentToken, interventionCode, patientUuid, onIdentified } = workspaceProps;

  const { entries: idTypeEntries } = useHieIdentificationTypes();

  const [idType, setIdType] = useState<EmergencyCatalogEntry | null>(null);
  const [idNumber, setIdNumber] = useState('');
  const [search, setSearch] = useState<{ number: string; type: string } | null>(null);
  const [otp, setOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const OTP_RESEND_SECONDS = 60;

  useEffect(() => {
    if (resendIn <= 0) {
      return;
    }
    const id = setInterval(() => setResendIn((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  const {
    demographics,
    crNumber,
    fullName,
    isLoading: isSearching,
    error: searchError,
  } = useSHAPatientSearch(search?.number, search?.type);

  const handleSendOtp = async () => {
    if (!crNumber) {
      return;
    }
    setIsSendingOtp(true);
    try {
      await sendSHAOtp(crNumber, interventionCode ? [interventionCode] : []);
      setOtpSent(true);
      setResendIn(OTP_RESEND_SECONDS);
      showSnackbar({
        kind: 'success',
        title: t('otpSent', 'OTP sent'),
        subtitle: t('otpSentToPatient', 'A one-time password was sent to the patient for consent.'),
      });
    } catch (error) {
      showSnackbar({
        kind: 'error',
        title: t('otpSendFailed', 'Could not send OTP'),
        subtitle: extractFetchError(error),
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleIdentify = async () => {
    if (!crNumber || !otp.trim()) {
      return;
    }
    setIsIdentifying(true);
    try {
      await identifyEmergencyPatient({
        consentToken,
        beneficiaryCrId: crNumber,
        otp: otp.trim(),
        identificationNumber: search?.number,
        identificationType: search?.type,
        demographics,
      });
      showSnackbar({
        kind: 'success',
        title: t('patientIdentified', 'Patient identified'),
        subtitle: t('patientIdentifiedSubtitle', 'The emergency claim was linked to the patient.'),
      });
      onIdentified?.();
      if (patientUuid) {
        await mutate((key) => typeof key === 'string' && key.includes(patientUuid));
      }
      closeWorkspace({ discardUnsavedChanges: true });
    } catch (error) {
      showSnackbar({
        kind: 'error',
        title: t('identifyFailed', 'Could not identify patient'),
        subtitle: extractFetchError(error),
      });
    } finally {
      setIsIdentifying(false);
    }
  };

  const canSearch = Boolean(idType && idNumber.trim());

  return (
    <Workspace2 hasUnsavedChanges={false} title={t('identifyEmergencyPatient', 'Identify emergency patient')}>
      <div className={styles.workspace}>
        <div className={styles.container}>
          <div className={styles.grid}>
            <Dropdown
              id="identify-id-type"
              titleText={t('identificationType', 'Identification type')}
              label={t('select', 'Select')}
              items={idTypeEntries}
              itemToString={(item: EmergencyCatalogEntry | null) => item?.label ?? ''}
              selectedItem={idType}
              onChange={({ selectedItem }) => setIdType(selectedItem)}
            />
            <TextInput
              id="identify-id-number"
              labelText={t('identificationNumber', 'Identification number')}
              value={idNumber}
              onChange={(event) => setIdNumber(event.target.value)}
            />
          </div>

          <Button
            kind="tertiary"
            size="md"
            disabled={!canSearch || isSearching}
            onClick={() => idType && setSearch({ number: idNumber.trim(), type: idType.value })}>
            {isSearching ? (
              <InlineLoading description={t('searching', 'Searching...')} />
            ) : (
              t('searchPatient', 'Search patient')
            )}
          </Button>

          {search && !isSearching && !crNumber && !searchError && (
            <InlineNotification
              lowContrast
              kind="warning"
              hideCloseButton
              title={t('noPatientFound', 'No patient found')}
              subtitle={t('noPatientFoundSubtitle', 'No SHA patient matched that identification.')}
            />
          )}
          {searchError && (
            <InlineNotification
              lowContrast
              kind="error"
              title={t('searchFailed', 'Search failed')}
              subtitle={extractFetchError(searchError)}
            />
          )}

          {crNumber && (
            <div className={styles.result}>
              <div className={styles.resultRow}>
                <span className={styles.patientName}>{fullName ?? t('unknownName', 'Unknown name')}</span>
                <Tag type="green" size="sm">
                  {crNumber}
                </Tag>
              </div>

              <div className={styles.otpField}>
                <span className={styles.otpLabel}>{t('patientConsentOtp', 'Patient consent OTP')}</span>
                <div className={styles.otpInputRow}>
                  <OtpBoxes id="identify-otp" value={otp} onChange={setOtp} length={6} disabled={isIdentifying} />
                  <Button kind="tertiary" size="md" disabled={isSendingOtp || resendIn > 0} onClick={handleSendOtp}>
                    {isSendingOtp
                      ? t('sendingOtp', 'Sending...')
                      : otpSent
                      ? t('resendOtp', 'Resend OTP')
                      : t('sendOtp', 'Send OTP')}
                  </Button>
                </div>
                {resendIn > 0 && (
                  <span className={styles.otpTimer}>
                    {t('otpResendIn', 'Resend code in {{seconds}}s', { seconds: resendIn })}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <ButtonSet className={styles.buttonSet}>
          <Button kind="secondary" className={styles.button} onClick={() => closeWorkspace()}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button
            kind="primary"
            className={styles.button}
            disabled={!crNumber || !otp.trim() || isIdentifying}
            onClick={handleIdentify}>
            {isIdentifying ? (
              <InlineLoading description={t('identifying', 'Identifying...')} />
            ) : (
              t('identify', 'Identify')
            )}
          </Button>
        </ButtonSet>
      </div>
    </Workspace2>
  );
};

export default IdentifyEmergencyPatientWorkspace;
