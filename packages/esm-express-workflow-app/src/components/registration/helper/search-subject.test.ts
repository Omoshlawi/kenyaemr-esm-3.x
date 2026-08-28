import { describe, expect, it, vi } from 'vitest';
import { toSearchSubject } from './index';

vi.mock('@openmrs/esm-framework', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openmrs/esm-framework')>()),
  getPatientName: (patient: fhir.Patient) =>
    `${patient.name?.[0]?.given?.join(' ') ?? ''} ${patient.name?.[0]?.family ?? ''}`.trim(),
}));

const NATIONAL_ID_TYPE = 'national-id-type-uuid';

const patient = {
  id: 'patient-uuid',
  gender: 'female',
  birthDate: '1990-04-02',
  name: [{ given: ['Jane'], family: 'Odongo' }],
  identifier: [{ type: { coding: [{ code: NATIONAL_ID_TYPE }] }, value: '12345678' }],
  telecom: [{ system: 'phone', value: '0712345678' }],
} as fhir.Patient;

describe('toSearchSubject', () => {
  it('flattens a patient into the shape the slot receives', () => {
    expect(toSearchSubject(patient, 'local', NATIONAL_ID_TYPE)).toMatchObject({
      id: 'patient-uuid',
      source: 'local',
      name: 'Jane Odongo',
      gender: 'female',
      birthDate: '1990-04-02',
      phoneNumber: '0712345678',
    });
  });

  it('keeps the whole record alongside the flattened fields', () => {
    // A consumer acting on an HIE patient has to be able to create them locally, which needs
    // more than the demographics above.
    expect(toSearchSubject(patient, 'hie').patient).toBe(patient);
  });

  it('carries the matched HIE record through when one is given', () => {
    const hiePatient = { id: 'hie-uuid', contact: [{ id: 'child-1' }] } as fhir.Patient;

    // The `contact` array is where dependants come from, so losing this loses them.
    expect(toSearchSubject(patient, 'local', NATIONAL_ID_TYPE, hiePatient).hiePatient).toBe(hiePatient);
  });

  it('leaves hiePatient undefined when none was matched', () => {
    expect(toSearchSubject(patient, 'local', NATIONAL_ID_TYPE).hiePatient).toBeUndefined();
  });

  it('reports a missing phone as null rather than undefined', () => {
    // The field is always present on the subject, so a consumer can tell "no phone on file"
    // apart from "this subject was built by something older".
    const withoutPhone = { ...patient, telecom: undefined } as fhir.Patient;

    expect(toSearchSubject(withoutPhone, 'local', NATIONAL_ID_TYPE).phoneNumber).toBeNull();
  });
});
