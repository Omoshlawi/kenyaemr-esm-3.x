import React from 'react';
import { useSWRConfig } from 'swr';
import { launchWorkspaceGroup2, useVisit, type Visit } from '@openmrs/esm-framework';
import {
  invalidateVisitByUuid,
  type PatientWorkspace2DefinitionProps,
  usePatientChartStore,
} from '@openmrs/esm-patient-common-lib';
import ExportedVisitForm from './exported-visit-form.workspace';

export interface VisitFormProps {
  openedFrom: string;
  showPatientHeader?: boolean;
}

const VisitForm: React.FC<PatientWorkspace2DefinitionProps<VisitFormProps, {}>> = ({
  workspaceProps,
  groupProps,
  ...rest
}) => {
  const { openedFrom = '', showPatientHeader = false } = workspaceProps ?? {};
  const { patient, patientUuid = '', visitContext } = groupProps ?? {};

  const { mutate: mutateActiveVisit } = useVisit(patientUuid);
  const { mutate: globalMutate } = useSWRConfig();
  const { setVisitContext } = usePatientChartStore(patientUuid);

  if (!workspaceProps || !groupProps) {
    return null;
  }

  const onVisitStarted = (visit: Visit) => {
    const mutateSavedOrUpdatedVisit = () => invalidateVisitByUuid(globalMutate as any, visit.uuid);
    mutateActiveVisit();
    setVisitContext?.(visit, mutateSavedOrUpdatedVisit);

    launchWorkspaceGroup2('patient-chart', {
      patient,
      patientUuid,
      visitContext: visit,
      mutateVisitContext: mutateSavedOrUpdatedVisit,
    });
  };

  return (
    <ExportedVisitForm
      {...rest}
      workspaceProps={{
        openedFrom,
        showPatientHeader,
        onVisitStarted,
        patient,
        patientUuid,
        visitContext: visitContext ?? null,
      }}
      groupProps={{}}
    />
  );
};

export default VisitForm;
