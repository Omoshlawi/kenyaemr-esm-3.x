/**
 * TODO(pbids-api): delete this file once `openmrs-module-pbids` is deployed.
 *
 * Stands in for `GET {restBaseUrl}/pbids-participants` while the module is built but not
 * yet reachable. `searchMockParticipants` takes the very URL the resource layer builds and
 * implements the documented query semantics — AND-combined filters, tiered name matching,
 * digits-only phone comparison, offset paging and a whole-match-set `totalCount` — so the
 * UI meets real behaviour before the API lands. Removing this file and the single call
 * site in `pcs.resource.ts` is the whole clean-up.
 */
import {
  type PcsMatchType,
  type PcsMatchedOn,
  type PcsParticipant,
  type PcsParticipantSearchResponse,
} from '../pcs.types';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const VILLAGES = [
  { code: '901', name: 'TEST ABUYA' },
  { code: '902', name: 'KAMBI' },
  { code: '903', name: 'NGERENYI' },
  { code: '904', name: 'WUNDANYI' },
];

const FAMILY_NAMES = ['ODONGO', 'OTIENO', 'ODHIAMBO', 'KARIUKI', 'NJOROGE', 'WANJALA', 'OMAR', 'MUTISO'];
const MALE_NAMES = ['DENNIS', 'JOHN', 'PETER', 'SAMUEL', 'ALI', 'DANIEL', 'JOSEPH', 'BRIAN'];
const FEMALE_NAMES = ['MARY', 'JANE', 'GRACE', 'FAITH', 'ESTHER', 'ANNE', 'RUTH', 'JOYCE'];
const MIDDLE_NAMES = ['OMONDI', 'AKINYI', 'WANJIRU', 'MWANGI', 'ATIENO', 'HASSAN', 'NEKESA', 'KIPROTICH'];

const pick = <T>(values: Array<T>, seed: number): T => values[seed % values.length];

/** Stable pseudo-random index so the same id always yields the same synthesized record. */
const hashToIndex = (seed: string, modulo: number) => {
  let hash = 0;
  for (let index = 0; index < seed.length; index++) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 100_000;
  }
  return hash % modulo;
};

/**
 * A synthetic cohort large enough that a broad surname query overflows the default 50-row
 * page, which is what makes the "showing N of M" line worth rendering.
 */
function buildCohort(): Array<PcsParticipant> {
  const participants: Array<PcsParticipant> = [];

  VILLAGES.forEach((village, villageIndex) => {
    for (let compoundIndex = 1; compoundIndex <= 5; compoundIndex++) {
      const seed = villageIndex * 5 + compoundIndex;
      const familyName = pick(FAMILY_NAMES, seed);
      const compound = {
        compoundId: `${village.code}-${compoundIndex}`,
        headIndividualId: `${village.code}-${compoundIndex}-1-1`,
        headFirstName: pick(MALE_NAMES, seed + 1),
        headMiddleName: pick(MIDDLE_NAMES, seed + 2),
        headLastName: familyName,
      };

      const mother = {
        individualId: `${village.code}-${compoundIndex}-1-2`,
        firstName: pick(FEMALE_NAMES, seed + 3),
        middleName: pick(MIDDLE_NAMES, seed + 4),
        lastName: familyName,
      };

      for (let memberIndex = 1; memberIndex <= 4; memberIndex++) {
        const memberSeed = seed * 4 + memberIndex;
        const isMale = memberIndex % 2 === 1;
        // The compound head and their spouse have no mother recorded in the source rows.
        const isParent = memberIndex <= 2;

        participants.push({
          individualId: `${village.code}-${compoundIndex}-1-${memberIndex}`,
          firstName: isMale ? pick(MALE_NAMES, memberSeed) : pick(FEMALE_NAMES, memberSeed),
          middleName: pick(MIDDLE_NAMES, memberSeed + 1),
          lastName: familyName,
          sex: isMale ? 'M' : 'F',
          dateOfBirth: `${1968 + (memberSeed % 45)}-${String((memberSeed % 12) + 1).padStart(2, '0')}-${String(
            (memberSeed % 27) + 1,
          ).padStart(2, '0')}`,
          pbidsEnrolled: memberSeed % 3 !== 0,
          cardse: memberSeed % 5 === 0,
          mother: isParent ? null : mother,
          compound,
          village,
          contacts:
            memberSeed % 4 === 0
              ? []
              : [
                  {
                    phone: `07${String(10000000 + memberSeed * 137).slice(0, 8)}`,
                    email: memberSeed % 3 === 0 ? undefined : `contact${memberSeed}@example.org`,
                    nationalId: memberSeed % 2 === 0 ? String(20000000 + memberSeed * 373) : undefined,
                    lastUpdated: '2026-08-20T09:15:00',
                  },
                ],
          matchedOn: null,
          matchType: null,
        });
      }
    }
  });

  return participants;
}

const COHORT = buildCohort();

const normalize = (value?: string | null) => (value ?? '').toUpperCase().replace(/\s+/g, ' ').trim();

const digitsOnly = (value?: string | null) => (value ?? '').replace(/\D/g, '');

/** Kenyan numbers arrive as +254…, 254…, 07… or 7… — the last nine digits are the identity. */
const significantDigits = (value?: string | null) => digitsOnly(value).slice(-9);

function soundex(value: string): string {
  const letters = value.toUpperCase().replace(/[^A-Z]/g, '');
  if (!letters) {
    return '';
  }

  const codes: Record<string, string> = {
    B: '1',
    F: '1',
    P: '1',
    V: '1',
    C: '2',
    G: '2',
    J: '2',
    K: '2',
    Q: '2',
    S: '2',
    X: '2',
    Z: '2',
    D: '3',
    T: '3',
    L: '4',
    M: '5',
    N: '5',
    R: '6',
  };

  let result = letters[0];
  let previousCode = codes[letters[0]] ?? '';

  for (let index = 1; index < letters.length && result.length < 4; index++) {
    const letter = letters[index];
    const code = codes[letter] ?? '';

    if (code && code !== previousCode) {
      result += code;
    }
    if (letter !== 'H' && letter !== 'W') {
      previousCode = code;
    }
  }

  return `${result}000`.slice(0, 4);
}

const soundsLike = (field: string, term: string) => {
  const fieldCodes = new Set(field.split(' ').filter(Boolean).map(soundex));
  return term
    .split(' ')
    .filter(Boolean)
    .some((token) => fieldCodes.has(soundex(token)));
};

const participantName = (participant: PcsParticipant) =>
  normalize([participant.firstName, participant.middleName, participant.lastName].filter(Boolean).join(' '));

const motherName = (participant: PcsParticipant) =>
  participant.mother
    ? normalize(
        [participant.mother.firstName, participant.mother.middleName, participant.mother.lastName]
          .filter(Boolean)
          .join(' '),
      )
    : '';

const compoundName = (participant: PcsParticipant) =>
  normalize(
    [participant.compound.headFirstName, participant.compound.headMiddleName, participant.compound.headLastName]
      .filter(Boolean)
      .join(' '),
  );

interface NameMatch {
  matchType: PcsMatchType;
  matchedOn: PcsMatchedOn;
}

/**
 * Tiers outermost, fields innermost: an EXACT hit on the compound head outranks a CONTAINS
 * on the participant's own name, while at equal confidence the participant's own name wins.
 */
function scoreName(participant: PcsParticipant, term: string, fuzzy: boolean): NameMatch | null {
  const fields: Array<[PcsMatchedOn, string]> = [
    ['name', participantName(participant)],
    ['motherName', motherName(participant)],
    ['compoundName', compoundName(participant)],
  ];

  const tiers: Array<[PcsMatchType, (field: string) => boolean]> = [
    ['EXACT', (field) => field === term],
    ['CONTAINS', (field) => field.includes(term)],
    ['SOUNDEX', (field) => soundsLike(field, term)],
  ];

  for (const [matchType, matches] of tiers) {
    if (matchType === 'SOUNDEX' && !fuzzy) {
      continue;
    }
    for (const [matchedOn, field] of fields) {
      if (field && matches(field)) {
        return { matchType, matchedOn };
      }
    }
  }

  return null;
}

const TIER_ORDER: Record<PcsMatchType, number> = { EXACT: 0, CONTAINS: 1, SOUNDEX: 2 };

/**
 * A participant whose name equals the search term exactly, so the pane always has an EXACT
 * row to show for whoever was just authorized.
 */
function buildLookalike(term: string): PcsParticipant {
  const tokens = term.split(' ').filter(Boolean);
  const village = VILLAGES[term.length % VILLAGES.length];
  const familyName = tokens[tokens.length - 1] ?? 'UNKNOWN';

  return {
    individualId: `${village.code}-9-1-1`,
    firstName: tokens[0] ?? term,
    middleName: tokens.length > 2 ? tokens.slice(1, -1).join(' ') : undefined,
    lastName: tokens.length > 1 ? familyName : '',
    sex: 'F',
    dateOfBirth: '1991-04-12',
    pbidsEnrolled: true,
    cardse: false,
    mother: {
      individualId: `${village.code}-9-1-0`,
      firstName: 'MARGARET',
      middleName: 'ADHIAMBO',
      lastName: familyName,
    },
    compound: {
      compoundId: `${village.code}-9`,
      headIndividualId: `${village.code}-9-1-2`,
      headFirstName: 'JOSEPH',
      headMiddleName: 'OTIENO',
      headLastName: familyName,
    },
    village,
    contacts: [
      { phone: '0712345678', email: 'contact@example.org', nationalId: '12345678', lastUpdated: '2026-08-20T09:15:00' },
    ],
    matchedOn: null,
    matchType: null,
  };
}

/**
 * Answers a by-id lookup. Ids the cohort doesn't hold are synthesized deterministically —
 * including the ones `buildLookalike` invents — so a linked patient always resolves during a
 * demo. `matchedOn`/`matchType` are null: no name was queried, so nothing was scored.
 */
export function getMockParticipantById(individualId: string): PcsParticipant {
  const known = COHORT.find((participant) => participant.individualId === individualId);

  if (known) {
    return { ...known, matchedOn: null, matchType: null };
  }

  const seed = hashToIndex(individualId, 1000);
  const village = VILLAGES[seed % VILLAGES.length];
  const familyName = pick(FAMILY_NAMES, seed);

  return {
    individualId,
    firstName: pick(MALE_NAMES, seed),
    middleName: pick(MIDDLE_NAMES, seed + 1),
    lastName: familyName,
    sex: seed % 2 === 0 ? 'F' : 'M',
    dateOfBirth: `${1970 + (seed % 45)}-0${(seed % 9) + 1}-1${seed % 9}`,
    pbidsEnrolled: true,
    cardse: seed % 3 === 0,
    mother: {
      individualId: `${village.code}-0-0-0`,
      firstName: pick(FEMALE_NAMES, seed + 2),
      middleName: pick(MIDDLE_NAMES, seed + 3),
      lastName: familyName,
    },
    compound: {
      compoundId: `${village.code}-${(seed % 9) + 1}`,
      headIndividualId: `${village.code}-${(seed % 9) + 1}-1-1`,
      headFirstName: pick(MALE_NAMES, seed + 4),
      headMiddleName: pick(MIDDLE_NAMES, seed + 5),
      headLastName: familyName,
    },
    village,
    contacts: [
      {
        phone: `07${String(20000000 + seed * 271).slice(0, 8)}`,
        email: `participant${seed}@example.org`,
        nationalId: String(30000000 + seed * 419),
        lastUpdated: '2026-08-20T09:15:00',
      },
    ],
    matchedOn: null,
    matchType: null,
  };
}

/**
 * Answers the URL the resource layer built, the way the module documents it. Throws for a
 * request with no filter, mirroring the API's `400`.
 */
/**
 * Children for a mother the cohort doesn't hold. The count is derived from the id, so some
 * participants have two dependants, some one and some none — which is what keeps the empty
 * state reachable instead of pretending everyone has children.
 */
function buildDependantsFor(motherId: string): Array<PcsParticipant> {
  const count = hashToIndex(motherId, 3);
  const village = VILLAGES[hashToIndex(motherId, VILLAGES.length)];
  const familyName = pick(FAMILY_NAMES, hashToIndex(motherId, 1000));
  const mother = {
    individualId: motherId,
    firstName: pick(FEMALE_NAMES, hashToIndex(motherId, 1000)),
    middleName: pick(MIDDLE_NAMES, hashToIndex(motherId, 997)),
    lastName: familyName,
  };

  return Array.from({ length: count }, (_, index) => {
    const seed = hashToIndex(`${motherId}-${index}`, 1000);
    const isMale = seed % 2 === 0;

    return {
      individualId: `${motherId}-c${index + 1}`,
      firstName: isMale ? pick(MALE_NAMES, seed) : pick(FEMALE_NAMES, seed),
      middleName: pick(MIDDLE_NAMES, seed + 1),
      lastName: familyName,
      sex: isMale ? 'M' : 'F',
      dateOfBirth: `${2008 + (seed % 15)}-0${(seed % 9) + 1}-1${seed % 9}`,
      pbidsEnrolled: seed % 4 !== 0,
      cardse: seed % 3 === 0,
      mother,
      compound: {
        compoundId: `${village.code}-${(seed % 9) + 1}`,
        headIndividualId: `${village.code}-${(seed % 9) + 1}-1-1`,
        headFirstName: pick(MALE_NAMES, seed + 2),
        headMiddleName: pick(MIDDLE_NAMES, seed + 3),
        headLastName: familyName,
      },
      village,
      contacts: [],
      matchedOn: null,
      matchType: null,
    } as PcsParticipant;
  });
}

/**
 * Stands in for the temporary-ID endpoint, which generates and assigns the identifier
 * server-side. Derived from the patient uuid so a repeat call is stable.
 */
export function getMockTemporaryStudyId(patientUuid: string): string {
  return `TMP-${String(100000 + hashToIndex(patientUuid, 899999))}`;
}

export function searchMockParticipants(url: string): PcsParticipantSearchResponse {
  const query = new URLSearchParams(url.slice(url.indexOf('?') + 1));

  const nameTerm = normalize(query.get('name'));
  const villageTerm = normalize(query.get('village'));
  const phoneTerm = significantDigits(query.get('phone'));
  const motherId = (query.get('motherId') ?? '').trim();
  const fuzzy = query.get('fuzzy') !== 'false';
  const startIndex = Number(query.get('startIndex') ?? 0) || 0;
  const limit = Math.min(Number(query.get('limit') ?? DEFAULT_LIMIT) || DEFAULT_LIMIT, MAX_LIMIT);

  if (!nameTerm && !villageTerm && !phoneTerm && !motherId) {
    throw new Error('At least one of name, village, phone or motherId must be supplied');
  }

  const cohortChildren = motherId ? COHORT.filter((participant) => participant.mother?.individualId === motherId) : [];
  const pool = motherId
    ? cohortChildren.length > 0
      ? cohortChildren
      : buildDependantsFor(motherId)
    : nameTerm
    ? [buildLookalike(nameTerm), ...COHORT]
    : COHORT;

  const matched = pool
    .map((participant) => {
      if (villageTerm && !normalize(participant.village.name).includes(villageTerm)) {
        return null;
      }
      if (phoneTerm && !participant.contacts.some((contact) => significantDigits(contact.phone) === phoneTerm)) {
        return null;
      }
      if (motherId && participant.mother?.individualId !== motherId) {
        return null;
      }
      if (!nameTerm) {
        // Nothing was scored, so there is no match to describe.
        return { ...participant, matchedOn: null, matchType: null };
      }

      const nameMatch = scoreName(participant, nameTerm, fuzzy);
      return nameMatch ? { ...participant, ...nameMatch } : null;
    })
    .filter((participant): participant is PcsParticipant => participant !== null)
    .sort((a, b) => (a.matchType ? TIER_ORDER[a.matchType] : 0) - (b.matchType ? TIER_ORDER[b.matchType] : 0));

  return {
    totalCount: matched.length,
    startIndex,
    results: matched.slice(startIndex, startIndex + limit),
  };
}
