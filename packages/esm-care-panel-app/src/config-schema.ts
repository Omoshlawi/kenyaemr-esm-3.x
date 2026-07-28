import { Type } from '@openmrs/esm-framework';

type FormTag = 'enrollment' | 'initial' | 'bound-to-current-visit' | 'discontinuation';

export interface CarePanelConfig {
  regimenObs: {
    encounterProviderRoleUuid: string;
  };
  hivProgramUuid: string;
  dispensingVitalsConcepts: Array<{
    uuid: string;
    display: string;
  }>;
  careProgramForms: Array<{
    programName: string;
    programUuid: string;
    forms: Array<{
      formName: string;
      formTranslationKey?: string;
      formUuId: string;
      dependancies: string[];
      tags: Array<FormTag>;
    }>;
  }>;
  peerEducatorRelationshipType: string;
  peerCalendarOutreactForm: string;
  hideFilledProgramForm: boolean;
  excludedCarePrograms: string[];
}

export const configSchema = {
  regimenObs: {
    encounterProviderRoleUuid: {
      _type: Type.UUID,
      _default: 'a0b03050-c99b-11e0-9572-0800200c9a66',
      _description: "The provider role to use for the regimen encounter. Default is 'Unkown'.",
    },
  },
  hivProgramUuid: {
    _type: Type.String,
    _description: 'HIV Program UUID',
    _default: 'dfdc6d40-2f2f-463d-ba90-cc97350441a8',
  },
  dispensingVitalsConcepts: {
    _type: Type.Array,
    _description: 'Uuids of patient vitals concept required for dispensing',
    _default: [
      {
        display: 'Weight (Kg)',
        uuid: '5089AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      },
    ],
  },
  peerEducatorRelationshipType: {
    _type: Type.UUID,
    _description: 'Case Manager/Client Relationship type Uuid',
    _default: '9065e3c6-b2f5-4f99-9cbf-f67fd9f82ec5',
  },
  peerCalendarOutreactForm: {
    _type: Type.UUID,
    _description: 'Peer Calendar Outreach form UUID',
    _default: '7492cffe-5874-4144-a1e6-c9e455472a35',
  },
  hideFilledProgramForm: {
    _type: Type.Boolean,
    _description: 'Hide already filled program forms in care panel',
    _default: true,
  },
  careProgramForms: {
    _type: Type.Array,
    _description: 'Programs forms mapping with dependancy configuration',
    _default: [
      {
        programName: 'VMMC',
        programUuid: '228538f4-cad9-476b-84c3-ab0086150bcc',
        forms: [
          {
            formName: 'VMMC Enrollment',
            formTranslationKey: 'vmmcEnrollment',
            formUuId: 'a74e3e4a-9e2a-41fb-8e64-4ba8a71ff984',
            dependancies: [],
            tags: ['enrollment'],
          },
          {
            formName: 'VMMC Initial',
            formTranslationKey: 'vmmcInitial',
            formUuId: '8afcaac3-e9db-4501-bff6-b6a41935b46e',
            dependancies: ['a74e3e4a-9e2a-41fb-8e64-4ba8a71ff984'],
            tags: ['initial'],
          },
          {
            formName: 'VMMC Client Follow-Up',
            formTranslationKey: 'vmmcClientFollowUp',
            formUuId: '08873f91-7161-4f90-931d-65b131f2b12b',
            dependancies: ['8afcaac3-e9db-4501-bff6-b6a41935b46e'],
            tags: ['bound-to-current-visit'],
          },
          {
            formName: 'VMMC Circumcision Procedure',
            formTranslationKey: 'vmmcCircumcisionProcedure',
            formUuId: '5ee93f48-960b-11ec-b909-0242ac120002',
            dependancies: ['8afcaac3-e9db-4501-bff6-b6a41935b46e'],
            tags: [],
          },
          {
            formName: 'VMMC Immediate Post-Operation Assessment',
            formTranslationKey: 'vmmcImmediatePostOperationAssessment',
            formUuId: '620b3404-9ae5-11ec-b909-0242ac120002',
            dependancies: ['8afcaac3-e9db-4501-bff6-b6a41935b46e'],
            tags: ['bound-to-current-visit'],
          },
          {
            formName: 'VMMC Medical Examination',
            formTranslationKey: 'vmmcMedicalExamination',
            formUuId: 'd42aeb3d-d5d2-4338-a154-f75ddac78b59',
            dependancies: ['8afcaac3-e9db-4501-bff6-b6a41935b46e'],
            tags: ['bound-to-current-visit'],
          },
          {
            formName: 'VMMC Discontinuation',
            formTranslationKey: 'vmmcDiscontinuation',
            formUuId: 'bc6a9e7d-58f7-43c0-8334-d8011fef4000',
            dependancies: ['8afcaac3-e9db-4501-bff6-b6a41935b46e'],
            tags: ['discontinuation'],
          },
        ],
      },
      {
        programName: 'CPM',
        programUuid: '8cd42506-2ebd-485f-89d6-4bb9ed328ccc',
        forms: [
          {
            formName: 'CPM Enrollment',
            formTranslationKey: 'cpmEnrollment',
            formUuId: 'f01c67f7-2293-4a6a-b0f6-5db0fb5934dd',
            dependancies: [],
            tags: ['enrollment'],
          },
          {
            formName: 'CPM Initial',
            formTranslationKey: 'cpmInitial',
            formUuId: 'bf55e6ad-096d-4223-a2bb-2aa3e3495af2',
            dependancies: ['f01c67f7-2293-4a6a-b0f6-5db0fb5934dd'],
            tags: ['initial'],
          },
          {
            formName: 'CPM Referral',
            formTranslationKey: 'cpmReferral',
            formUuId: 'b1e1f6fe-1894-4d06-bd8c-2b87f7cd9577',
            dependancies: ['bf55e6ad-096d-4223-a2bb-2aa3e3495af2'],
            tags: ['bound-to-current-visit'],
          },
          {
            formName: 'CPM Screening',
            formTranslationKey: 'cpmScreening',
            formUuId: 'f7dbe6b6-2a5a-46e6-af52-45bf2962f4aa',
            dependancies: ['bf55e6ad-096d-4223-a2bb-2aa3e3495af2'],
            tags: ['bound-to-current-visit'],
          },
          {
            formName: 'CPM Discontinuation',
            formTranslationKey: 'cpmDiscontinuation',
            formUuId: 'd1e7ebb4-afc0-412b-a98b-6720ab1169cc',
            dependancies: ['bf55e6ad-096d-4223-a2bb-2aa3e3495af2'],
            tags: ['discontinuation'],
          },
        ],
      },
      {
        programName: 'PNC',
        programUuid: '286598d5-1886-4f0d-9e5f-fa5473399cee',
        forms: [
          {
            formName: 'PNC Enrollment',
            formTranslationKey: 'pncEnrollment',
            formUuId: '286598d5-1886-4f0d-9e5f-fa5473399cee',
            dependancies: [],
            tags: ['enrollment'],
          },
          {
            formName: 'MCH PNC Visit',
            formTranslationKey: 'mchPncVisit',
            formUuId: '72aa78e0-ee4b-47c3-9073-26f3b9ecc4a7',
            dependancies: ['286598d5-1886-4f0d-9e5f-fa5473399cee'],
            tags: ['bound-to-current-visit'],
          },
          {
            formName: 'PNC Discontinuation',
            formTranslationKey: 'pncDiscontinuation',
            formUuId: '30db888b-d6d3-47fb-b0c9-dbdf10a57ff5',
            dependancies: ['286598d5-1886-4f0d-9e5f-fa5473399cee'],
            tags: ['discontinuation'],
          },
        ],
      },
      {
        programName: 'ANC',
        programUuid: '72635673-0613-4259-916e-e0d5d5ef8f66',
        forms: [
          {
            formName: 'ANC Enrollment',
            formTranslationKey: 'ancEnrollment',
            formUuId: 'b287050b-f9a5-4929-96b0-31ac602384e1',
            dependancies: [],
            tags: ['enrollment'],
          },
          {
            formName: 'MCH Antenatal Visit',
            formTranslationKey: 'mchAntenatalVisit',
            formUuId: 'e8f98494-af35-4bb8-9fc7-c409c8fed843',
            dependancies: ['b287050b-f9a5-4929-96b0-31ac602384e1'],
            tags: ['initial'],
          },
          {
            formName: 'ANC Follow Up form',
            formTranslationKey: 'ancFollowUpForm',
            formUuId: '6fb1a39b-0a57-4239-afd7-a5490d281cb9',
            dependancies: ['b287050b-f9a5-4929-96b0-31ac602384e1', 'e8f98494-af35-4bb8-9fc7-c409c8fed843'],
            tags: ['bound-to-current-visit'],
          },
          {
            formName: 'ANC Discontinuation',
            formTranslationKey: 'ancDiscontinuation',
            formUuId: '38885518-c71a-4661-8edf-3db67707e1d1',
            dependancies: ['b287050b-f9a5-4929-96b0-31ac602384e1', 'e8f98494-af35-4bb8-9fc7-c409c8fed843'],
            tags: ['discontinuation'],
          },
        ],
      },
      {
        programName: 'MCH - Child Services', // cwc
        programUuid: 'c2ecdf11-97cd-432a-a971-cfd9bd296b83',
        forms: [
          {
            formName: 'CWC Enrolment',
            formTranslationKey: 'cwcEnrolment',
            formUuId: '8553d869-bdc8-4287-8505-910c7c998aff',
            dependancies: [],
            tags: ['enrollment'],
          }, // mch child enrollment
          {
            formName: 'Initial CWC',
            formTranslationKey: 'cwcInitial',
            formUuId: '755b59e6-acbb-4853-abaf-be302039f902',
            dependancies: ['8553d869-bdc8-4287-8505-910c7c998aff'],
            tags: [],
          }, // CWC Initial
          {
            formName: 'CWC Followup',
            formTranslationKey: 'cwcFollowup',
            formUuId: 'b585607e-2d6c-4e62-bf43-307cdc34a6d9',
            dependancies: ['755b59e6-acbb-4853-abaf-be302039f902'],
            tags: ['bound-to-current-visit'],
          }, // CWC followup
          {
            formName: 'CWC Discontinuation',
            formTranslationKey: 'cwcDiscontinuation',
            formUuId: '1dd02c43-904b-4206-8378-7b1a8414c326',
            dependancies: ['8553d869-bdc8-4287-8505-910c7c998aff'],
            tags: ['discontinuation'],
          },
        ],
      },
      {
        programName: 'Nutrition',
        programUuid: '504f179b-4a13-4790-9ecd-ca4963448af8',
        forms: [
          {
            formName: 'Nutrition Enrollment',
            formTranslationKey: 'nutritionEnrollment',
            formUuId: '849e88cc-6a78-463a-a4d2-e4e8c2f795bc',
            dependancies: [],
            tags: ['enrollment'],
          },
          {
            formName: 'Nutrition form',
            formTranslationKey: 'nutritionForm',
            formUuId: 'b8357314-0f6a-4fc9-a5b7-339f47095d62',
            dependancies: ['849e88cc-6a78-463a-a4d2-e4e8c2f795bc'],
            tags: [],
          },
          {
            formName: 'Nutrition Discontinuation',
            formTranslationKey: 'nutritionDiscontinuation',
            formUuId: '0648a046-f404-4246-806f-c9ee78232d6d',
            dependancies: ['849e88cc-6a78-463a-a4d2-e4e8c2f795bc'],
            tags: ['discontinuation'],
          },
        ],
      },
      {
        programName: 'Family Planning',
        programUuid: '191269d2-9973-4958-9936-f687ed771050',
        forms: [
          {
            formName: 'Family Planning Enrollment',
            formTranslationKey: 'familyPlanningEnrollment',
            formUuId: '5a07d260-77d7-477d-8ae5-f5bc2fb4a1e5',
            dependancies: [],
            tags: ['enrollment'],
          },
          {
            formName: 'Family Planning Form',
            formTranslationKey: 'familyPlanningForm',
            formUuId: 'a52c57d4-110f-4879-82ae-907b0d90add6',
            dependancies: ['5a07d260-77d7-477d-8ae5-f5bc2fb4a1e5'],
            tags: ['bound-to-current-visit'],
          },
          {
            formName: 'Family Planning Discontinuation',
            formTranslationKey: 'familyPlanningDiscontinuation',
            formUuId: 'efc782ea-9a16-4791-824a-18be7417eda4',
            dependancies: ['5a07d260-77d7-477d-8ae5-f5bc2fb4a1e5'],
            tags: ['discontinuation'],
          },
        ],
      },
      {
        programName: 'TB',
        programUuid: '9f144a34-3a4a-44a9-8486-6b7af6cc64f6',
        forms: [
          {
            formName: 'TB Enrollment',
            formTranslationKey: 'tbEnrollment',
            formUuId: '6a4f7090-f496-46d2-b582-5ac7e71a16e4',
            dependancies: [],
            tags: ['enrollment'],
          },
          {
            formName: 'TB Initial',
            formTranslationKey: 'tbInitial',
            formUuId: '89994550-9939-40f3-afa6-173bce445c79',
            dependancies: ['6a4f7090-f496-46d2-b582-5ac7e71a16e4'],
            tags: ['initial'],
          },
          {
            formName: 'TB FollowUp',
            formTranslationKey: 'tbFollowUp',
            formUuId: '2daabb77-7ad6-4952-864b-8d23e109c69d',
            dependancies: ['89994550-9939-40f3-afa6-173bce445c79'],
            tags: ['bound-to-current-visit'],
          },
          {
            formName: 'TB Discontinuation',
            formTranslationKey: 'tbDiscontinuation',
            formUuId: '4b296dd0-f6be-4007-9eb8-d0fd4e94fb3a',
            dependancies: ['89994550-9939-40f3-afa6-173bce445c79'],
            tags: ['discontinuation'],
          },
        ],
      },
      {
        programName: 'Violence screening',
        programUuid: 'e41c3d74-37c7-4001-9f19-ef9e35224b70',
        forms: [
          {
            formName: 'Violence enrollment',
            formTranslationKey: 'violenceEnrollment',
            formUuId: 'e182d25f-d824-4cc7-8e0c-188519c300aa',
            dependancies: [],
            tags: ['enrollment'],
          },
          {
            formName: 'Violence Screening',
            formTranslationKey: 'violenceScreening',
            formUuId: '03767614-1384-4ce3-aea9-27e2f4e67d01',
            dependancies: ['e182d25f-d824-4cc7-8e0c-188519c300aa'],
            tags: [],
          },
          {
            formName: 'Violence Initial Form',
            formTranslationKey: 'violenceInitialForm',
            formUuId: '9ba1d4aa-57d7-48f9-a635-a23508e8136c',
            dependancies: ['03767614-1384-4ce3-aea9-27e2f4e67d01'],
            tags: ['initial'],
          },
          {
            formName: 'Violence Consent Form',
            formTranslationKey: 'violenceConsentForm',
            formUuId: 'd720a8b3-52cc-41e2-9a75-3fd0d67744e5',
            dependancies: ['9ba1d4aa-57d7-48f9-a635-a23508e8136c'],
            tags: ['bound-to-current-visit'],
          },

          {
            formName: 'Sexual Violence post rape care 363A',
            formTranslationKey: 'sexualViolencePostRapeCare363A',
            formUuId: 'c46aa4fd-8a5a-4675-90a7-a6f2119f61d8',
            dependancies: ['9ba1d4aa-57d7-48f9-a635-a23508e8136c'],
            tags: ['bound-to-current-visit'],
          }, // PRC Form Part A
          {
            formName: 'Sexual Violence PRC Psychological Assessment 363B',
            formTranslationKey: 'sexualViolencePrcPsychologicalAssessment363B',
            formUuId: '9d21275a-7657-433a-b305-a736423cc496',
            dependancies: ['9ba1d4aa-57d7-48f9-a635-a23508e8136c'],
            tags: ['bound-to-current-visit'],
          }, // PRC Form Part B
          {
            formName: 'Physical and Emotional Violence Form',
            formTranslationKey: 'physicalAndEmotionalViolenceForm',
            formUuId: 'a0943862-f0fe-483d-9f11-44f62abae063',
            dependancies: ['9ba1d4aa-57d7-48f9-a635-a23508e8136c'],
            tags: ['bound-to-current-visit'],
          },
          {
            formName: 'Violence Trauma Counselling',
            formTranslationKey: 'violenceTraumaCounselling',
            formUuId: 'e983d758-5adf-4917-8172-0f4be4d8116a',
            dependancies: ['9ba1d4aa-57d7-48f9-a635-a23508e8136c'],
            tags: ['bound-to-current-visit'],
          },
          {
            formName: 'Violence Reporting Form',
            formTranslationKey: 'violenceReportingForm',
            formUuId: '10cd2ca0-8d25-4876-b97c-b568a912957e',
            dependancies: ['9ba1d4aa-57d7-48f9-a635-a23508e8136c'],
            tags: ['bound-to-current-visit'],
          },
          {
            formName: 'Violence Community Linkage Form',
            formTranslationKey: 'violenceCommunityLinkageForm',
            formUuId: 'f760e38c-3d2f-4a5d-aa3d-e9682576efa8',
            dependancies: ['9ba1d4aa-57d7-48f9-a635-a23508e8136c'],
            tags: ['bound-to-current-visit'],
          },
          {
            formName: 'Violence Legal Form',
            formTranslationKey: 'violenceLegalForm',
            formUuId: 'd0c36426-4503-4236-ab5d-39bff77f2b50',
            dependancies: ['9ba1d4aa-57d7-48f9-a635-a23508e8136c'],
            tags: ['bound-to-current-visit'],
          },
          {
            formName: 'Violence Perpetrator Details',
            formTranslationKey: 'violencePerpetratorDetails',
            formUuId: 'f37d7e0e-95e8-430d-96a3-8e22664f74d6',
            dependancies: ['9ba1d4aa-57d7-48f9-a635-a23508e8136c'],
            tags: ['bound-to-current-visit'],
          },
          {
            formName: 'PEP FOLLOWUP Form',
            formTranslationKey: 'pepFollowupForm',
            formUuId: '155ccbe2-a33f-4a58-8ce6-57a7372071ee',
            dependancies: ['9ba1d4aa-57d7-48f9-a635-a23508e8136c'],
            tags: ['bound-to-current-visit'],
          },
          {
            formName: 'Violence Discontinuation Form',
            formTranslationKey: 'violenceDiscontinuationForm',
            formUuId: '8fed3d06-f8a1-4cb8-b853-cd93394bab79',
            dependancies: ['9ba1d4aa-57d7-48f9-a635-a23508e8136c'],
            tags: ['discontinuation'],
          },
        ],
      },
      {
        programName: 'TPT',
        programUuid: '335517a1-04bc-438b-9843-1ba49fb7fcd9',
        forms: [
          {
            formName: 'TPT Initiation',
            formTranslationKey: 'tptInitiation',
            formUuId: '9d75d6c7-2db8-44ba-8068-f1b3601a1cb9',
            dependancies: [],
            tags: ['enrollment'],
          },
          {
            formName: 'TPT Initial',
            formTranslationKey: 'tptInitial',
            formUuId: '61ea2a72-b0f9-47cf-ae86-443f88656acc',
            dependancies: ['9d75d6c7-2db8-44ba-8068-f1b3601a1cb9'],
            tags: ['initial'],
          },
          {
            formName: 'TPT FollowUp',
            formTranslationKey: 'tptFollowUp',
            formUuId: '9d0e4be8-ab72-4394-8df7-b509b9d45179',
            dependancies: ['61ea2a72-b0f9-47cf-ae86-443f88656acc'],
            tags: ['bound-to-current-visit'],
          },
          {
            formName: 'TPT Outcome/Discontinuation',
            formTranslationKey: 'tptOutcomeDiscontinuation',
            formUuId: '5bdd3b65-8b7b-46a0-9f7b-dfe764143848',
            dependancies: ['61ea2a72-b0f9-47cf-ae86-443f88656acc'],
            tags: ['discontinuation'],
          },
        ],
      },
      {
        programName: 'PrEP',
        programUuid: '214cad1c-bb62-4d8e-b927-810a046daf62',
        forms: [
          {
            formName: 'PrEP Enrollment',
            formTranslationKey: 'prepEnrollment',
            formUuId: 'd63eb2ee-d5e8-4ea4-b5ea-ea3670af03ac',
            dependancies: [],
            tags: ['enrollment'],
          },
          {
            formName: 'PrEP Initiation',
            formTranslationKey: 'prepInitiation',
            formUuId: 'd5ca78be-654e-4d23-836e-a934739be555',
            dependancies: ['d63eb2ee-d5e8-4ea4-b5ea-ea3670af03ac'],
            tags: ['initial'],
          },
          {
            formName: 'PrEP Clinical Form',
            formTranslationKey: 'prepClinicalForm',
            formUuId: '1bfb09fc-56d7-4108-bd59-b2765fd312b8',
            dependancies: ['d5ca78be-654e-4d23-836e-a934739be555'],
            tags: ['bound-to-current-visit'],
          },
          {
            formName: 'PrEP Discontinuation',
            formTranslationKey: 'prepDiscontinuation',
            formUuId: '467c4cc3-25eb-4330-9cf6-e41b9b14cc10',
            dependancies: ['1bfb09fc-56d7-4108-bd59-b2765fd312b8'],
            tags: ['discontinuation'],
          },
        ],
      },
      {
        programName: 'NCD',
        programUuid: 'ffee43c4-9ccd-4e55-8a70-93194e7fafc6',
        forms: [
          {
            formName: 'NCD Enrollment',
            formTranslationKey: 'ncdEnrollment',
            formUuId: 'fca1aad8-aa0d-4027-b10d-a26079f1f20e',
            dependancies: [],
            tags: ['enrollment'],
          },
          {
            formName: 'NCD Initial',
            formTranslationKey: 'ncdInitial',
            formUuId: 'c4994dd7-f2b6-4c28-bdc7-8b1d9d2a6a97',
            dependancies: ['fca1aad8-aa0d-4027-b10d-a26079f1f20e'],
            tags: ['initial'],
          },
          {
            formName: 'NCD Follow Up',
            formTranslationKey: 'ncdFollowUp',
            formUuId: '3e1057da-f130-44d9-b2bb-53e039b953c6',
            dependancies: ['c4994dd7-f2b6-4c28-bdc7-8b1d9d2a6a97'],
            tags: ['bound-to-current-visit'],
          },
          {
            formName: 'NCD Discontinuation',
            formTranslationKey: 'ncdDiscontinuation',
            formUuId: '63182d28-a23f-4d14-b48e-38077bbd8ed2',
            dependancies: ['c4994dd7-f2b6-4c28-bdc7-8b1d9d2a6a97'],
            tags: ['discontinuation'],
          },
        ],
      },
      {
        programName: 'KVP',
        programUuid: '7447305a-18a7-11e9-ab14-d663bd873d93',
        forms: [
          {
            formName: 'KVP Enrollment Form',
            formTranslationKey: 'kvpEnrollmentForm',
            formUuId: 'ead9e306-f1e5-4ed8-aa7d-be9a55309b3c',
            dependancies: [],
            tags: ['enrollment'],
          },
          {
            formName: 'KVP Contact Form',
            formTranslationKey: 'kvpContactForm',
            formUuId: '185dec84-df6f-4fc7-a370-15aa8be531ec',
            dependancies: ['ead9e306-f1e5-4ed8-aa7d-be9a55309b3c'],
            tags: ['initial'],
          },
          {
            formName: 'KVP Clinical Enrollment',
            formTranslationKey: 'kvpClinicalEnrollment',
            formUuId: 'c7f47cea-207b-11e9-ab14-d663bd873d93',
            dependancies: ['185dec84-df6f-4fc7-a370-15aa8be531ec'],
            tags: [],
          },
          {
            formName: 'KVP Peer Educator Outreach Calendar',
            formTranslationKey: 'kvpPeerEducatorOutreachCalendar',
            formUuId: '7492cffe-5874-4144-a1e6-c9e455472a35',
            dependancies: ['185dec84-df6f-4fc7-a370-15aa8be531ec'],
            tags: ['185dec84-df6f-4fc7-a370-15aa8be531ec', 'c7f47cea-207b-11e9-ab14-d663bd873d93'],
          },
          {
            formName: 'KVP Clinical Encounter form',
            formTranslationKey: 'kvpClinicalEncounterForm',
            formUuId: '92e041ac-9686-11e9-bc42-526af7764f64',
            dependancies: ['185dec84-df6f-4fc7-a370-15aa8be531ec', 'c7f47cea-207b-11e9-ab14-d663bd873d93'],
            tags: ['bound-to-current-visit'],
          },
          {
            formName: 'KVP Client Discontinuation',
            formTranslationKey: 'kvpClientDiscontinuation',
            formUuId: '1f76643e-2495-11e9-ab14-d663bd873d93',
            dependancies: ['185dec84-df6f-4fc7-a370-15aa8be531ec', 'c7f47cea-207b-11e9-ab14-d663bd873d93'],
            tags: ['discontinuation'],
          },
        ],
      },
      {
        programName: 'HIV Program',
        programUuid: 'dfdc6d40-2f2f-463d-ba90-cc97350441a8',
        forms: [
          {
            formName: 'HIV Enrollment',
            formTranslationKey: 'hivEnrollment',
            formUuId: '592fd92c-35f6-4dd8-8f0d-a401c1e5b2e2',
            dependancies: [],
            tags: ['enrollment'],
          },
          {
            formName: 'HIV Initial form',
            formTranslationKey: 'hivInitialForm',
            formUuId: 'e4b506c1-7379-42b6-a374-284469cba8da',
            dependancies: ['592fd92c-35f6-4dd8-8f0d-a401c1e5b2e2'],
            tags: [],
          },
          {
            formName: 'ART Readyness',
            formTranslationKey: 'artReadiness',
            formUuId: '782a4263-3ac9-4ce8-b316-534571233f12',
            dependancies: ['e4b506c1-7379-42b6-a374-284469cba8da'],
            tags: [],
          }, // USING ART prepairation form (closest to readiness)
          {
            formName: 'HIV Green Card',
            formTranslationKey: 'hivGreenCard',
            formUuId: '22c68f86-bbf0-49ba-b2d1-23fa7ccf0259',
            dependancies: ['e4b506c1-7379-42b6-a374-284469cba8da'],
            tags: ['bound-to-current-visit'],
          },
          {
            formName: 'HIV Discontinuation',
            formTranslationKey: 'hivDiscontinuation',
            formUuId: 'e3237ede-fa70-451f-9e6c-0908bc39f8b9',
            dependancies: ['e4b506c1-7379-42b6-a374-284469cba8da'],
            tags: ['discontinuation'],
          },
        ],
      },
      {
        programName: 'Pre-Conception care program',
        programUuid: 'fd549de0-2e6d-4e76-a2c1-64df26351bdd',
        forms: [
          {
            formName: 'Pre-Conception Care Enrollment Form',
            formTranslationKey: 'preConceptionCareEnrollmentForm',
            formUuId: '236161a4-29ad-4282-9829-6684aab85daa',
            dependancies: [],
            tags: ['enrollment'],
          },
          {
            formName: 'Pre-Conception Care',
            formTranslationKey: 'preConceptionCare',
            formUuId: '2cf38f9a-f910-492b-a055-e29924e513f8',
            dependancies: ['236161a4-29ad-4282-9829-6684aab85daa'],
            tags: ['bound-to-current-visit'],
          },
          {
            formName: 'Pre-Conception Discontinuation',
            formTranslationKey: 'preConceptionDiscontinuation',
            formUuId: 'a9128c54-3a05-4d66-ba50-149565eadfd7',
            dependancies: ['236161a4-29ad-4282-9829-6684aab85daa'],
            tags: ['discontinuation'],
          },
        ],
      },
      {
        programName: 'Medical Assited therapy',
        programUuid: '4b898e20-9b2d-11ee-b9d1-0242ac120002',
        forms: [
          {
            formName: 'MAT Clinical Eligibility Assessment & Referral Form',
            formTranslationKey: 'matClinicalEligibilityAssessmentAndReferralForm',
            formUuId: '7b470a63-4c20-453c-8d5d-d75a7bfb87d1',
            dependancies: [],
            tags: [],
          },
          {
            formName: 'MAT Initial Registration Form',
            formTranslationKey: 'matInitialRegistrationForm',
            formUuId: '9a9cadd7-fba1-4a24-94aa-43edfbecf8d9',
            dependancies: ['7b470a63-4c20-453c-8d5d-d75a7bfb87d1'],
            tags: ['enrollment'],
          },
          {
            formName: 'MAT Psycho-social Intake & Follow-up Form',
            formTranslationKey: 'matPsychoSocialIntakeAndFollowUpForm',
            formUuId: 'cfd2109b-63b3-43de-8bb3-682e80c5a965',
            dependancies: ['9a9cadd7-fba1-4a24-94aa-43edfbecf8d9'],
            tags: ['bound-to-current-visit'],
          },
          {
            formName: 'MAT Clinical Encounter Form',
            formTranslationKey: 'matClinicalEncounterForm',
            formUuId: '5ed937a0-0933-41c3-b638-63d8a4779845',
            dependancies: ['9a9cadd7-fba1-4a24-94aa-43edfbecf8d9'],
            tags: ['bound-to-current-visit'],
          },

          {
            formName: 'MAT Psychiatric Intake and Follow up Form',
            formTranslationKey: 'matPsychiatricIntakeAndFollowUpForm',
            formUuId: 'fdea46a1-9423-4ef9-b780-93b32b48a528',
            dependancies: ['9a9cadd7-fba1-4a24-94aa-43edfbecf8d9'],
            tags: ['bound-to-current-visit'],
          },
          {
            formName: 'MAT Transit/Referral Form',
            formTranslationKey: 'matTransitReferralForm',
            formUuId: 'b9495048-eceb-4dd2-bfba-330dc4900ee9',
            dependancies: ['9a9cadd7-fba1-4a24-94aa-43edfbecf8d9'],
            tags: ['bound-to-current-visit'],
          },
          {
            formName: 'MAT Cessation Form',
            formTranslationKey: 'matCessationForm',
            formUuId: 'fa58cbc1-91c8-4920-813b-fde7fd69533b',
            dependancies: ['9a9cadd7-fba1-4a24-94aa-43edfbecf8d9'],
            tags: ['bound-to-current-visit'],
          },
          {
            formName: 'MAT Discontinuation Form',
            formTranslationKey: 'matDiscontinuationForm',
            formUuId: '38d6e116-b96c-4916-a821-b4dc83e2041d',
            dependancies: ['9a9cadd7-fba1-4a24-94aa-43edfbecf8d9'],
            tags: ['discontinuation'],
          },
        ],
      },
      {
        programName: 'Mental Health',
        programUuid: '4b6c5ea4-49c6-454e-9fa1-44838e3a4f40',
        forms: [
          {
            formName: 'Mental Health Enrollment',
            formTranslationKey: 'mentalHealthEnrollment',
            formUuId: 'e2633aa9-4a45-4b8b-8263-37a71817b7bf',
            dependancies: [],
            tags: ['enrollment'],
          },
          {
            formName: 'Psychiatric Initial Form',
            formTranslationKey: 'psychiatricInitialForm',
            formUuId: '1fbd26f1-0478-437c-be1e-b8468bd03ffa',
            dependancies: [],
            tags: ['initial'],
          },
          {
            formName: 'Psychiatry Follow up Form',
            formTranslationKey: 'psychiatryFollowupForm',
            formUuId: '825d118c-8991-478f-840e-d622959238ca',
            dependancies: ['1fbd26f1-0478-437c-be1e-b8468bd03ffa'],
            tags: ['bound-to-current-visit'],
          },
        ],
      },
    ],
  },
  excludedCarePrograms: {
    _type: Type.Array,
    _description: 'List of care program UUIDs to be excluded from the care panel',
    _default: [
      'b5d9e05f-f5ab-4612-98dd-adb75438ed34', // MCH Mother services
    ],
  },
};
