import { OrderAction } from '@openmrs/esm-framework';
import { type DrugOrderBasketItem, type Order } from '@openmrs/esm-patient-common-lib';

export function buildMedicationOrder(order: Order, action: OrderAction): DrugOrderBasketItem {
  if (!order.drug) {
    throw new Error('Drug order is missing drug information.');
  }

  const visit = order.encounter?.visit;
  if (!visit) {
    throw new Error('Drug order is missing visit information.');
  }

  return {
    uuid: order.uuid,
    display: order.drug.display,
    previousOrder: action === 'NEW' ? undefined : order.uuid,
    action,
    drug: {
      uuid: order.drug.uuid,
      display: order.drug.display,
      strength: order.drug.strength,
      dosageForm: order.drug.dosageForm,
      concept: {
        uuid: order.drug.concept.uuid,
        display: order.drug.concept.display,
      },
    },
    dosage: order.dose ?? null,
    unit: order.doseUnits
      ? {
          value: order.doseUnits.display,
          valueCoded: order.doseUnits.uuid,
        }
      : null,
    frequency: order.frequency
      ? {
          valueCoded: order.frequency.uuid,
          value: order.frequency.display,
        }
      : null,
    route: order.route
      ? {
          valueCoded: order.route.uuid,
          value: order.route.display,
        }
      : null,
    commonMedicationName: order.drug.display,
    isFreeTextDosage: order.dosingType === 'org.openmrs.FreeTextDosingInstructions',
    freeTextDosage: order.dosingType === 'org.openmrs.FreeTextDosingInstructions' ? order.dosingInstructions ?? '' : '',
    patientInstructions:
      order.dosingType !== 'org.openmrs.FreeTextDosingInstructions' ? order.dosingInstructions ?? null : null,
    asNeeded: order.asNeeded,
    asNeededCondition: order.asNeededCondition ?? null,
    startDate: action === 'NEW' ? new Date() : order.dateActivated,
    duration: order.duration,
    durationUnit: order.durationUnits
      ? {
          valueCoded: order.durationUnits.uuid,
          value: order.durationUnits.display,
        }
      : null,
    pillsDispensed: order.quantity,
    numRefills: order.numRefills,
    indication: order.orderReasonNonCoded ?? null,
    quantityUnits: order.quantityUnits
      ? {
          value: order.quantityUnits.display,
          valueCoded: order.quantityUnits.uuid,
        }
      : null,
    encounterUuid: order.encounter?.uuid,
    visit,
  };
}
