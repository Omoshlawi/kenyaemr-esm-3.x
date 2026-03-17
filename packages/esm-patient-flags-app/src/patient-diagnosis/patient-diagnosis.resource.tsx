import { useEffect } from 'react';
import { useVisit } from '@openmrs/esm-framework';
import { useOrderBasket } from '@openmrs/esm-patient-common-lib';

const defaultVisitCustomRepresentation =
  'custom:(uuid,display,voided,indication,startDatetime,stopDatetime,' +
  'encounters:(uuid,display,encounterDatetime,' +
  'form:(uuid,name),location:ref,' +
  'encounterType:ref,' +
  'encounterProviders:(uuid,display,' +
  'provider:(uuid,display)),diagnoses),' +
  'patient:(uuid,display),' +
  'visitType:(uuid,name,display),' +
  'attributes:(uuid,display,attributeType:(name,datatypeClassname,uuid),value),' +
  'location:(uuid,name,display))';

export function useMarkIncompleteOrdersOnMissingDiagnosis(patientUuid: string, patient: fhir.Patient) {
  const { activeVisit, isLoading } = useVisit(patientUuid, defaultVisitCustomRepresentation);
  const { orders, setOrders } = useOrderBasket(patient);

  const hasDrugOrder = orders.some((order) => 'drug' in order);
  const diagnoses = activeVisit?.encounters?.flatMap((encounter) => encounter.diagnoses) ?? [];
  const hasMainDiagnosis = diagnoses.some((diagnosis) => diagnosis.rank === 2);

  useEffect(() => {
    if (!hasDrugOrder) {
      return;
    }

    const shouldBeIncomplete = !hasMainDiagnosis;
    setOrders('drug', (currentOrders = []) => {
      let hasChange = false;

      const updatedOrders = currentOrders.map((order) => {
        if (!('drug' in order) || order.isOrderIncomplete === shouldBeIncomplete) {
          return order;
        }
        hasChange = true;
        return { ...order, isOrderIncomplete: shouldBeIncomplete };
      });

      return hasChange ? updatedOrders : currentOrders;
    });

    return () => {
      setOrders('drug', (currentOrders = []) =>
        currentOrders.map((order) =>
          'drug' in order && order.isOrderIncomplete ? { ...order, isOrderIncomplete: false } : order,
        ),
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasDrugOrder, hasMainDiagnosis]);

  return { hasMainDiagnosis, hasDrugOrder, isLoading };
}
