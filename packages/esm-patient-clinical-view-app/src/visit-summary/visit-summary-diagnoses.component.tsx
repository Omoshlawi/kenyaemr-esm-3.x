import React from 'react';
import { useTranslation } from 'react-i18next';
import { Catalog } from '@carbon/react/icons';
import type { VisitSummary } from './visit-summary.resource';
import styles from './visit-summary.scss';

type DiagnosesProps = {
  diagnoses: VisitSummary['diagnoses'];
};

const VisitSummaryDiagnoses: React.FC<DiagnosesProps> = ({ diagnoses }) => {
  const { t } = useTranslation();

  if (!diagnoses?.length) {
    return null;
  }

  return (
    <div className={styles.infoSection}>
      <div className={styles.infoSectionHeader}>
        <Catalog size={20} />
        <h2>{t('diagnoses', 'Diagnoses')}</h2>
      </div>
      {diagnoses.map((d) => (
        <div key={d.diagnosis} className={styles.infoItem}>
          <p>
            {d.diagnosis} ({d.certainty.toLowerCase()})
          </p>
        </div>
      ))}
    </div>
  );
};

export default VisitSummaryDiagnoses;
