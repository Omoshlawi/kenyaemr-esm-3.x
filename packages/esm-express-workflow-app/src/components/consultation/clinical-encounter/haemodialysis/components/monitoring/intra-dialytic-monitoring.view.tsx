import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MonitoringRow, MonitoringSessionAction } from '../../types';
import { buildMonitoringDisplayRows, type MonitoringSlotRuntime } from '../../utils/monitoring-slots';
import { parseMonitoringDatetime } from '../../utils/monitoring-datetime';
import { buildDefaultSlotMinutes } from '../../utils/monitoring-schedule';
import {
  CURRENT_MONITORING_READING_COLUMNS,
  buildCurrentMonitoringReadingRows,
} from '../../utils/dialysis-session-history';
import HistoricalSectionCard from '../shared/historical-section-card.component';
import SessionHistoryDataTable from '../shared/session-history-data-table.component';
import { SectionToolbar, type SectionViewMode } from '../shared/section-toolbar.component';
import sharedStyles from '../shared/shared.scss';
import MonitoringTable from './monitoring-table.component';
import MonitoringActions from './monitoring-actions.component';
import styles from './monitoring-table.scss';

type Props = {
  rows: MonitoringRow[];
  monitoringStartedAt?: string;
  monitoringSlotMinutes?: number[];
  monitoringAction?: MonitoringSessionAction;
  monitoringRuntime?: MonitoringSlotRuntime;
  monitoringComplete?: boolean;
  monitoringExpired?: boolean;
  canAdd: boolean;
  canUseActions?: boolean;
  addLabel?: string;
  waitingForMachineCheck?: boolean;
  onAdd: () => void;
  onTerminateMonitoring?: (reason: string) => Promise<boolean>;
  onExtendMonitoring?: (hours: number) => Promise<boolean>;
};

const IntraDialyticMonitoringView: React.FC<Props> = ({
  rows,
  monitoringStartedAt,
  monitoringSlotMinutes,
  monitoringAction,
  monitoringRuntime,
  monitoringComplete,
  monitoringExpired,
  canAdd,
  canUseActions,
  addLabel,
  waitingForMachineCheck,
  onAdd,
  onTerminateMonitoring,
  onExtendMonitoring,
}) => {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<SectionViewMode>('graph');

  useEffect(() => {
    if (monitoringComplete) {
      return undefined;
    }
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, [monitoringComplete]);

  const startedAt = useMemo(() => parseMonitoringDatetime(monitoringStartedAt) ?? undefined, [monitoringStartedAt]);

  const displayRows = useMemo(() => {
    if (waitingForMachineCheck) {
      return [];
    }
    return buildMonitoringDisplayRows(rows, startedAt, now, monitoringRuntime);
  }, [rows, startedAt, now, monitoringRuntime, waitingForMachineCheck]);

  const readingRows = useMemo(() => buildCurrentMonitoringReadingRows(rows, startedAt), [rows, startedAt]);

  const hasMultipleReadingsInSlot = useMemo(
    () => displayRows.some((row) => (row.readingCount ?? 0) > 1),
    [displayRows],
  );

  const slotMinutes = monitoringSlotMinutes ?? buildDefaultSlotMinutes();
  const showReadingsToggle = readingRows.length > 0;
  const showChart = viewMode === 'graph' || !showReadingsToggle;

  return (
    <HistoricalSectionCard
      title="3. Intra-Dialytic Monitoring"
      subtitle={
        monitoringComplete
          ? monitoringExpired
            ? t('haemodialysisMonitoringExpired', 'Monitoring closed — 240 min window elapsed')
            : t('haemodialysisMonitoringComplete', 'Monitoring complete')
          : t('haemodialysisMonitoringSubtitle', 'Monitoring (Checked every 60 min unless indicated)')
      }
      headerActions={
        showReadingsToggle || canAdd ? (
          <SectionToolbar
            showViewToggle={showReadingsToggle}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onAddClick={canAdd ? onAdd : undefined}
            addLabel={addLabel ?? t('haemodialysisContinueMonitoring', 'Continue monitoring')}
          />
        ) : null
      }>
      {displayRows.length > 0 || readingRows.length > 0 ? (
        <>
          {showChart ? (
            <>
              {hasMultipleReadingsInSlot ? (
                <p className={styles.viewHint}>
                  {t(
                    'haemodialysisMonitoringChartHint',
                    'Each time slot shows the latest reading. Switch to Table to see every saved observation.',
                  )}
                </p>
              ) : null}
              <MonitoringTable rows={displayRows} />
            </>
          ) : (
            <SessionHistoryDataTable
              columns={CURRENT_MONITORING_READING_COLUMNS}
              rows={readingRows}
              emptyMessage={t('haemodialysisMonitoringEmpty', 'No monitoring observations yet.')}
            />
          )}
        </>
      ) : (
        <div className={sharedStyles.emptyState}>
          {waitingForMachineCheck
            ? t(
                'haemodialysisMonitoringWaitingMachineCheck',
                'Complete dialysis machine check before starting intra-dialytic monitoring.',
              )
            : t('haemodialysisMonitoringEmpty', 'No monitoring observations yet.')}
        </div>
      )}
      {displayRows.length > 0 && onTerminateMonitoring && onExtendMonitoring ? (
        <MonitoringActions
          slotMinutes={slotMinutes}
          monitoringAction={monitoringAction}
          monitoringComplete={Boolean(monitoringComplete)}
          canInteract={Boolean(canUseActions)}
          onTerminate={onTerminateMonitoring}
          onExtend={onExtendMonitoring}
        />
      ) : null}
    </HistoricalSectionCard>
  );
};

export default IntraDialyticMonitoringView;
