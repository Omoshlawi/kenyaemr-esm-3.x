import React, { useEffect } from 'react';
import { useConfig, useVisit, useWorkspaces } from '@openmrs/esm-framework';
import { ActionableNotification } from '@carbon/react';
import { useTranslation } from 'react-i18next';

import styles from './patient-diagnosis.scss';
import { useLaunchWorkspaceRequiringVisit, useOrderBasket } from '@openmrs/esm-patient-common-lib';
import { ConfigObject } from '../config-schema';

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

type PatientDiagnosisComponentProps = {
  patientUuid: string;
};

const PatientDiagnosisComponent: React.FC<PatientDiagnosisComponentProps> = ({ patientUuid }) => {
  const { workspaces } = useWorkspaces();
  const { orders } = useOrderBasket();
  const hasDrugOrder = orders.some((order) => 'drug' in order);
  const orderWorkspace = workspaces?.[0]?.name === 'order-basket';

  if (!orderWorkspace) {
    return null;
  }

  if (!hasDrugOrder) {
    return null;
  }

  return <PatientDiagnosisContent patientUuid={patientUuid} />;
};

const PatientDiagnosisContent: React.FC<PatientDiagnosisComponentProps> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const { clinicalEncounterFormUuid } = useConfig<ConfigObject>();
  const launchWorkspaceRequiringVisit = useLaunchWorkspaceRequiringVisit('patient-form-entry-workspace');
  const { activeVisit, isLoading, mutate: mutateVisit } = useVisit(patientUuid, defaultVisitCustomRepresentation);
  const { orders, setOrders } = useOrderBasket();
  const hasDrugOrder = orders.some((order) => 'drug' in order);

  // Find the encounter with the form uuid clinicalEncounterFormUuid
  const clinicalEncounter = activeVisit?.encounters?.find(
    (encounter) => encounter.form?.uuid === clinicalEncounterFormUuid,
  );

  const diagnoses = activeVisit?.encounters?.flatMap((encounter) => encounter.diagnoses) || [];
  const mainDiagnosis = diagnoses.find((diagnosis) => diagnosis.rank === 2);
  const hasMainDiagnosis = !!mainDiagnosis;

  const handleActionButtonClick = () => {
    launchWorkspaceRequiringVisit({
      workspaceTitle: t('clinicalEncounter', 'Clinical Encounter'),
      formInfo: {
        mutateForm: () => {
          mutateVisit();
        },
        encounterUuid: clinicalEncounter?.uuid ?? '',
        formUuid: clinicalEncounterFormUuid,
        additionalProps: {},
      },
    });
  };

  useEffect(() => {
    if (!hasDrugOrder) {
      return;
    }

    const shouldBeIncomplete = !hasMainDiagnosis;
    let hasChange = false;

    const updatedOrders = orders.map((order) => {
      if (!('drug' in order)) {
        return order;
      }

      if (order.isOrderIncomplete === shouldBeIncomplete) {
        return order;
      }

      hasChange = true;
      return {
        ...order,
        isOrderIncomplete: shouldBeIncomplete,
      };
    });

    if (hasChange) {
      setOrders('default', updatedOrders);
    }

    return () => {
      if (!hasDrugOrder) {
        return;
      }
      const hasAnyIncomplete = orders.some((o) => 'drug' in o && o.isOrderIncomplete);
      if (!hasAnyIncomplete) {
        return;
      }
      const clearedOrders = orders.map((order) =>
        'drug' in order && order.isOrderIncomplete ? { ...order, isOrderIncomplete: false } : order,
      );
      setOrders('default', clearedOrders);
    };
  }, [hasDrugOrder, hasMainDiagnosis, orders, setOrders]);

  if (isLoading) {
    return null;
  }

  if (hasMainDiagnosis) {
    return null;
  }

  return (
    <ActionableNotification
      className={styles.noMainDiagnosis}
      aria-label="closes notification"
      kind="warning-alt"
      lowContrast={true}
      statusIconDescription={t('noMainDiagnosis', 'No main diagnosis')}
      subtitle={t('noMainDiagnosisSubtitle', 'Main diagnosis is required for claim processing')}
      title={t('noMainDiagnosis', 'Main diagnosis required')}
      hideCloseButton
      onActionButtonClick={handleActionButtonClick}
      actionButtonLabel={t('add', 'Add')}
    />
  );
};

export default PatientDiagnosisComponent;
