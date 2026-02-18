import React, { useMemo, useState } from 'react';
import capitalize from 'lodash-es/capitalize';
import { TabsSkeleton } from '@carbon/react';
import { ExtensionSlot, HomePictogram, PageHeader, PageHeaderContent, useConfig } from '@openmrs/esm-framework';

import { type ExpressWorkflowConfig } from '../../config-schema';
import { useQueues } from '../../hooks/useServiceQueues';
import QueueTab from '../../shared/queue/queue-tab.component';
import ConsultationSummaryCards from './consultation-summary-cards.component';
import { ConsultationProvider } from './consultation-context';
import styles from './consultation.scss';

type ConsultationProps = {
  dashboardTitle: string;
};

const Consultation: React.FC<ConsultationProps> = ({ dashboardTitle }) => {
  const { queueServiceConceptUuids } = useConfig<ExpressWorkflowConfig>();
  const [, setSummaryCardsLoadingState] = useState({
    isLoading: false,
    isValidating: false,
  });
  const { queues, isLoading: isLoadingQueues } = useQueues();

  const consultationQueues = useMemo(
    () =>
      queues.filter(
        (queue) =>
          queue.service.uuid === queueServiceConceptUuids.consultationService &&
          !queue.location.display.toLowerCase().includes('mch') &&
          queue?.queueRooms?.length > 0,
      ),
    [queues, queueServiceConceptUuids.consultationService],
  );

  return (
    <ConsultationProvider consultationQueues={consultationQueues}>
      <div className={`omrs-main-content`} style={{ position: 'relative' }}>
        <div>
          <PageHeader className={styles.pageHeader}>
            <PageHeaderContent title={capitalize(dashboardTitle)} illustration={<HomePictogram />} />
            <ExtensionSlot name="provider-banner-info-slot" />
          </PageHeader>
          <ConsultationSummaryCards onLoadingStateChange={setSummaryCardsLoadingState} />
          {isLoadingQueues ? (
            <div className={styles.queueTabPlaceholder}>
              <TabsSkeleton />
            </div>
          ) : (
            <QueueTab queues={consultationQueues} navigatePath="consultation" usePatientChart />
          )}
        </div>
      </div>
    </ConsultationProvider>
  );
};

export default Consultation;
