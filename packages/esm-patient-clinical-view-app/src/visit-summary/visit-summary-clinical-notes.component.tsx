import React from 'react';
import { useTranslation } from 'react-i18next';
import type { VisitSummary } from './visit-summary.resource';
import styles from './visit-summary.scss';

type ClinicalNotesProps = {
  clinicalNotes: VisitSummary['clinicalNotes'];
};

const VisitSummaryClinicalNotes: React.FC<ClinicalNotesProps> = ({ clinicalNotes }) => {
  const { t } = useTranslation();

  if (!clinicalNotes?.length) {
    return null;
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>{t('clinicalNotesAndPlan', 'Clinical Notes & Plan')}</h2>
      </div>
      {clinicalNotes.map((note, i) => (
        <p key={i} className={styles.clinicalNoteText}>
          {note.note}
        </p>
      ))}
    </div>
  );
};

export default VisitSummaryClinicalNotes;
