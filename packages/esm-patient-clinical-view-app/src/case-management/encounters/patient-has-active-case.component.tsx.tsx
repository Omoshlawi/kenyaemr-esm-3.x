import React, { FC, PropsWithChildren } from 'react';
import { ErrorState, launchWorkspace2 } from '@openmrs/esm-framework';
import { usePatientActiveCases } from './case-encounter-table.resource';
import { DataTableSkeleton } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@openmrs/esm-patient-common-lib';

type PatientHasActiveCaseProps = PropsWithChildren<{ patientUuid: string }>;

const PatientHasActiveCase: FC<PatientHasActiveCaseProps> = ({ patientUuid, children }) => {
  const { activeCases, error, isLoading } = usePatientActiveCases(patientUuid);
  const { t } = useTranslation();
  const handleAddPatientCase = () => {
    launchWorkspace2('add-patient-case-form', { patientUuid });
  };
  if (isLoading) {
    return <DataTableSkeleton />;
  }
  if (error) {
    return <ErrorState error={error} headerTitle={t('patientCases', 'Patient Cases')} />;
  }
  if (!activeCases?.length) {
    return (
      <EmptyState
        headerTitle={t('patientCases', 'Patient Cases')}
        displayText={t('patientActiveCase', 'Patient Active case')}
        launchForm={handleAddPatientCase}
      />
    );
  }
  return <>{children}</>;
};

export default PatientHasActiveCase;
