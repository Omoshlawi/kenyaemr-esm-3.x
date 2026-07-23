import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@carbon/react';
import { Add } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import type { MonitoringRow } from '../../types';
import { buildMonitoringDisplayRows } from '../../utils/monitoring-slots';
import { parseMonitoringDatetime } from '../../utils/monitoring-datetime';
import SectionCard from '../shared/section-card.component';
import sharedStyles from '../shared/shared.scss';
import MonitoringTable from './monitoring-table.component';

type Props = {
  rows: MonitoringRow[];
  monitoringStartedAt?: string;
  monitoringComplete?: boolean;
  monitoringExpired?: boolean;
  canAdd: boolean;
  addLabel?: string;
  waitingForMachineCheck?: boolean;
  onAdd: () => void;
};

const IntraDialyticMonitoringView: React.FC<Props> = ({
  rows,
  monitoringStartedAt,
  monitoringComplete,
  monitoringExpired,
  canAdd,
  addLabel,
  waitingForMachineCheck,
  onAdd,
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
    return buildMonitoringDisplayRows(rows, startedAt ?? undefined, now);
  }, [rows, monitoringStartedAt, now]);

  return (
    <SectionCard
      title="3. Intra-Dialytic Monitoring"
      subtitle={
        monitoringComplete
          ? monitoringExpired
            ? t('haemodialysisMonitoringExpired', 'Monitoring closed — 240 min window elapsed')
            : t('haemodialysisMonitoringComplete', 'Monitoring complete')
          : t('haemodialysisMonitoringSubtitle', 'Record Observations Every 60 Minutes')
      }
      actions={
        canAdd ? (
          <Button kind="ghost" size="sm" renderIcon={Add} onClick={onAdd}>
            {addLabel ?? t('haemodialysisAddMonitoring', 'Add observation')}
          </Button>
        ) : null
      }>
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
    </SectionCard>
  );
};

export default IntraDialyticMonitoringView;
