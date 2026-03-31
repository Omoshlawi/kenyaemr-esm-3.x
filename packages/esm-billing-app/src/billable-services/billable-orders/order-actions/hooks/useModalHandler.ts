import { navigate, getGlobalStore, launchWorkspace2 } from '@openmrs/esm-framework';
import { type Order, PatientWorkspaceGroupProps } from '@openmrs/esm-patient-common-lib';
import { useCallback } from 'react';
import { mutate } from 'swr';
import { buildMedicationOrder } from './order';

export function useModalHandler(mutateUrl?: string) {
  const handleModalClose = useCallback(() => {
    if (!mutateUrl) {
      return;
    }

    mutate((key) => typeof key === 'string' && key.startsWith(mutateUrl), undefined, {
      revalidate: true,
    });
  }, [mutateUrl]);

  return {
    handleModalClose,
  };
}

export const getWorkspaceStore = () => {
  return getGlobalStore('workspace');
};

export const launchPrescriptionEditWorkspace = (
  order: Order,
  patientUuid: string,
  workspaceGroupProps: PatientWorkspaceGroupProps,
) => {
  const newItem = buildMedicationOrder(order, 'REVISE');
  launchWorkspace2(
    'edit-drug-order',
    { order: newItem, orderToEditOrdererUuid: order.orderer?.uuid },
    workspaceGroupProps,
  );
};

export const navigateAndLaunchWorkspace = (
  targetUrl: string,
  contextKey: string,
  workspaceName: string,
  additionalProps: any,
  patientUuid: string,
) => {
  const workspaceStore = getWorkspaceStore();

  // Set up a one-time event listener for when navigation completes
  const handleRoutingComplete = (event: Event) => {
    // Remove the listener after it fires once
    window.removeEventListener('single-spa:routing-event', handleRoutingComplete);

    // Now that navigation is complete, change context and launch workspace
    workspaceStore.setState({ context: `patient/${patientUuid}`, openWorkspaces: [], prompt: null });
    launchWorkspace2(workspaceName, additionalProps, {}, {});
  };

  // Add the event listener before navigating
  window.addEventListener('single-spa:routing-event', handleRoutingComplete);

  // Navigate to the target URL
  navigate({ to: targetUrl });
};
