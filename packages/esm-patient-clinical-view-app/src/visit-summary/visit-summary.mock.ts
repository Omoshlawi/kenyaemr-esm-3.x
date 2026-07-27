import type { Visit } from '@openmrs/esm-framework';
import type { VisitSummary, VitalItem } from './visit-summary.resource';

const vital = (value: VitalItem['value'], unit = '', code: string | null = null): VitalItem => ({
  value,
  unit,
  interpretation: code ? { system: 'system', code, display: code } : null,
});

export const emptyVitals: VisitSummary['vitals'] = {
  weight: vital(null),
  height: vital(null),
  temperature: vital(null),
  pulse: vital(null),
  bpSystolic: vital(null),
  bpDiastolic: vital(null),
  bloodPressure: vital(null),
  respiratoryRate: vital(null),
  oxygenSaturation: vital(null),
  muac: vital(null),
};

export const fullVitals: VisitSummary['vitals'] = {
  weight: vital(70, 'kg'),
  height: vital(175, 'cm'),
  temperature: vital(37, '°C'),
  pulse: vital(72, 'bpm'),
  bpSystolic: vital(120, 'mmHg'),
  bpDiastolic: vital(80, 'mmHg'),
  bloodPressure: vital('120/80', 'mmHg'),
  respiratoryRate: vital(18, 'br/min'),
  oxygenSaturation: vital(98, '%'),
  muac: vital(25, 'cm'),
};

export const mockVisitSummary: VisitSummary = {
  visitUuid: 'visit-1',
  visitDate: '2024-01-15T09:00:00.000+0300',
  visitStopDate: '2024-01-15T12:00:00.000+0300',
  visitType: 'Outpatient',
  location: 'OPD',
  vitals: fullVitals,
  complaints: [{ duration: '3 days', complaint: 'Headache', onsetStatus: 'sudden' }],
  conditions: [
    { name: 'Hypertension', onsetDate: '2023-06-01T00:00:00.000+0300', status: 'ACTIVE' },
    { name: 'Asthma', onsetDate: '2022-02-01T00:00:00.000+0300', status: 'INACTIVE' },
  ],
  allergies: [
    { allergen: 'Penicillin', allergenType: 'DRUG', severity: 'SEVERE', reactions: ['Rash'] },
    { allergen: 'Peanuts', allergenType: 'FOOD', severity: 'MODERATE', reactions: ['Swelling'] },
    { allergen: 'Dust', allergenType: 'ENVIRONMENT', severity: 'MILD', reactions: ['Sneezing'] },
  ],
  diagnoses: [
    { diagnosis: 'Malaria', certainty: 'CONFIRMED', rank: 1, date: '2024-01-15T09:00:00.000+0300' },
    { diagnosis: 'Typhoid', certainty: 'PROVISIONAL', rank: 2, date: '2024-01-15T09:00:00.000+0300' },
    { diagnosis: 'Anemia', certainty: 'PRESUMED', rank: 3, date: '2024-01-15T09:00:00.000+0300' },
  ],
  medications: [
    {
      drug: 'Paracetamol',
      dose: '500mg',
      frequency: 'TDS',
      duration: '5 days',
      route: 'Oral',
      dateActivated: '2024-01-15T09:00:00.000+0300',
      autoExpireDate: '2100-01-20T09:00:00.000+0300',
    },
    {
      drug: 'Amoxicillin',
      dose: '250mg',
      frequency: 'BD',
      duration: '3 days',
      route: 'Oral',
      dateActivated: '2023-01-15T09:00:00.000+0300',
      autoExpireDate: '2023-01-20T09:00:00.000+0300',
    },
  ],
  clinicalNotes: [{ encounterType: 'Consultation', date: '2024-01-15T09:00:00.000+0300', note: 'Patient stable.' }],
  procedures: [
    {
      procedure: 'Appendectomy',
      procedureUuid: 'proc-1',
      orderNumber: 'ORD-001',
      action: 'NEW',
      urgency: 'ROUTINE',
      status: 'COMPLETED',
      orderedDate: '2024-01-15T09:00:00.000+0300',
      instructions: '',
      orderer: 'Dr. Smith',
      procedureReport: '&lt;p&gt;Procedure went well&lt;/p&gt;',
      results: [],
    },
  ],
  imaging: [
    {
      procedure: 'Chest X-Ray',
      procedureUuid: 'img-1',
      orderNumber: 'ORD-002',
      action: 'NEW',
      urgency: 'ROUTINE',
      status: 'ORDERED',
      orderedDate: '2024-01-15T09:00:00.000+0300',
      instructions: '',
      orderer: 'Dr. Jones',
      procedureReport: '',
      impression: '&lt;p&gt;No acute findings&lt;/p&gt;',
      results: [],
    },
  ],
  labResults: [
    {
      panel: null,
      panelUuid: null,
      isPanel: false,
      results: [
        {
          test: 'Hemoglobin',
          testUuid: 'test-1',
          value: '9',
          date: '2024-01-15T09:00:00.000+0300',
          units: 'g/dL',
          lowNormal: 12,
          hiNormal: 16,
          lowCritical: null,
          hiCritical: null,
          interpretation: { system: 'system', code: 'L', display: 'Low' },
        },
      ],
    },
    {
      panel: 'Liver Function Test',
      panelUuid: 'panel-1',
      isPanel: true,
      results: [
        {
          test: 'ALT',
          testUuid: 'test-2',
          value: '80',
          date: '2024-01-15T09:00:00.000+0300',
          units: 'U/L',
          lowNormal: null,
          hiNormal: 40,
          lowCritical: null,
          hiCritical: null,
          interpretation: { system: 'system', code: 'H', display: 'High' },
        },
        {
          test: 'AST',
          testUuid: 'test-3',
          value: '30',
          date: '2024-01-15T09:00:00.000+0300',
          units: 'U/L',
          lowNormal: 10,
          hiNormal: null,
          lowCritical: null,
          hiCritical: null,
          interpretation: null,
        },
      ],
    },
  ],
};

export function buildVisitSummary(overrides: Partial<VisitSummary> = {}): VisitSummary {
  return { ...mockVisitSummary, ...overrides };
}

export const mockVisits = [
  {
    uuid: 'visit-1',
    startDatetime: '2024-01-15T09:00:00.000+0300',
    visitType: { display: 'Outpatient' },
  },
  {
    uuid: 'visit-2',
    startDatetime: '2023-12-10T09:00:00.000+0300',
    visitType: { display: 'Inpatient' },
  },
] as unknown as Visit[];

export const mockPatient = {
  id: 'patient-1',
  name: [{ given: ['John'], family: 'Doe' }],
} as fhir.Patient;
