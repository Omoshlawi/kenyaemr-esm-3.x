import React from 'react';
import { useConfig } from '@openmrs/esm-framework';

import OrdersTabs from '../../shared/orders/OrdersTabs';
import ProceduresTable from './procedures-table.component';
import { ExpressWorkflowConfig } from '../../config-schema';

type ProceduresTabsProps = {
  patientUuid: string;
  patient: fhir.Patient;
};

const ProceduresTabs: React.FC<ProceduresTabsProps> = ({ patientUuid, patient }) => {
  const { proceduresConceptClassUuid, imagingOrderTypeUuid } = useConfig<ExpressWorkflowConfig>();
  return (
    <OrdersTabs
      patientUuid={patientUuid}
      patient={patient}
      basePath="procedures"
      resultsSlotName="ewf-procedures-results-slot"
      orderTypeUuid={imagingOrderTypeUuid}
      filter={(order) => order.concept?.conceptClass?.uuid === proceduresConceptClassUuid}
      Table={({ orders }) => <ProceduresTable orders={orders} patientUuid={patientUuid} patient={patient} />}
    />
  );
};

export default ProceduresTabs;
