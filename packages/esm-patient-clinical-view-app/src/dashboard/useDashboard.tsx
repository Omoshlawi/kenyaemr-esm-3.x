import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { useMemo } from 'react';
import uniqBy from 'lodash-es/uniqBy';
import { PatientProgram } from '@openmrs/esm-patient-common-lib';
import useSWRImmutable from 'swr/immutable';
const customRepresentation = `custom:(uuid,display,program,dateEnrolled,dateCompleted,location:(uuid,display))`;

export const usePatientEnrollment = (patientUuid: string) => {
  const { data, error, isLoading, isValidating } = useSWRImmutable<{ data: { results: Array<PatientProgram> } }>(
    `${restBaseUrl}/programenrollment?patient=${patientUuid}&v=${customRepresentation}`,
    openmrsFetch,
  );

  const activePatientEnrollment = useMemo(() => {
    const sorted = [...(data?.data.results ?? [])].sort((a, b) => (b.dateEnrolled > a.dateEnrolled ? 1 : -1));
    return sorted.filter((enrollment) => enrollment.dateCompleted === null);
  }, [data?.data.results]);

  const patientEnrollments = useMemo(() => {
    return [...(data?.data.results ?? [])].sort((a, b) => (b.dateEnrolled > a.dateEnrolled ? 1 : -1));
  }, [data?.data.results]);

  return {
    activePatientEnrollment: uniqBy(activePatientEnrollment, (program) => program?.program?.uuid),
    patientEnrollments: uniqBy(patientEnrollments, (program) => program?.program?.uuid),
    error,
    isLoading,
    isValidating,
  };
};
