import { useEffect } from 'react';
import { useVisit } from '@openmrs/esm-framework';
import { useOrderBasket, type DrugOrderBasketItem } from '@openmrs/esm-patient-common-lib';

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

  const drugOrders = orders.filter((order): order is DrugOrderBasketItem => 'drug' in order);
  const hasDrugOrder = drugOrders.length > 0;
  const diagnoses = activeVisit?.encounters?.flatMap((encounter) => encounter.diagnoses) ?? [];
  const hasMainDiagnosis = diagnoses.some((diagnosis) => diagnosis?.rank === 2);

  useEffect(() => {
    if (!hasDrugOrder) {
      return;
    }

    const shouldBeIncomplete = !hasMainDiagnosis;
    let hasChange = false;

    const updatedOrders = drugOrders.map((order) => {
      if (order.isOrderIncomplete === shouldBeIncomplete) {
        return order;
      }
      hasChange = true;
      return { ...order, isOrderIncomplete: shouldBeIncomplete };
    });

    if (hasChange) {
      setOrders('drug', updatedOrders);
    }

    return () => {
      setOrders(
        'drug',
        updatedOrders.map((order) => (order.isOrderIncomplete ? { ...order, isOrderIncomplete: false } : order)),
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasDrugOrder, hasMainDiagnosis]);

  return { hasMainDiagnosis, hasDrugOrder, isLoading };
}
