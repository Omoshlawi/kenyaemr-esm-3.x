/** How strongly a `name` term matched, in the order the API ranks them. */
export type PcsMatchType = 'EXACT' | 'CONTAINS' | 'SOUNDEX';

/** Which name field the term hit. A participant's own name wins over their compound head's. */
export type PcsMatchedOn = 'name' | 'motherName' | 'compoundName';

export interface PcsMother {
  individualId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
}

export interface PcsCompound {
  compoundId: string;
  headIndividualId: string;
  headFirstName: string;
  headMiddleName?: string;
  headLastName: string;
}

export interface PcsVillage {
  code: string;
  name: string;
}

export interface PcsContact {
  phone?: string;
  email?: string;
  nationalId?: string;
  lastUpdated?: string;
}

export interface PcsParticipant {
  individualId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  sex: 'M' | 'F';
  dateOfBirth?: string;
  pbidsEnrolled: boolean;
  cardse: boolean;
  mother: PcsMother | null;
  compound: PcsCompound;
  village: PcsVillage;
  contacts: Array<PcsContact>;
  matchedOn: PcsMatchedOn | null;
  matchType: PcsMatchType | null;
}

export interface PcsParticipantSearchResponse {
  totalCount: number;
  startIndex: number;
  results: Array<PcsParticipant>;
}

export interface PcsApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}

export interface PcsParticipantFilters {
  name: string;
  village: string;
  phone: string;
  /**
   * Returns the participants whose mother is this individual. Not part of the editable
   * filter bar — it backs the dependants list on a linked participant.
   */
  motherId?: string;
}

/**
 * Normalized demographics of the patient selected on the left-hand side of the
 * registration screen. This is the EMR-side input the filters are derived from.
 */
export interface PcsSearchSubject {
  /** `fhir.Patient.id` — the local patient uuid, or the HIE resource id. */
  id: string;
  source: 'local' | 'hie';
  /**
   * The record the flattened fields below were derived from. Kept whole because linking an
   * HIE patient has to be able to create them locally, which needs more than demographics.
   */
  patient: fhir.Patient;
  name: string;
  gender?: string;
  birthDate?: string;
  nationalId?: string | null;
  phoneNumber?: string | null;
}
