import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tag } from '@carbon/react';
import { formatDate, parseDate } from '@openmrs/esm-framework';
import type { VisitSummary } from './visit-summary.resource';
import styles from './visit-summary.scss';

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

type OrderItem = {
  procedure: string;
  orderNumber: string;
  orderer: string;
  orderedDate: string;
  status: string;
  procedureReport?: string;
  impression?: string;
};

const OrderEntry: React.FC<{ item: OrderItem; showImpression?: boolean }> = ({ item, showImpression }) => {
  const { t } = useTranslation();
  return (
    <div className={styles.procedureItem}>
      <p className={styles.procedureName}>{item.procedure}</p>
      <p className={styles.procedureMeta}>
        {item.orderer} &bull; {t('ordered', 'Ordered')}:{' '}
        {item.orderedDate ? formatDate(parseDate(item.orderedDate)) : '—'}
        &nbsp;&bull;&nbsp;
        <em>
          <Tag type={item.status === 'COMPLETED' ? 'green' : 'blue'} size="sm">
            {item.status}
          </Tag>
        </em>
      </p>
      {item.procedureReport && <HtmlReport label={t('report', 'Report')} html={item.procedureReport} />}
      {showImpression && item.impression && <HtmlReport label={t('impression', 'Impression')} html={item.impression} />}
    </div>
  );
};

type ImagingProps = { imaging: VisitSummary['imaging'] };
type ProceduresOnlyProps = { procedures: VisitSummary['procedures'] };

export const VisitSummaryImaging: React.FC<ImagingProps> = ({ imaging }) => {
  const { t } = useTranslation();

  if (!imaging?.length) {
    return null;
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>{t('radiologyAndImaging', 'RADIOLOGY & IMAGING')}</h2>
      </div>
      {imaging.map((img) => (
        <OrderEntry key={img.orderNumber} item={img} showImpression />
      ))}
    </div>
  );
};

export const VisitSummaryProceduresOnly: React.FC<ProceduresOnlyProps> = ({ procedures }) => {
  const { t } = useTranslation();

  if (!procedures?.length) {
    return null;
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>{t('procedures', 'PROCEDURES')}</h2>
      </div>
      {procedures.map((proc) => (
        <OrderEntry key={proc.orderNumber} item={proc} />
      ))}
    </div>
  );
};

type ProceduresProps = {
  procedures: VisitSummary['procedures'];
  imaging: VisitSummary['imaging'];
};

const VisitSummaryProcedures: React.FC<ProceduresProps> = ({ procedures, imaging }) => (
  <>
    <VisitSummaryImaging imaging={imaging} />
    <VisitSummaryProceduresOnly procedures={procedures} />
  </>
);

export default VisitSummaryProcedures;
