import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tag } from '@carbon/react';
import type { VisitSummary } from './visit-summary.resource';
import styles from './visit-summary.scss';

type AllergiesProps = {
  allergies: VisitSummary['allergies'];
};

const severityTagType = (severity: string): 'red' | 'warm-gray' | 'teal' => {
  const upper = severity?.toUpperCase();
  if (upper === 'SEVERE') {
    return 'red';
  }
  if (upper === 'MODERATE') {
    return 'warm-gray';
  }
  return 'teal';
};

const VisitSummaryAllergies: React.FC<AllergiesProps> = ({ allergies }) => {
  const { t } = useTranslation();

  if (!allergies?.length) {
    return null;
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>{t('allergies', 'Allergies')}</h2>
      </div>
      {allergies.map((allergy, i) => (
        <div key={allergy.allergen ?? i} className={styles.allergyItem}>
          <span className={styles.allergyName}>{allergy.allergen}</span>
          <Tag type={severityTagType(allergy.severity)} size="sm">
            {allergy.severity?.toUpperCase()}
          </Tag>
        </div>
      ))}
    </div>
  );
};

export default VisitSummaryAllergies;
