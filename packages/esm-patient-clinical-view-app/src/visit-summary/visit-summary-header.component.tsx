import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@carbon/react';
import { Printer } from '@carbon/react/icons';
import { formatDate, parseDate, showModal, usePatient } from '@openmrs/esm-framework';
import type { VitalItem } from './visit-summary.resource';
import styles from './visit-summary.scss';

type VisitSummaryHeaderProps = {
  patientUuid: string;
  visitUuid: string;
  visitDate: string;
  weight: VitalItem | undefined;
};

const VisitSummaryHeader: React.FC<VisitSummaryHeaderProps> = ({ patientUuid, visitUuid, visitDate, weight }) => {
  const { t } = useTranslation();
  const { patient } = usePatient(patientUuid);

  const handlePrintPreview = () => {
    const dispose = showModal('visit-summary-print-preview-modal', { visitUuid, patient, onClose: () => dispose() });
  };

  const visitLabel = React.useMemo(() => {
    if (!visitDate) {
      return t('visitSummary', 'VISIT SUMMARY');
    }
    const date = parseDate(visitDate);
    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
    return `${t('visitSummary', 'VISIT SUMMARY')} • ${isToday ? t('today', 'TODAY') : formatDate(date)}`;
  }, [visitDate, t]);

  const patientName = React.useMemo(() => {
    if (!patient?.name?.[0]) {
      return '';
    }
    const name = patient.name[0];
    return `${name.given?.join(' ') ?? ''} ${name.family ?? ''}`.trim();
  }, [patient]);

  const patientAge = React.useMemo(() => {
    if (!patient?.birthDate) {
      return null;
    }
    return new Date().getFullYear() - new Date(patient.birthDate).getFullYear();
  }, [patient]);

  const patientDOB = React.useMemo(() => {
    if (!patient?.birthDate) {
      return null;
    }
    return formatDate(new Date(patient.birthDate));
  }, [patient]);

  const patientGender = React.useMemo(() => {
    if (!patient?.gender) {
      return null;
    }
    return patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1).toLowerCase();
  }, [patient]);

  const patientMRN = React.useMemo(() => {
    return patient?.identifier?.find((id) => id.type?.text === 'OpenMRS ID' || id.system?.includes('openmrs'))?.value;
  }, [patient]);

  return (
    <div className={styles.pageHeader}>
      <p className={styles.visitMeta}>{visitLabel}</p>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.patientName}>{patientName}</h1>
          <div className={styles.patientDemographics}>
            {patientMRN && (
              <span className={styles.demographicItem}>
                <span>{t('mrn', 'MRN')}:</span> {patientMRN}
              </span>
            )}
            {patientDOB && (
              <span className={styles.demographicItem}>
                <span>{t('dob', 'DOB')}:</span> {patientDOB}
                {patientAge !== null && ` (${patientAge}y)`}
              </span>
            )}
            {patientGender && (
              <span className={styles.demographicItem}>
                <span>{t('gender', 'Gender')}:</span> {patientGender}
              </span>
            )}
            {weight?.value && (
              <span className={styles.demographicItem}>
                <span>{t('weight', 'Weight')}:</span> {weight.value}
                {weight.unit}
              </span>
            )}
          </div>
        </div>
        <div className={styles.headerActions}>
          <Button kind="ghost" size="sm" renderIcon={Printer} onClick={handlePrintPreview}>
            {t('print', 'Print')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VisitSummaryHeader;
