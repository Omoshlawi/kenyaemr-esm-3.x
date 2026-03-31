import React, { FC, useMemo } from 'react';
import { usePatientActivePeerEducator } from './kvp-program-actions.resource';
import { useTranslation } from 'react-i18next';
import { InlineLoading, OverflowMenuItem } from '@carbon/react';
import { launchWorkspace, launchWorkspace2, useConfig, Visit } from '@openmrs/esm-framework';
import { CarePanelConfig } from '../config-schema';
import {
  launchStartVisitPrompt,
  useLaunchWorkspaceRequiringVisit,
  usePatientChartStore,
} from '@openmrs/esm-patient-common-lib';

type KvpLinkPatientToPeerEducatorProps = {
  patientUuid: string;
  form: CarePanelConfig['careProgramForms'][0]['forms'][0];
  mutate?: () => void;
};
const KvpLinkPatientToPeerEducator: FC<KvpLinkPatientToPeerEducatorProps> = ({ patientUuid, form, mutate }) => {
  const { mutateVisitContext, visitContext, patient: fhirPatient } = usePatientChartStore(patientUuid);
  const { activePeer, error, isLoading } = usePatientActivePeerEducator(patientUuid);
  const { hideFilledProgramForm } = useConfig<CarePanelConfig>();
  const { t } = useTranslation();
  const formEncounter = visitContext?.encounters?.find((en) => en.form?.uuid === form.formUuId);
  const launchFormEntryWorkspace = useLaunchWorkspaceRequiringVisit(patientUuid, 'patient-form-entry-workspace');

  const groupProps = useMemo(
    () => ({
      patientUuid,
      patient: fhirPatient,
      visitContext,
      mutateVisitContext,
    }),
    [patientUuid, fhirPatient, visitContext, mutateVisitContext],
  );

  if (isLoading) {
    return <InlineLoading />;
  }

  if (!activePeer.length) {
    return (
      <OverflowMenuItem
        itemText={t('linkToPeerEducator', 'Link to peer Educator')}
        onClick={() => {
          launchWorkspace2(
            'kvp-peer-linkage-form-workspace',
            {
              workspaceTitle: t('linkPatientToPeerEducator', 'Link Patient to Peer Educator'),
              patientUuid,
            },
            {},
            {},
          );
        }}
      />
    );
  }

  if (hideFilledProgramForm && formEncounter) {
    return null;
  }

  return (
    <OverflowMenuItem
      key={form.formUuId}
      itemText={form.formName}
      onClick={() => {
        launchFormEntryWorkspace(
          {
            workspaceTitle: form.formName,
            form: { uuid: form.formUuId },
            encounterUuid: formEncounter?.uuid ?? '',
          },
          {},
          groupProps,
        );
      }}
    />
  );
};

export default KvpLinkPatientToPeerEducator;
