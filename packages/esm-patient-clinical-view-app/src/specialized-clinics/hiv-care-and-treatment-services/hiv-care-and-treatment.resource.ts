import useSWR from 'swr';
import useSWRImmutable from 'swr/immutable';
import { useCallback, useMemo } from 'react';
import { FetchResponse, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

export const defaultEncounterRepresentation =
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
