/**
 * Expected OpenMRS obs value shape per concept, derived from
 * Haemodialysis Flow Chart test (v1.2) questionOptions.rendering.
 *
 * - numeric → JSON number
 * - text    → JSON string
 * - coded   → answer concept as { uuid: "..." } object reference
 */
export type ConceptObsValueKind = 'numeric' | 'text' | 'coded';

export const CONCEPT_OBS_VALUE_KIND: Record<string, ConceptObsValueKind> = {
  // Pre-dialysis
  '5089AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'numeric',
  '480ea417-eab0-4207-9840-a1e18cd9fefe': 'numeric',
  '8f372692-bd3f-4f16-8da3-ff7e048fd596': 'numeric',
  '163554AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'numeric',
  '1342AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'numeric',
  '008bf719-6c0d-4a61-b5eb-d8bb7da058f9': 'text',
  '5087AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'numeric',
  '5088AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'numeric',
  '5242AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'numeric',
  '5092AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'numeric',
  'd0d107f7-9452-4129-a209-b9a4d1b46d4a': 'numeric',
  '9d9ff771-a282-4132-88bc-fd06c3c97a2c': 'coded',
  '4802a063-38e8-4b20-87dd-46a92dc91656': 'text',
  'ade394a7-402f-48ff-8f8d-0e6b818ba9a3': 'text',
  '6123f967-0f40-48a2-a6a9-dd5b399df71c': 'coded',
  'fccbed61-831e-4e17-a650-413e0e542891': 'text',
  '7f754fb4-8ed0-4a72-9f99-559e139f3da7': 'coded',
  'c3ba172e-df53-4387-9ede-9c05ec21010c': 'text',
  'bc9ba25b-d4c7-419f-9823-62122709c8c9': 'numeric',
  'b82c6ff6-6009-4194-bfab-95d6922ac51c': 'numeric',
  '69c35549-0c8d-4390-9a24-447c1a360e3f': 'coded',
  '1401AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'coded',
  '1325AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'coded',
  '6ec3d456-ba0c-4df1-9254-4dd77037ffb8': 'coded',
  '06ad8fe0-9bc9-4074-95bc-f8052051c37a': 'coded',
  'b1998b10-c0a0-4601-ad96-76b68a3f477a': 'text',
  // Ampath form rendering is text; OpenMRS server datatype is Numeric — send JSON numbers.
  'a34213be-b50a-46d6-810c-d71cf7727792': 'numeric',
  '166691AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'text',
  // Prescription
  '31d46c3f-7846-4fa5-9923-ffa1db15388e': 'coded',
  'fe901d83-a2d1-4845-b5ca-0b0810b76c1b': 'coded',
  '160632AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'text',
  'c1befdd0-7821-46e4-b178-9366a9508765': 'coded',
  'c7c848bf-8220-4c91-b16b-930a07a36695': 'numeric',
  'fd9f82fd-f327-4502-ac8e-5d9144dbd504': 'numeric',
  '9705f7da-669a-476e-bad6-9686d66bfc4c': 'numeric',
  'd6f9f221-9f25-4edc-af41-a6ff8641c4b7': 'numeric',
  'f7572a5a-5e88-40ec-8bff-91d967f488f0': 'numeric',
  'd7f01f09-1e8b-4129-bdf6-dbae6e9aa69c': 'text',
  '2c480d75-ee84-4831-ac28-744bcea98c54': 'numeric',
  '19cd9e4a-49e2-4553-8a4f-bacb0f880db6': 'numeric',
  '162603AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'numeric',
  'e4b8e6eb-7b37-4f39-bd69-304938f71abb': 'numeric',
  '753914e0-2ba4-4973-b594-98fbd37b6d53': 'numeric',
  '5f721302-e1d2-4ba2-9b23-e64bc7bfa216': 'coded',
  // Post-dialysis / summary
  '162661AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'numeric',
  '5085AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'numeric',
  '5086AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'numeric',
  '163381AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'numeric',
  '8542c14f-5099-4ea6-acce-1c67c294b49a': 'numeric',
  '8828eed5-ceac-48ee-ac45-751f7e21bd5c': 'text',
  'e6931b7a-8396-4003-ad9c-ebaaef04099f': 'text',
  'b8734463-8a64-4e43-abc9-c8617c6f0b42': 'numeric',
  '222f098f-f00a-4d87-ad07-736ddddce2a8': 'numeric',
  '3978f969-48d6-4e5f-b224-909349bf72e3': 'numeric',
  '162725AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'text',
  '1443AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'text',
  '1586AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'text',
  '162579AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'text',
  'c42d8e95-3a52-48e4-b65c-44b648b9c321': 'coded',
  'f45af7cf-051a-4fc7-9902-f75654aea6fe': 'coded',
  '1111fedc-77e3-4220-994f-3267b0651446': 'text',
  '160716AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'text',
  '63e3266b-6333-4ee5-8229-8685a391cfa7': 'numeric',
  '8035d3d1-00f4-4feb-a8be-f7bb76d27de5': 'text',
  '9fdee776-981d-496f-891d-9752a3916058': 'text',
  // Visit Diagnoses obs group (Core REST)
  '159947AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'coded',
  '1284AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'coded',
  '159394AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'coded',
  '159393AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'coded',
  '159946AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'coded',
  '159943AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'coded',
};

export const getConceptObsValueKind = (conceptUuid: string): ConceptObsValueKind | undefined =>
  CONCEPT_OBS_VALUE_KIND[conceptUuid];
