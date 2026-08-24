import React from 'react';
import { useTranslation } from 'react-i18next';
import type { HaemodialysisSession } from '../types';
import {
  MACHINE_CHECK_HISTORY_COLUMNS,
  MONITORING_HISTORY_COLUMNS,
  POST_DIALYSIS_HISTORY_COLUMNS,
  PRESCRIPTION_HISTORY_COLUMNS,
  PRE_DIALYSIS_HISTORY_COLUMNS,
  SCREENING_HISTORY_COLUMNS,
  SUMMARY_HISTORY_COLUMNS,
  buildMachineCheckHistoryRows,
  buildMonitoringHistoryRows,
  buildPostDialysisHistoryRows,
  buildPrescriptionHistoryRows,
  buildPreDialysisHistoryRows,
  buildScreeningHistoryRows,
  buildSummaryHistoryRows,
} from '../utils/dialysis-session-history';
import SessionHistoryDataTable from './shared/session-history-data-table.component';
import sectionStyles from './shared/shared.scss';
import styles from './haemodialysis-all-tables.scss';

type Props = {
  sessions: HaemodialysisSession[];
};

const HaemodialysisAllTablesView: React.FC<Props> = ({ sessions }) => {
  const { t } = useTranslation();

  const blocks = [
    {
      title: t('haemodialysisTableScreening', 'Screening Status'),
      columns: SCREENING_HISTORY_COLUMNS,
      rows: buildScreeningHistoryRows(sessions),
    },
    {
      title: t('haemodialysisTablePreDialysis', '1. Pre-Dialysis Assessment'),
      columns: PRE_DIALYSIS_HISTORY_COLUMNS,
      rows: buildPreDialysisHistoryRows(sessions),
    },
    {
      title: t('haemodialysisTablePrescription', '2. Physician Prescription'),
      columns: PRESCRIPTION_HISTORY_COLUMNS,
      rows: buildPrescriptionHistoryRows(sessions),
    },
    {
      title: t('haemodialysisTableMachineCheck', 'Dialysis Machine Check'),
      columns: MACHINE_CHECK_HISTORY_COLUMNS,
      rows: buildMachineCheckHistoryRows(sessions),
    },
    {
      title: t('haemodialysisTableMonitoring', '3. Intra-Dialytic Monitoring'),
      columns: MONITORING_HISTORY_COLUMNS,
      rows: buildMonitoringHistoryRows(sessions),
    },
    {
      title: t('haemodialysisTablePostDialysis', '4. Post-Dialysis Assessment'),
      columns: POST_DIALYSIS_HISTORY_COLUMNS,
      rows: buildPostDialysisHistoryRows(sessions),
    },
    {
      title: t('haemodialysisTableSummary', '5. Dialysis Summary'),
      columns: SUMMARY_HISTORY_COLUMNS,
      rows: buildSummaryHistoryRows(sessions),
    },
  ];

  return (
    <div className={styles.allTables}>
      <p className={styles.intro}>
        {t(
          'haemodialysisAllTablesIntro',
          'All dialysis sessions for this patient. Intra-dialytic monitoring lists every recorded observation.',
        )}
      </p>
      {blocks.map((block) => (
        <section key={block.title} className={sectionStyles.section}>
          <h2 className={sectionStyles.sectionTitle}>{block.title}</h2>
          <SessionHistoryDataTable columns={block.columns} rows={block.rows} />
        </section>
      ))}
    </div>
  );
};

export default HaemodialysisAllTablesView;
