import React from 'react';
import { Document } from '@carbon/react/icons';
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
  headerActions?: React.ReactNode;
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
  headerActions,
  showHistory = false,
  historyColumns = [],
  historyRows = [],
  children,
}) => (
  <section className={sectionStyles.section}>
    <div className={sectionStyles.sectionHeader}>
      <div>
        <h2 className={sectionStyles.sectionTitle}>
          <Document size={16} />
          {title}
        </h2>
        {subtitle ? <p className={sectionStyles.sectionSubtitle}>{subtitle}</p> : null}
      </div>
      {headerActions || (showAdd && onAddClick) ? (
        <div className={styles.headerRight}>
          {headerActions}
          {!headerActions && showAdd && onAddClick ? <FormAddButton onClick={onAddClick} addLabel={addLabel} /> : null}
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
