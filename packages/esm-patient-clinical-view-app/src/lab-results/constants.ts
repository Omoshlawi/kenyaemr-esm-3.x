export const MALARIA_RESULT_CONCEPTS = {
  BLOOD_SMEAR: 'b6cb864b-a240-4b6a-bba4-1f17c7b7ae8d',
  RAPID_TEST: '1643AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  SPECIES: '1c98a484-dee7-4073-b4b4-85c7a2df8007',
  PLASMODIUM_SPECIES: '1fe0ac90-80db-4d50-bcb8-f145836ae59a',
  STAGING: '04d87948-2087-493c-b0e2-2b3cf19c2d46',
  PARASITE_COUNT: 'e07ed6eb-356d-4a42-9e33-3151c6ff84e2',
  POSITIVE: '703AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  NEGATIVE: '664AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  INVALID: '163611AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
} as const;

export const MALARIA_SPECIES = [
  {
    uuid: 'b82a629a-8a85-45f0-8957-713635c36a56',
    display: 'Plasmodium falciparum',
  },
  {
    uuid: '3aff5db7-3605-4728-a2d6-074d4cce388b',
    display: 'Plasmodium malariae',
  },
  {
    uuid: 'f29f9024-de53-4712-ae8f-4df8af6dc288',
    display: 'Plasmodium vivax',
  },
  {
    uuid: '01247a1f-e9d5-470e-ba95-04efd9165115',
    display: 'Plasmodium ovale',
  },
  {
    uuid: 'e66415bc-7121-4aca-aa1b-8cd4608ca2ed',
    display: 'Plasmodium falciparum +  Plasmodium  malariae.',
  },
  {
    uuid: 'b8a8cabc-7288-49fc-a193-cd9c9796926b',
    display: 'Plasmodium falciparum + Plasmodium ovale',
  },
  {
    uuid: '27095e7e-9267-4272-9c22-6aafa3bd5410',
    display: 'Plasmodium falciparum + Plasmodium vivax',
  },
  {
    uuid: '23e891f4-52cd-4e93-9a68-4699ec981a83',
    display: 'Plasmodium falciparum + Plasmodium malariae + Plasmodium ovale',
  },
  {
    uuid: '5622AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Other',
  },
];

export const MALARIA_STAGING = [
  {
    uuid: '1eacaf8d-8548-469e-a0db-8fc96d0b9bb9',
    display: 'Schizonts',
  },
  {
    uuid: '719AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    display: 'Trophozoites',
  },
  {
    uuid: 'b209cd47-4561-4949-b8eb-af0095c7a495',
    display: 'Gametocytes',
  },
];
