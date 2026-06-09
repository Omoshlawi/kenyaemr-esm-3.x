import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tag } from '@carbon/react';
import type { VisitSummary } from './visit-summary.resource';
import styles from './visit-summary.scss';

type MedicationsProps = {
  medications: VisitSummary['medications'];
};

const VisitSummaryMedications: React.FC<MedicationsProps> = ({ medications }) => {
  const { t } = useTranslation();

  if (!medications?.length) {
    return null;
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>{t('medications', 'Medications')}</h2>
      </div>
      {medications.map((med, i) => {
        const isActive = !med.autoExpireDate || new Date(med.autoExpireDate) >= new Date();
        return (
          <div key={med.drug ?? i} className={styles.medicationItem}>
            <div className={styles.medicationDetails}>
              <p className={styles.medicationName}>{med.drug}</p>
              <p className={styles.medicationDosage}>
                {med.dose} {med.frequency}
                {med.route ? ` — ${med.route}` : ''}
              </p>
            </div>
            <Tag type={isActive ? 'green' : 'gray'} size="sm">
              {isActive ? t('active', 'Active') : t('stopped', 'Stopped')}
            </Tag>
          </div>
        );
      })}
    </div>
  );
};

export default VisitSummaryMedications;
