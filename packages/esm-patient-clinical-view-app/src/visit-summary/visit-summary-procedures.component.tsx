import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tag } from '@carbon/react';
import { Image } from '@carbon/react/icons';
import { formatDate, parseDate } from '@openmrs/esm-framework';
import type { VisitSummary } from './visit-summary.resource';
import styles from './visit-summary.scss';

type ProceduresProps = {
  procedures: VisitSummary['procedures'];
  imaging: VisitSummary['imaging'];
};

// The backend sends HTML-encoded strings (e.g. &lt;ul&gt;). Decode before rendering.
function decodeHtml(encoded: string): string {
  const txt = document.createElement('textarea');
  txt.innerHTML = encoded;
  return txt.value;
}

const HtmlReport: React.FC<{ label: string; html: string }> = ({ label, html }) => {
  const decoded = decodeHtml(html);
  if (!decoded.trim()) {
    return null;
  }
  return (
    <div className={styles.reportSection}>
      <p className={styles.reportLabel}>{label}</p>
      {/* Content originates from the OpenMRS backend */}
      <div className={styles.reportContent} dangerouslySetInnerHTML={{ __html: decoded }} />
    </div>
  );
};

const VisitSummaryProcedures: React.FC<ProceduresProps> = ({ procedures, imaging }) => {
  const { t } = useTranslation();
  const hasItems = (procedures?.length ?? 0) + (imaging?.length ?? 0) > 0;

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>{t('proceduresAndImaging', 'Procedures & Imaging')}</h2>
      </div>

      {hasItems ? (
        <>
          {procedures?.map((proc) => (
            <div key={proc.orderNumber} className={styles.procedureItem}>
              <p className={styles.procedureName}>{proc.procedure}</p>
              <p className={styles.procedureMeta}>
                {proc.orderer} • {proc.orderedDate ? formatDate(parseDate(proc.orderedDate)) : '—'} •{' '}
                <Tag type={proc.status === 'COMPLETED' ? 'green' : 'blue'} size="sm">
                  {proc.status}
                </Tag>
              </p>
              {proc.procedureReport && (
                <HtmlReport label={t('procedureReport', 'Procedure Report')} html={proc.procedureReport} />
              )}
            </div>
          ))}

          {imaging?.map((img) => (
            <div key={img.orderNumber} className={styles.procedureItem}>
              <p className={styles.procedureName}>{img.procedure}</p>
              <p className={styles.procedureMeta}>
                {img.orderer} • {img.orderedDate ? formatDate(parseDate(img.orderedDate)) : '—'} •{' '}
                <Tag type={img.status === 'COMPLETED' ? 'green' : 'blue'} size="sm">
                  {img.status}
                </Tag>
              </p>
              {img.procedureReport && <HtmlReport label={t('report', 'Report')} html={img.procedureReport} />}
              {img.impression && <HtmlReport label={t('impression', 'Impression')} html={img.impression} />}
            </div>
          ))}
        </>
      ) : (
        <div className={styles.emptyState}>
          <Image size={32} />
          <p>{t('noProcedures', 'No recent procedures or imaging results available.')}</p>
        </div>
      )}
    </div>
  );
};

export default VisitSummaryProcedures;
