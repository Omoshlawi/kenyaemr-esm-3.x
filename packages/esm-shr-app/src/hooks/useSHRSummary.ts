import { openmrsFetch, parseDate } from '@openmrs/esm-framework';
import useSWR from 'swr';
import {
  SHRSummary,
  Complaint as _Complaint,
  Allergy as _Allergy,
  Condition as _Condition,
  Diagnosis as _Diagnosis,
  LabResult as _LabResult,
  Vital as _Vital,
} from '../types';
import summaryMock from './summary.mock';

export interface _SHRSummary {
  visits: Visit[];
}

export interface Visit {
  startDate: string;
  endDate: string;
  facility: Facility;
  professional: Professional[];
  visit_type: string;
  priority: string;
  wasHospitalized: boolean;
  hospitalization: Hospitalization;
  summary: Summary;
}

export interface Facility {
  identifier: string;
  Display: string;
}

export interface Professional {
  role: string;
  identifier: string;
}

export interface Hospitalization {
  referredFrom: ReferredFrom;
  admitSource: string;
  reAdmission: boolean;
  dischargeOutcome: string;
}

export interface ReferredFrom {
  identifier: string;
  display: string;
}

export interface Summary {
  conditions: Condition[];
  observations: Observation[];
}

export interface Condition {
  category: string;
  clinicalStatus: string;
  verificationStatus: string;
  severity: string;
  condition: ConditionCode;
  onsetDateTime: string;
  recordedDate: string;
  recorder: Recorder;
  comments: string;
}

export interface ConditionCode {
  code: string;
  display: string;
}

export interface Recorder {
  role: string;
  identifier: string;
}

export interface Observation {
  category: string;
  isGroupedObs: boolean;
  observationCode: ObservationCode;
  observationValue: string;
  observationValueComponent?: ObservationValueComponent[];
  interpretation: string;
  recordedDate: string;
}

export interface ObservationCode {
  code: string;
  display: string;
}

export interface ObservationValueComponent {
  observationCode: ObservationCode;
  observationValue: string;
}

export const extractCondition = (visits: Array<Visit> = []): Array<_Condition> => {
  return visits?.reduce<Array<_Condition>>((prev, visit) => {
    if (visit?.summary?.conditions) {
      return [
        ...prev,
        ...visit.summary.conditions.map((condition) => ({
          dateRecorded: condition.recordedDate,
          name: condition.condition.display,
          onsetDate: condition.onsetDateTime,
          status: condition.clinicalStatus,
        })),
      ];
    }
    return prev;
  }, []);
};

export const extractVitals = (visits: Array<Visit> = []): Array<_Vital> => {
  return visits?.reduce<Array<_Vital>>((prev, visit) => {
    if (visit?.summary?.observations) {
      return [
        ...prev,
        ...visit.summary.observations
          .filter((ob) => ob.category === 'vital-signs')
          .map<_Vital>((ob) => ({
            dateRecorded: ob.recordedDate,
            name: ob.observationCode.display,
            value: ob.observationValue,
          })),
      ];
    }
    return prev;
  }, []);
};
export const extractLabResults = (visits: Array<Visit> = []): Array<_LabResult> => {
  return visits?.reduce<Array<_Vital>>((prev, visit) => {
    if (visit?.summary?.observations) {
      return [
        ...prev,
        ...visit.summary.observations
          .filter((ob) => ob.category === 'lab-results')
          .map<_LabResult>((ob) => ({
            dateRecorded: ob.recordedDate,
            name: ob.observationCode.display,
            value: ob.observationValue,
          })),
      ];
    }
    return prev;
  }, []);
};

export const useSHRSummary = (patientUuid: string) => {
  const shrSummaryUrl = `/ws/rest/v1/kenyaemril/shrPatientSummary?patientUuid=${patientUuid}`;
  const { data, mutate, error, isLoading } = useSWR<_SHRSummary>(shrSummaryUrl, () => summaryMock);
  return {
    data: data,
    isError: error,
    isLoading: isLoading,
    visitDates: data?.visits?.map((visit) => parseDate(visit.startDate)) ?? [],
  };
};

export const useCommunityReferrals = (status: string) => {
  const shrSummaryUrl = `/ws/rest/v1/kenyaemril/communityReferrals?status=${status}`;
  const { data, mutate, error, isLoading } = useSWR<{ data: SHRSummary }>(shrSummaryUrl, openmrsFetch);

  return {
    data: data?.data ? data?.data : null,
    isError: error,
    isLoading: isLoading,
  };
};
