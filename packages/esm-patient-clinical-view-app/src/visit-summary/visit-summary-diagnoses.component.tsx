import React from 'react';
import { useTranslation } from 'react-i18next';
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

  const impressions = diagnoses.filter((d) => d.certainty?.toUpperCase() === 'PROVISIONAL');
  const confirmed = diagnoses.filter((d) => d.certainty?.toUpperCase() === 'CONFIRMED');
  const other = diagnoses.filter(
    (d) => d.certainty?.toUpperCase() !== 'PROVISIONAL' && d.certainty?.toUpperCase() !== 'CONFIRMED',
  );

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>{t('diagnosis', 'DIAGNOSIS')}</h2>
      </div>
      <div className={styles.diagnosisBody}>
        {impressions.length > 0 && (
          <div className={styles.diagnosisSubsection}>
            <h3 className={styles.diagnosisSubheading}>{t('impression', 'Impression')}</h3>
            <ul className={styles.diagnosisList}>
              {impressions.map((d) => (
                <li key={d.diagnosis} className={styles.diagnosisListItem}>
                  {d.diagnosis}
                </li>
              ))}
            </ul>
          </div>
        )}
        {confirmed.length > 0 && (
          <div className={styles.diagnosisSubsection}>
            <h3 className={styles.diagnosisSubheading}>{t('mainDiagnosis', 'Main Diagnosis')}</h3>
            <ul className={styles.diagnosisList}>
              {confirmed.map((d) => (
                <li key={d.diagnosis} className={styles.diagnosisListItem}>
                  {d.diagnosis}
                </li>
              ))}
            </ul>
          </div>
        )}
        {other.length > 0 && (
          <div className={styles.diagnosisSubsection}>
            <ul className={styles.diagnosisList}>
              {other.map((d) => (
                <li key={d.diagnosis} className={styles.diagnosisListItem}>
                  {d.diagnosis}
                  {d.certainty && <span className={styles.diagnosisCertainty}> ({d.certainty.toLowerCase()})</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisitSummaryDiagnoses;
