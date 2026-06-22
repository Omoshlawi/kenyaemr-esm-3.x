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
        <h2>{t('clinicalNotes', 'Clinical Notes')}</h2>
      </div>
      <ul className={styles.clinicalNoteList}>
        {clinicalNotes.map((note, i) => (
          <li key={note.note + i} className={styles.clinicalNoteItem}>
            <span className={styles.clinicalNoteText}>{note.note}</span>
            {note.encounterType && <em className={styles.clinicalNoteSource}> — {note.encounterType}</em>}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default VisitSummaryClinicalNotes;
