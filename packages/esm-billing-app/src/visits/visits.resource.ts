import { restBaseUrl, useOpenmrsPagination, type Visit } from '@openmrs/esm-framework';
import dayjs from 'dayjs';

const activeVisitsRepresentation =
  'custom:(uuid,startDatetime,stopDatetime,patient:(uuid,display),visitType:(uuid,display),location:(uuid,display))';

export const useActiveVisits = (
  options: {
    fromDate?: Date;
    toDate?: Date;
    pageSize?: number;
  } = {},
) => {
  const { fromDate = dayjs().startOf('day').toDate(), toDate = dayjs().endOf('day').toDate(), pageSize = 10 } = options;

  const url =
    `${restBaseUrl}/visit?includeInactive=false&v=${activeVisitsRepresentation}` +
    `&fromStartDate=${dayjs(fromDate).format('YYYY-MM-DD')}`;

  const {
    data: visits,
    error,
    isLoading,
    isValidating,
    mutate,
    totalPages,
    totalCount,
    currentPage,
    currentPageSize,
    paginated,
    showNextButton,
    showPreviousButton,
    goTo,
    goToNext,
    goToPrevious,
  } = useOpenmrsPagination<Visit>(url, pageSize, {
    swrConfig: { errorRetryCount: 2, keepPreviousData: true, revalidateOnFocus: true },
  });

  // The endpoint only filters by a lower `fromStartDate` bound, so enforce the upper bound here.
  const toDateMs = dayjs(toDate).valueOf();
  const filteredVisits = (visits ?? []).filter(
    (visit) => visit.startDatetime && dayjs(visit.startDatetime).valueOf() <= toDateMs,
  );

  return {
    visits: filteredVisits,
    error,
    isLoading,
    isValidating,
    mutate,
    pagination: {
      totalPages,
      totalCount,
      currentPage,
      currentPageSize,
      paginated,
      showNextButton,
      showPreviousButton,
      goTo,
      goToNext,
      goToPrevious,
      pageSize,
    },
  };
};
