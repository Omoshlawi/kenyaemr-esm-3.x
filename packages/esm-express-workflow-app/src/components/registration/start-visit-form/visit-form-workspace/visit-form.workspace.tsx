import React from 'react';
import { type KeyedMutator, useSWRConfig } from 'swr';
import { useVisit, type Visit } from '@openmrs/esm-framework';
import {
  invalidateVisitByUuid,
  type PatientWorkspace2DefinitionProps,
  usePatientChartStore,
} from '@openmrs/esm-patient-common-lib';
import ExportedVisitForm from '../start-visit-workspace/exported-visit-form.workspace';

export interface VisitFormProps {
  openedFrom: string;
  showPatientHeader?: boolean;
}

const VisitForm: React.FC<PatientWorkspace2DefinitionProps<VisitFormProps, {}>> = ({
  workspaceProps: { openedFrom, showPatientHeader = false },
  groupProps: { patient, patientUuid, visitContext },
  ...rest
}) => {
  const { mutate: mutateActiveVisit } = useVisit(patientUuid);
  const { mutate: globalMutate } = useSWRConfig();
  const boundMutate = globalMutate as unknown as KeyedMutator<unknown>;
  const { setVisitContext } = usePatientChartStore(patientUuid);

  const onVisitStarted = (visit: Visit) => {
    const mutateSavedOrUpdatedVisit = () => invalidateVisitByUuid(boundMutate, visit.uuid);
    mutateActiveVisit();
    setVisitContext?.(visit, mutateSavedOrUpdatedVisit);
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
        visitContext,
      }}
      groupProps={{}}
    />
  );
};

export default VisitForm;
