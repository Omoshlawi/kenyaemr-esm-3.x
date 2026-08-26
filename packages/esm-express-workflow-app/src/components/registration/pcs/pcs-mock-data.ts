/**
 * TODO(pcs-api): delete this file once the PCS endpoint is live.
 *
 * Static stand-in for the PCS registry so the consolidation pane can be designed and
 * demoed before the API exists. `matchMockPcsPatients` is the only export the resource
 * layer uses; removing this file and the single call site in `pcs.resource.ts` is the
 * whole clean-up.
 */
import { type PcsPatient, type PcsSearchSubject } from './pcs.types';

const MOCK_PCS_PATIENTS: Array<PcsPatient> = [
  {
    individualId: 'IND-0921',
    name: 'Jane Akinyi Doe',
    gender: 'female',
    birthDate: '1991-04-12',
    village: 'Kambi',
    compoundHead: 'Joseph Doe',
    nationalId: '32145678',
    phoneNumber: '0712345678',
  },
  {
    individualId: 'IND-0934',
    name: 'Jane A. Doe',
    gender: 'female',
    birthDate: '1991-04-12',
    village: 'Mgange',
    compoundHead: 'Joseph Doe',
    nationalId: '32145678',
  },
  {
    individualId: 'IND-1102',
    name: 'Janet Akinyi Odhiambo',
    gender: 'female',
    birthDate: '1990-11-03',
    village: 'Kambi',
    compoundHead: 'Peter Odhiambo',
    nationalId: '30998877',
    phoneNumber: '0720998877',
  },
  {
    individualId: 'IND-1544',
    name: 'John Mwangi Kariuki',
    gender: 'male',
    birthDate: '1985-01-27',
    village: 'Ngerenyi',
    compoundHead: 'Samuel Kariuki',
    nationalId: '24558090',
    phoneNumber: '0733112244',
  },
  {
    individualId: 'IND-1601',
    name: 'John M. Kariuki',
    gender: 'male',
    birthDate: '1985-01-27',
    village: 'Ngerenyi',
    compoundHead: 'Samuel Kariuki',
  },
  {
    individualId: 'IND-2088',
    name: 'Mary Wanjiru Njoroge',
    gender: 'female',
    birthDate: '1978-08-19',
    village: 'Wundanyi',
    compoundHead: 'Daniel Njoroge',
    nationalId: '19887766',
    phoneNumber: '0711223344',
  },
  {
    individualId: 'IND-2431',
    name: 'Ali Hassan Omar',
    gender: 'male',
    birthDate: '2001-06-05',
    village: 'Mbale',
    compoundHead: 'Hassan Omar',
    nationalId: '38771200',
  },
];

const normalize = (value?: string | null) => (value ?? '').toLowerCase().trim();

const nameTokens = (name?: string | null) => normalize(name).split(/\s+/).filter(Boolean);

/** Stable pseudo-random index so the same subject always yields the same fallback rows. */
const hashToIndex = (seed: string, modulo: number) => {
  let hash = 0;
  for (let index = 0; index < seed.length; index++) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 100_000;
  }
  return hash % modulo;
};

/**
 * A record that looks like the selected patient re-entered into PCS. This is what makes
 * the pane demo well — the registrar sees an obvious candidate for consolidation with the
 * match indicators lit up.
 */
const buildLookalikeRecord = (subject: PcsSearchSubject): PcsPatient => {
  const villages = ['Kambi', 'Mgange', 'Ngerenyi', 'Wundanyi', 'Mbale'];
  const tokens = nameTokens(subject.name);
  const family = tokens.length > 1 ? subject.name.split(/\s+/).slice(-1)[0] : subject.name;

  return {
    individualId: `IND-${3000 + hashToIndex(subject.id, 900)}`,
    name: subject.name,
    gender: (normalize(subject.gender) as PcsPatient['gender']) || 'unknown',
    birthDate: subject.birthDate,
    village: villages[hashToIndex(subject.id, villages.length)],
    compoundHead: family ? `${family} (household head)` : undefined,
    nationalId: subject.nationalId ?? undefined,
    phoneNumber: subject.phoneNumber ?? undefined,
  };
};

/**
 * Mimics a demographic search against PCS: every record that could plausibly be this
 * person, most-likely first. Narrowing this list is done locally by `filterPcsPatients`.
 */
export const matchMockPcsPatients = (subject: PcsSearchSubject): Array<PcsPatient> => {
  const lookalike = buildLookalikeRecord(subject);
  const subjectTokens = nameTokens(subject.name);

  const isDemographicMatch = (pcsPatient: PcsPatient) => {
    const sharesName = nameTokens(pcsPatient.name).some((token) => subjectTokens.includes(token));
    const sharesNationalId = Boolean(subject.nationalId) && pcsPatient.nationalId === subject.nationalId;
    const sharesBirthDate = Boolean(subject.birthDate) && pcsPatient.birthDate === subject.birthDate;
    return sharesName || sharesNationalId || sharesBirthDate;
  };

  return [
    lookalike,
    ...MOCK_PCS_PATIENTS.filter(isDemographicMatch),
    ...MOCK_PCS_PATIENTS.filter((pcsPatient) => !isDemographicMatch(pcsPatient)),
  ];
};
