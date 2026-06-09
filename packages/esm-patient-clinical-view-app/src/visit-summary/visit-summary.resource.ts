import useSWR from 'swr';
import { openmrsFetch } from '@openmrs/esm-framework';

export interface VitalItem {
  value: number | string | null;
  unit: string;
  interpretation: { system: string; code: string; display: string } | null;
}

export interface VisitSummary {
  visitUuid: string;
  visitDate: string;
  visitStopDate: string;
  visitType: string;
  location: string;
  vitals: {
    weight: VitalItem;
    height: VitalItem;
    temperature: VitalItem;
    pulse: VitalItem;
    bpSystolic: VitalItem;
    bpDiastolic: VitalItem;
    bloodPressure: VitalItem;
    respiratoryRate: VitalItem;
    oxygenSaturation: VitalItem;
    muac: VitalItem;
  };
  complaints: Array<{ duration: string; complaint: string; onsetStatus: string }>;
  conditions: Array<{ name: string; onsetDate: string; status: string }>;
  allergies: Array<{ allergen: string; allergenType: string; severity: string; reactions: string[] }>;
  diagnoses: Array<{ diagnosis: string; certainty: string; rank: number; date: string }>;
  medications: Array<{
    drug: string;
    dose: string;
    frequency: string;
    duration: string;
    route: string;
    dateActivated: string;
    autoExpireDate: string;
  }>;
  clinicalNotes: Array<{ encounterType: string; date: string; note: string }>;
  procedures: Array<{
    procedure: string;
    procedureUuid: string;
    orderNumber: string;
    action: string;
    urgency: string;
    status: string;
    orderedDate: string;
    instructions: string;
    orderer: string;
    procedureReport: string;
    results: unknown[];
  }>;
  imaging: Array<{
    procedure: string;
    procedureUuid: string;
    orderNumber: string;
    action: string;
    urgency: string;
    status: string;
    orderedDate: string;
    instructions: string;
    orderer: string;
    procedureReport: string;
    impression?: string;
    results: unknown[];
  }>;
  labResults: Array<{
    panel: string | null;
    panelUuid: string | null;
    isPanel: boolean;
    results: Array<{
      test: string;
      testUuid: string;
      value: string;
      date: string;
      units: string;
      lowNormal: number | null;
      hiNormal: number | null;
      lowCritical: number | null;
      hiCritical: number | null;
      interpretation: { system: string; code: string; display: string } | null;
    }>;
  }>;
}

export function useVisitSummary(visitUuid: string) {
  const url = visitUuid ? `/ws/rest/v1/kenyaemr/visitSummary?visitUuid=${visitUuid}` : null;
  const { data, error, isLoading } = useSWR<{ data: VisitSummary }>(url, openmrsFetch);
  return { summary: data?.data, error, isLoading };
}
