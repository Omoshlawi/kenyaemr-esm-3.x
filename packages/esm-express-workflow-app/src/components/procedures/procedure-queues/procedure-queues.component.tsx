import React, { FC, useMemo, useState } from 'react';
import ProcedureSummaryCards from './summary-cards.component';
import { useProcedureServiceQueues } from './procedure-queues.resources';
import ProcedureRoomTabs from './procedure-room-tabs.component';
import { Order } from '@openmrs/esm-framework';

type ProcedureQueuesProps = {
  activeOrders?: Array<Order>;
  inProgressOrders?: Array<Order>;
  completedOrders?: Array<Order>;
};
const ProcedureQueues: FC<ProcedureQueuesProps> = ({ activeOrders, completedOrders, inProgressOrders }) => {
  const [activeQueue, setActiveQueue] = useState<string>();
  const { errorLoadingQueues, isLoadingQueues, procedureQueues } = useProcedureServiceQueues();
  const currentQueue = useMemo(() => activeQueue ?? procedureQueues?.[0]?.uuid, [activeQueue, procedureQueues]);
  return (
    <>
      <ProcedureSummaryCards
        activeQueue={currentQueue}
        activeOrders={activeOrders}
        completedOrders={completedOrders}
        inProgressOrders={inProgressOrders}
      />
      <ProcedureRoomTabs
        activeQueue={currentQueue}
        onActiveQueueChange={setActiveQueue}
        procedureQueues={procedureQueues}
        isLoadingQueues={isLoadingQueues}
        errorLoadingQueues={errorLoadingQueues}
      />
    </>
  );
};

export default ProcedureQueues;
