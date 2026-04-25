import { Encounter, FetchResponse, openmrsFetch, restBaseUrl, useConfig } from '@openmrs/esm-framework';
import { HivCareAndTreatmentConfig } from '../../../config-schema';
import useSWR from 'swr';
import useSWRImmutable from 'swr/immutable';
import { useCallback, useMemo } from 'react';
const rep =
  'custom:(uuid,encounterDatetime,encounterType,location:(uuid,name),patient:(uuid,display,age,identifiers,person),encounterProviders:(uuid,provider:(uuid,name)),obs:(uuid,obsDatetime,voided,groupMembers,concept:(uuid,name:(uuid,name)),value:(uuid,name:(uuid,name),names:(uuid,conceptNameType,name))),form:(uuid,name,resources),visit:(uuid,startDatetime,stopDatetime,visitType:(uuid,display)))';

type FormPage = {
  label: string;
  sections: Array<{
    label: string;
    questions: Array<{
      label: string;
      questionOptions?: {
        concept: string;
        answers: Array<{
          concept: string;
          label: string;
        }>;
      };
    }>;
  }>;
};
type FormSchema = {
  pages?: Array<FormPage>;
};

export const useFormSchema = (formUuid: string) => {
  const url = `${restBaseUrl}/form/${formUuid}?v=custom:(resources)`;
  const { data, error, isLoading } = useSWR<
    FetchResponse<{ resources: Array<{ display: string; links: Array<{ rel: 'value' | 'self' }>; uuid: string }> }>
  >(url, openmrsFetch);

  const resourceUuid = useMemo(() => {
    return data?.data.resources.find((resource) => resource.display === 'JSON schema')?.uuid;
  }, [data]);

  const resourceUrl = useMemo(() => {
    if (!resourceUuid) {
      return null;
    }
    return `${restBaseUrl}/form/${formUuid}/resource/${resourceUuid}/value`;
  }, [formUuid, resourceUuid]);

  const {
    data: resourceData,
    error: resourceError,
    isLoading: resourceIsLoading,
  } = useSWRImmutable<FetchResponse<FormSchema>>(resourceUrl, openmrsFetch);

  const formSchema = useMemo(() => {
    return resourceData?.data;
  }, [resourceData]);

  const getQuestion = useCallback(
    (questionConceptUuid: string) => {
      const pagesWithQuestion = formSchema?.pages?.filter((page) =>
        page.sections?.some((s) => s.questions?.some((q) => q.questionOptions?.concept === questionConceptUuid)),
      );
      const sectionsWithQuestion = pagesWithQuestion?.flatMap((page) =>
        page.sections?.filter((s) => s.questions?.some((q) => q.questionOptions?.concept === questionConceptUuid)),
      );
      const question = sectionsWithQuestion
        ?.flatMap((s) => s.questions)
        ?.find((q) => q.questionOptions?.concept === questionConceptUuid);
      return question;
    },
    [formSchema],
  );

  const getAnswerLabel = useCallback(
    (questionConceptUuid: string, answerConceptUuid: string) => {
      const question = getQuestion(questionConceptUuid);
      const answer = question?.questionOptions?.answers?.find((a) => a.concept === answerConceptUuid);
      return answer?.label;
    },
    [getQuestion],
  );
  return {
    formSchema,
    isLoading: isLoading || resourceIsLoading,
    error: error || resourceError,
    getQuestion,
    getAnswerLabel,
  };
};

export const useArtTherapy = (patientUuid: string) => {
  const {
    hivCareAndTreatment: {
      encounters: { artTherapyEncounterUuid },
      forms: { artTherapyFormUuid },
      concepts,
    },
  } = useConfig<HivCareAndTreatmentConfig>();

  const url = `${restBaseUrl}/encounter?encounterType=${artTherapyEncounterUuid}&patient=${patientUuid}&v=${rep}&totalCount=true&limit=10&startIndex=0`;

  const { data, error, isLoading, mutate } = useSWR<FetchResponse<{ results: Array<Encounter>; totalCount: number }>>(
    url,
    openmrsFetch,
  );

  return {
    artTherapyEncounters: data?.data.results,
    totalCount: data?.data.totalCount,
    isLoading,
    error,
    mutate,
    artTherapyFormUuid,
    concepts,
  };
};

export const useServiceDelivertModel = (patientUuid: string) => {
  const {
    hivCareAndTreatment: {
      encounters: { serviceDeliveryEncounterUuid },
      forms: { serviceDeliveryModelFormUuid },
      concepts,
    },
  } = useConfig<HivCareAndTreatmentConfig>();
  const url = `${restBaseUrl}/encounter?encounterType=${serviceDeliveryEncounterUuid}&patient=${patientUuid}&v=${rep}&totalCount=true&limit=10&startIndex=0`;

  const { data, error, isLoading, mutate } = useSWR<FetchResponse<{ results: Array<Encounter>; totalCount: number }>>(
    url,
    openmrsFetch,
  );

  return {
    serviceDeliveryEncounters: data?.data.results,
    totalCount: data?.data.totalCount,
    isLoading,
    error,
    mutate,
    serviceDeliveryModelFormUuid,
    concepts,
  };
};

export const useTransferOut = (patientUuid: string) => {
  const {
    hivCareAndTreatment: {
      encounters: { transferOutEncounterUuid },
      forms: { transferOutFormUuid },
      concepts,
    },
  } = useConfig<HivCareAndTreatmentConfig>();

  const url = `${restBaseUrl}/encounter?encounterType=${transferOutEncounterUuid}&patient=${patientUuid}&v=${rep}&totalCount=true&limit=10&startIndex=0`;

  const { data, error, isLoading, mutate } = useSWR<FetchResponse<{ results: Array<Encounter>; totalCount: number }>>(
    url,
    openmrsFetch,
  );

  return {
    transferOutEncounters: data?.data.results,
    totalCount: data?.data.totalCount,
    isLoading,
    error,
    mutate,
    transferOutFormUuid,
    concepts,
  };
};

export const usePatientTracing = (patientUuid: string) => {
  const {
    hivCareAndTreatment: {
      encounters: { patientTracingEncounterUuid },
      forms: { patientTracingFormUuid },
      concepts,
    },
  } = useConfig<HivCareAndTreatmentConfig>();

  const url = `${restBaseUrl}/encounter?encounterType=${patientTracingEncounterUuid}&patient=${patientUuid}&v=${rep}&totalCount=true&limit=10&startIndex=0`;

  const { data, error, isLoading, mutate } = useSWR<FetchResponse<{ results: Array<Encounter>; totalCount: number }>>(
    url,
    openmrsFetch,
  );

  return {
    patientTracingEncounters: data?.data.results,
    totalCount: data?.data.totalCount,
    isLoading,
    error,
    mutate,
    patientTracingFormUuid,
    concepts,
  };
};
