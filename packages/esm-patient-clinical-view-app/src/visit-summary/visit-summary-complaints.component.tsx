import React from 'react';
import { useTranslation } from 'react-i18next';
import { ListBulleted } from '@carbon/react/icons';
import type { VisitSummary } from './visit-summary.resource';
import styles from './visit-summary.scss';

type ComplaintsProps = {
  complaints: VisitSummary['complaints'];
};

const VisitSummaryComplaints: React.FC<ComplaintsProps> = ({ complaints }) => {
  const { t } = useTranslation();

  if (!complaints?.length) {
    return null;
  }

  return (
    <div className={styles.infoSection}>
      <div className={styles.infoSectionHeader}>
        <ListBulleted size={20} />
        <h2>{t('chiefComplaints', 'Chief Complaints')}</h2>
      </div>
      {complaints.map((c, i) => (
        <div key={`${c.complaint}-${i}`} className={styles.infoItem}>
          <p>
            {c.complaint}
            {c.duration && ` (${c.duration})`}
            {c.onsetStatus && <em className={styles.complaintSource}> — at {c.onsetStatus}</em>}
          </p>
        </div>
      ))}
    </div>
  );
};

export default VisitSummaryComplaints;
