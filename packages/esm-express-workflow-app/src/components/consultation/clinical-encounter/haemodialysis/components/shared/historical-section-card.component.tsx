import React from 'react';
import type { HistoryTableColumn, HistoryTableRow } from '../../utils/dialysis-session-history';
import sectionStyles from './shared.scss';
import styles from './historical-section-card.scss';
import { FormAddButton } from './section-toolbar.component';
import SessionHistoryDataTable from './session-history-data-table.component';

type Props = {
  title: string;
  subtitle?: string;
  showAdd?: boolean;
  onAddClick?: () => void;
  addLabel?: string;
  /** @deprecated Per-section history; prefer panel header table view. */
  showHistory?: boolean;
  historyColumns?: HistoryTableColumn[];
  historyRows?: HistoryTableRow[];
  children: React.ReactNode;
};

/** Section wrapper with optional Add control; legacy optional inline session history table. */
const HistoricalSectionCard: React.FC<Props> = ({
  title,
  subtitle,
  showAdd = false,
  onAddClick,
  addLabel,
  showHistory = false,
  historyColumns = [],
  historyRows = [],
  children,
}) => (
  <section className={sectionStyles.section}>
    <div className={sectionStyles.sectionHeader}>
      <div>
        <h2 className={sectionStyles.sectionTitle}>{title}</h2>
        {subtitle ? <p className={sectionStyles.sectionSubtitle}>{subtitle}</p> : null}
      </div>
      {showAdd && onAddClick ? (
        <div className={styles.headerRight}>
          <FormAddButton onClick={onAddClick} addLabel={addLabel} />
        </div>
      ) : null}
    </div>
    {children}
    {showHistory && historyColumns.length > 0 ? (
      <SessionHistoryDataTable columns={historyColumns} rows={historyRows} />
    ) : null}
  </section>
);

export default HistoricalSectionCard;
