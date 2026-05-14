import React from 'react';
import { useConfig } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';

import OrdersTabs from '../../shared/orders/OrdersTabs';
import ProceduresTable from './procedures-table.component';
import { ExpressWorkflowConfig } from '../../config-schema';
import Anaesthetic from '../anaesthetic/anaesthetic.component';

type ProceduresTabsProps = {
  patientUuid: string;
  patient: fhir.Patient;
};

const ProceduresTabs: React.FC<ProceduresTabsProps> = ({ patientUuid, patient }) => {
  const { t } = useTranslation();
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
      additionalTabs={[{ label: t('anaesthetic', 'Anaesthetic'), content: <Anaesthetic patientUuid={patientUuid} /> }]}
    />
  );
};

export default ProceduresTabs;
