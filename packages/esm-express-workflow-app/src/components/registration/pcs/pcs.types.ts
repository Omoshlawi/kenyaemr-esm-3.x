export interface PcsPatient {
  individualId: string;
  name: string;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  village?: string;
  compoundHead?: string;
  nationalId?: string;
  phoneNumber?: string;
}

/**
 * Normalized demographics of the patient selected on the left-hand side of the
 * registration screen. This is what the PCS registry is searched with.
 */
export interface PcsSearchSubject {
  /** `fhir.Patient.id` — the local patient uuid, or the HIE resource id. */
  id: string;
  source: 'local' | 'hie';
  name: string;
  gender?: string;
  birthDate?: string;
  nationalId?: string | null;
  phoneNumber?: string | null;
}
