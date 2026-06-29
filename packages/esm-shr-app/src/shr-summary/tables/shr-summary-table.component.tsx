import { Button, DataTableSkeleton, Layer, Tile } from '@carbon/react';
import { ArrowRight } from '@carbon/react/icons';
import { showModal, showSnackbar } from '@openmrs/esm-framework';
import { CardHeader, EmptyDataIllustration, ErrorState } from '@openmrs/esm-patient-common-lib';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import usePatient from '../../hooks/usePatient';
import SharedHealthRecordsSummary from '../../shrpatient-summary/shrpatient-summary.component';
import { sendSHAOtp, verifyOtp } from '../shr-summary.resource';
import styles from './shr-tables.scss';

interface PatientSHRSummaryTableProps {
  patientUuid: string;
  patient: fhir.Patient;
}

const PatientSHRSummaryTable: React.FC<PatientSHRSummaryTableProps> = ({ patient, patientUuid }) => {
  const { t } = useTranslation();
  const idRef = useRef<string>();
  const [accessGranted, setAccessGranted] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const { error, isLoading, patientPhoneNumber, patientName, nationalId } = usePatient(patientUuid);

  if (isLoading) {
    return <DataTableSkeleton />;
  }
  if (error) {
    return <ErrorState error={error} headerTitle={t('shrRecords', 'SHR Records')} />;
  }

  const handleInitiateAuthorization = () => {
    const dispose = showModal('otp-verification-modal', {
      onClose: () => {
        if (!accessGranted) {
          setIsAuthorizing(false);
        }
        dispose();
      },
      phoneNumber: patientPhoneNumber || '',
      otpLength: 5,
      expiryMinutes: 5,
      centerBoxes: true,
      onRequestOtp: async (_phone: string) => {
        const { status, id } = await sendSHAOtp(_phone, nationalId as string);
        idRef.current = id;
        if (status !== 'success') {
          throw new Error(t('otpFailed', 'Failed to send OTP'));
        }
      },

      onVerify: async (enteredOtp: string) => {
        const { status, data, error } = await verifyOtp(enteredOtp, idRef.current as string);
        if (status !== 'success') {
          throw new Error(t('authorizeFailed', 'Authorization failed'));
        }
      },

      onVerificationSuccess: () => {
        dispose();
        setIsAuthorizing(false);
        setAccessGranted(true);
        showSnackbar({
          title: t('success', 'Success'),
          subtitle: t('otpVerificationSuccessMessage', 'OTP Vefification succesfull'),
          kind: 'success',
        });
      },

      onCleanup: () => {
        if (!accessGranted) {
          setIsAuthorizing(false);
        }
      },
    });
  };

  if (!accessGranted) {
    return (
      <div>
        <Layer>
          <Tile className={styles.tile}>
            <CardHeader title={t('shrRecords', 'SHR Records')}>
              <Button
                kind="ghost"
                renderIcon={ArrowRight}
                onClick={handleInitiateAuthorization}
                className={styles.btnOutline}>
                {t('pullSHRRecords', 'Pull SHR Records')}
              </Button>
            </CardHeader>
            <EmptyDataIllustration />
            <p className={styles.content}>{t('noSHRRecords', 'SHR Records have not been pulled')}</p>
            <Button onClick={handleInitiateAuthorization} renderIcon={ArrowRight} kind="ghost">
              {t('pullSHRRecords', 'Pull SHR Records')}
            </Button>
          </Tile>
        </Layer>
      </div>
    );
  }

  return <SharedHealthRecordsSummary patientUuid={patientUuid} />;
};

export default PatientSHRSummaryTable;
