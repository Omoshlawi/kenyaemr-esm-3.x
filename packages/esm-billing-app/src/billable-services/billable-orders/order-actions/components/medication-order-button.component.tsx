import React, { useCallback, useMemo } from 'react';
import { Edit } from '@carbon/react/icons';
import { launchWorkspace2, usePatient, useVisit, Visit } from '@openmrs/esm-framework';
import { BaseOrderButton } from './base-order-button.component';
import { useMedicationOrderAction, useOrderByUuid } from '../hooks/useMedicationOrderAction';
import { launchPrescriptionEditWorkspace, navigateAndLaunchWorkspace } from '../hooks/useModalHandler';
import { useTranslation } from 'react-i18next';
import { Button } from '@carbon/react';
import styles from './medication-order-button.scss';
import { useSWRConfig } from 'swr';
import {
  invalidateVisitAndEncounterData,
  invalidateVisitByUuid,
  Order,
  PatientWorkspaceGroupProps,
} from '@openmrs/esm-patient-common-lib';

export interface MedicationOrderButtonProps {
  medicationRequestBundle?: {
    request: fhir.MedicationRequest;
    dispenses: Array<fhir.MedicationDispense>;
  };
  actionText?: string;
  closeable?: boolean;
}

interface ModifyButtonProps {
  currentVisit: boolean;
  isLoading: boolean;
  order: Order;
  patientUuid: string;
  visitMutate: () => void;
  patient: fhir.Patient;
  activeVisit: Visit;
}

const ModifyButton: React.FC<ModifyButtonProps> = ({
  currentVisit,
  isLoading,
  order,
  patientUuid,
  visitMutate,
  patient,
  activeVisit,
}) => {
  const { t } = useTranslation();
  const { mutate: globalMutate } = useSWRConfig();
  const workspaceGroupProps: PatientWorkspaceGroupProps = useMemo(
    () => ({
      patient,
      patientUuid: patient?.id,
      visitContext: activeVisit,
      mutateVisitContext: () => {
        invalidateVisitByUuid(globalMutate, activeVisit.uuid);
        invalidateVisitAndEncounterData(globalMutate, patient.id);
      },
    }),
    [patient, activeVisit, globalMutate, patient?.id],
  );

  if (currentVisit) {
    return (
      <BaseOrderButton
        size="lg"
        kind="tertiary"
        Icon={Edit}
        isLoading={isLoading}
        isDisabled={false}
        buttonText={t('modify', 'Modify')}
        onClick={() => launchPrescriptionEditWorkspace(order, patientUuid, workspaceGroupProps)}
      />
    );
  }

  return (
    <Button
      kind="danger--tertiary"
      size="lg"
      onClick={() =>
        navigateAndLaunchWorkspace(
          `\${openmrsSpaBase}/patient/${patientUuid}/chart`,
          `patient/${patientUuid}`,
          'start-visit-workspace-form',
          { patientUuid },
          patientUuid,
        )
      }>
      {t('activeVisitRequired', 'Start visit to modify')}
    </Button>
  );
};

export const MedicationOrderButton: React.FC<MedicationOrderButtonProps> = ({
  medicationRequestBundle,
  actionText,
  closeable = true,
}) => {
  const { t } = useTranslation();
  const {
    isLoading: isMedicationOrderLoading,
    isDisabled,
    buttonText: defaultButtonText,
    shouldShowBillModal,
    dispenseFormProps,
    patientUuid,
    shouldAllowModify,
  } = useMedicationOrderAction(medicationRequestBundle);
  const { data: order, isLoading: isOrderLoading } = useOrderByUuid(medicationRequestBundle?.request?.id);
  const { patient, isLoading: isPatientLoading } = usePatient(patientUuid);
  const isLoading = isMedicationOrderLoading && isOrderLoading && isPatientLoading;
  const { activeVisit: currentVisit, mutate: visitMutate } = useVisit(patientUuid);
  const buttonText = actionText ?? defaultButtonText;

  const launchModal = useCallback(() => {
    if (shouldShowBillModal) {
      launchWorkspace2(
        'create-bill-workspace',
        {
          order,
          patientUuid: order?.patient?.uuid,
          medicationRequestBundle,
        },
        {},
        {},
      );
      return;
    }

    if (dispenseFormProps) {
      launchWorkspace2('dispense-workspace', dispenseFormProps);
    }
  }, [shouldShowBillModal, medicationRequestBundle, dispenseFormProps, order]);

  if (!closeable) {
    return null;
  }

  return (
    <div className={styles.buttonContainer}>
      {shouldAllowModify && (
        <ModifyButton
          currentVisit={!!currentVisit}
          isLoading={isLoading}
          order={order}
          patientUuid={patientUuid}
          visitMutate={visitMutate}
          patient={patient}
          activeVisit={currentVisit}
        />
      )}
      <BaseOrderButton
        size="lg"
        isLoading={isLoading}
        isDisabled={isDisabled}
        buttonText={buttonText}
        onClick={launchModal}
      />
    </div>
  );
};
