import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MonitoringRow, MonitoringSessionAction } from '../../types';
import { buildMonitoringDisplayRows, type MonitoringSlotRuntime } from '../../utils/monitoring-slots';
import { parseMonitoringDatetime } from '../../utils/monitoring-datetime';
import { buildDefaultSlotMinutes } from '../../utils/monitoring-schedule';
import HistoricalSectionCard from '../shared/historical-section-card.component';
import sharedStyles from '../shared/shared.scss';
import MonitoringTable from './monitoring-table.component';
import MonitoringActions from './monitoring-actions.component';

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

  useEffect(() => {
    if (monitoringComplete) {
      return undefined;
    }
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, [monitoringComplete]);

  const displayRows = useMemo(() => {
    if (!monitoringStartedAt && rows.length === 0) {
      return [];
    }
    const startedAt = parseMonitoringDatetime(monitoringStartedAt);
    return buildMonitoringDisplayRows(rows, startedAt ?? undefined, now, monitoringRuntime);
  }, [rows, monitoringStartedAt, now, monitoringRuntime]);

  const slotMinutes = monitoringSlotMinutes ?? buildDefaultSlotMinutes();

  return (
    <HistoricalSectionCard
      title="3. Intra-Dialytic Monitoring"
      subtitle={
        monitoringComplete
          ? monitoringExpired
            ? t('haemodialysisMonitoringExpired', 'Monitoring closed — 240 min window elapsed')
            : t('haemodialysisMonitoringComplete', 'Monitoring complete')
          : t('haemodialysisMonitoringSubtitle', 'Record Observations Every 60 Minutes')
      }
      showAdd={canAdd}
      onAddClick={onAdd}
      addLabel={addLabel ?? t('haemodialysisAddMonitoring', 'Add observation')}>
      {displayRows.length > 0 ? (
        <MonitoringTable rows={displayRows} />
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
      {onTerminateMonitoring && onExtendMonitoring ? (
        <MonitoringActions
          monitoringStartedAt={monitoringStartedAt}
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
