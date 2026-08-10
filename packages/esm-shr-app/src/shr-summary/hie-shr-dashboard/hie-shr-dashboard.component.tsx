import React, { useCallback } from 'react';
import { Button, InlineLoading, Layer, SkeletonText, Tag, Tile } from '@carbon/react';
import { ArrowRight, Renew, Close } from '@carbon/react/icons';
import { ErrorCard, formatDatetime, isDesktop, parseDate, showModal, useLayoutType } from '@openmrs/esm-framework';
import { EmptyDataIllustration } from '@openmrs/esm-patient-common-lib';
import { useTranslation } from 'react-i18next';
import { useShrConsent, type ShrConsent } from '../shr-summary.resource';
import { useShrVisitActions } from './use-shr-visit-actions';
import HiePatientRecords from './hie-patient-records.component';
import styles from './hie-shr-dashboard.scss';

interface HieSHRDashboardProps {
  patientUuid: string;
  patient: fhir.Patient;
}

const getPatientDisplayName = (patient?: fhir.Patient): string => {
  const name = patient?.name?.[0];
  if (!name) {
    return '';
  }
  if (name.text) {
    return name.text;
  }
  return [name.given?.join(' '), name.family].filter(Boolean).join(' ');
};

const formatConsentDate = (value: string | null | undefined): string => {
  if (!value) {
    return '--';
  }
  try {
    return formatDatetime(parseDate(value));
  } catch {
    return value;
  }
};

const ActiveConsentSummary: React.FC<{ consent: ShrConsent | null; onChange: () => void }> = ({
  consent,
  onChange,
}) => {
  const { t } = useTranslation();
  const isEmergency = Boolean(consent?.emergency);
  const { canManageVisit, isRefreshing, isClosing, handleRefresh, handleClose } = useShrVisitActions({
    consent,
    onChange,
  });

  const launchCloseConfirmation = useCallback(() => {
    const dispose = showModal('shr-visit-close-confirmation-modal', {
      onConfirm: handleClose,
      closeModal: () => dispose(),
    });
  }, [handleClose]);

  return (
    <div className={styles.consentCard}>
      <div className={styles.consentHeader}>
        <h3 className={styles.consentTitle}>{t('activeShrVisit', 'ACTIVE SHR VISIT')}</h3>
        <div className={styles.consentTags}>
          <Tag type="green">{t('consentGranted', 'Consent granted')}</Tag>
          <Tag type={isEmergency ? 'red' : 'blue'}>
            {isEmergency ? t('emergency', 'Emergency') : t('standardConsent', 'Standard')}
          </Tag>
          {canManageVisit && (
            <div className={styles.consentActions}>
              <Button
                kind="ghost"
                size="xs"
                iconDescription={t('refreshVisit', 'Refresh visit')}
                tooltipPosition="left"
                renderIcon={Renew}
                hasIconOnly={true}
                disabled={isRefreshing || isClosing}
                onClick={handleRefresh}>
                {isRefreshing ? (
                  <InlineLoading description={t('refreshing', 'Refreshing...')} />
                ) : (
                  t('refreshVisit', 'Refresh visit')
                )}
              </Button>
              <Button
                kind="danger--tertiary"
                size="xs"
                tooltipPosition="left"
                iconDescription={t('closeVisit', 'Close visit')}
                renderIcon={Close}
                hasIconOnly={true}
                disabled={isRefreshing || isClosing}
                onClick={launchCloseConfirmation}>
                {isClosing ? (
                  <InlineLoading description={t('closing', 'Closing...')} />
                ) : (
                  t('closeVisit', 'Close visit')
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
      <div className={styles.consentGrid}>
        <div className={styles.consentItem}>
          <span className={styles.consentLabel}>{t('visitType', 'Visit type')}</span>
          <span className={styles.consentValue}>{consent?.visitType || '--'}</span>
        </div>
        <div className={styles.consentItem}>
          <span className={styles.consentLabel}>{t('consentId', 'Consent ID')}</span>
          <span className={styles.consentValue}>{consent?.consentId || '--'}</span>
        </div>
        <div className={styles.consentItem}>
          <span className={styles.consentLabel}>{t('requestedBy', 'Requested by')}</span>
          <span className={styles.consentValue}>{consent?.requestedBy || '--'}</span>
        </div>
        <div className={styles.consentItem}>
          <span className={styles.consentLabel}>{t('expiresAt', 'Expires at')}</span>
          <span className={styles.consentValue}>{formatConsentDate(consent?.expiryDate)}</span>
        </div>
      </div>
    </div>
  );
};

const HieSHRDashboardComponent: React.FC<HieSHRDashboardProps> = ({ patientUuid, patient }) => {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const { isLoading, error, mutate, hasConsent, consent } = useShrConsent(patientUuid);
  const patientName = getPatientDisplayName(patient);
  const headerTitle = t('hieSHR', 'HIE SHR');

  const launchStartVisitModal = useCallback(() => {
    const dispose = showModal('start-shr-visit-modal', {
      patientUuid,
      patientName,
      onSuccess: () => {
        mutate();
      },
      closeModal: () => dispose(),
    });
  }, [mutate, patientName, patientUuid]);

  if (isLoading) {
    return (
      <div className={styles.dashboard}>
        <SkeletonText heading width="40%" />
        <SkeletonText paragraph lineCount={3} />
      </div>
    );
  }

  if (error) {
    return <ErrorCard error={error} headerTitle={headerTitle} />;
  }

  if (!hasConsent) {
    return (
      <div className={styles.dashboard}>
        <Layer level={1}>
          <Tile className={styles.tile}>
            <div className={isDesktop(layout) ? styles.desktopHeading : styles.tabletHeading}>
              <h4>{headerTitle}</h4>
            </div>
            <div className={styles.emptyData}>
              <EmptyDataIllustration />
              <p className={styles.content}>{t('noShrConsent', 'No active SHR consent')}</p>
              <p className={styles.helper}>
                {t(
                  'noShrConsentDescription',
                  'Start an SHR visit by sending an OTP to the patient for consent. Once verified, you can access their shared health records for this visit.',
                )}
              </p>
            </div>
            <div className={styles.actions}>
              <Button kind="ghost" renderIcon={ArrowRight} onClick={launchStartVisitModal}>
                {t('startShrVisit', 'Start SHR visit')}
              </Button>
            </div>
          </Tile>
        </Layer>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <ActiveConsentSummary consent={consent} onChange={mutate} />
      <HiePatientRecords patientUuid={patientUuid} practitionerUuid={consent?.practitionerUuid} />
    </div>
  );
};

export default HieSHRDashboardComponent;
