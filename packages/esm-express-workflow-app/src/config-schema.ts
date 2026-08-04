import { Type } from '@openmrs/esm-framework';
import { defaultHaemodialysisConfig, type HaemodialysisConfig } from './haemodialysis-config.defaults';

export {
  defaultHaemodialysisConfig,
  type HaemodialysisConfig,
  type HaemodialysisConceptsConfig,
} from './haemodialysis-config.defaults';

export const configSchema = {
  identifierTypes: {
    _type: Type.Array,
    _elements: {
      _type: Type.Object,
      properties: { identifierType: { _type: Type.String }, identifierValue: { _type: Type.String } },
    },
    _default: [
      { identifierType: 'Select an identifier type', identifierValue: 'select-identifier-type' },
      { identifierType: 'National ID', identifierValue: 'National ID' },
      { identifierType: 'Passport Number', identifierValue: 'Passport Number' },
      { identifierType: 'Birth Certificate Number', identifierValue: 'Birth Certificate Number' },
      { identifierType: 'Alien ID Number', identifierValue: 'Alien ID' },
      { identifierType: 'Refugee ID Number', identifierValue: 'Refugee ID' },
      { identifierType: 'Birth Notification Number', identifierValue: 'Birth Notification' },
      { identifierType: 'Mandate Number', identifierValue: 'Mandate Number' },
    ],
    _description: 'List of identifier types with unique keys for each.',
  },
  supersetDashboardConfig: {
    _type: Type.Object,
    _description: 'Superset embeded dashboards config',
    _default: {
      host: 'http://34.35.62.41:8080',
      dashboardId: 'bd7102f9-9291-4a11-9b98-8a17d9142cac',
    },
  },
  concepts: {
    defaultPriorityConceptUuid: {
      _type: Type.ConceptUuid,
      _description: 'The UUID of the default priority for the queues eg Not urgent.',
      _default: '',
    },
    defaultStatusConceptUuid: {
      _type: Type.ConceptUuid,
      _description: 'The UUID of the default status for the queues eg Waiting.',
      _default: '167407AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    },
    emergencyPriorityConceptUuid: {
      _type: Type.ConceptUuid,
      _description: 'The UUID of the priority with the highest sort weight for the queues eg Emergency.',
      _default: '037446f4-adfc-40b3-928c-a39a4826b1bf',
    },
  },
  visitQueueNumberAttributeUuid: {
    _type: Type.String,
    _description: 'The UUID of the visit attribute that contains the visit queue number.',
    _default: 'c61ce16f-272a-41e7-9924-4c555d0932c5',
  },
  patientChartConfig: {
    _type: Type.Object,
    _description: 'Patient chart Tabs config',
    _default: {
      femaleOnlyExtensions: ['charts-partography-dashboard'],
      excludeFromMainChart: ['charts-partography-dashboard'],
      includeInMchChart: [
        'charts-partography-dashboard',
        'charts-summary-dashboard',
        'care-panel-summary-dashboard-link',
        'patient-orders-summary-dashboard',
        'test-results-summary-dashboard',
        'attachments-results-summary-dashboard',
        'charts-mch-program-management-dashboard',
      ],
      excludeExtensions: [],
    },
  },
  queueServiceConceptUuids: {
    _type: Type.Object,
    _description: 'Concept UUIDs for queue service',
    _default: {
      triageService: '167411AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      consultationService: '167410AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      procedureService: '164164AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    },
  },
  queueStatusConceptUuids: {
    _type: Type.Object,
    _description: 'Concept UUIDs for queue status',
    _default: {
      waitingStatus: '167407AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      inServiceStatus: '167408AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      finishedStatus: '167409AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    },
  },
  labOrderTypeUuid: {
    _type: Type.String,
    _description: 'UUID for lab order type',
    _default: '52a447d3-a64a-11e3-9aeb-50e549534c5e',
  },
  imagingOrderTypeUuid: {
    _type: Type.String,
    _description: 'UUID for imaging order type',
    _default: 'b4a7c280-369e-4d12-9ce8-18e36783fed6',
  },
  imagingConceptClassUuid: {
    _type: Type.String,
    _description: 'Concept class UUID for imaging orders',
    _default: '8caa332c-efe4-4025-8b18-3398328e1323',
  },
  orderableConceptSets: {
    _type: Type.Array,
    _elements: {
      _type: Type.String,
    },
    _default: ['9a6f10d6-7fc5-4fb7-9428-24ef7b8d01f7'],
    _description: 'UUIDs for orderable concept sets',
  },
  imagingOrderableConceptSets: {
    _type: Type.Array,
    _elements: {
      _type: Type.String,
    },
    _default: ['164068AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'],
    _description: 'UUIDs for imaging orderable concept sets',
  },
  clinicalEncounter: {
    _type: Type.Object,
    _description: 'Clinical encounter type UUID and form UUID',
    _default: {
      encounterTypeUuid: '465a92f2-baf8-42e9-9612-53064be868e8',
      formUuid: 'e958f902-64df-4819-afd4-7fb061f59308',
    },
  },
  priorities: {
    _type: Type.Object,
    _description: 'Queue priority concept uuids',
    _default: {
      emergencyPriorityConceptUuid: '037446f4-adfc-40b3-928c-a39a4826b1bf',
      urgentPriorityConceptUuid: 'ef5718cd-d6d5-4fcf-bb82-cc4afaa90603',
      notUrgentPriorityConceptUuid: '80cd8f8c-5d82-4cdc-b96e-a6addeb94b7f',
    },
  },
  otpExpirationDurationInminutes: {
    _type: Type.Number,
    _description: 'OTP Number Expiration dutration in minutes',
    _default: 1,
  },
  proceduresConceptClassUuid: {
    _type: Type.ConceptUuid,
    _description: 'Concept class UUID for procedures orders',
    _default: '8d490bf4-c2cc-11de-8d13-0010c6dffd0f',
  },
  maintenanceAgentOptions: {
    _type: Type.Array,
    _elements: {
      _type: Type.Object,
      properties: {
        value: { _type: Type.ConceptUuid },
        label: { _type: Type.String },
      },
    },
    _description:
      'Configurable list of maintenance-of-anaesthesia agents shown in the interoperative drug form (e.g. Halothane, Isoflurane). Override per deployment.',
    _default: [
      { value: '77343AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', label: 'Halothane' },
      { value: '83872AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', label: 'Sevoflurane' },
      { value: '78258AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', label: 'Isoflurane' },
      { value: '82726AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', label: 'Propofol' },
      { value: '78467AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', label: 'Ketamine' },
      { value: '74640AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', label: 'Dexmedetomidine' },
    ],
  },
  proceduresOrderTypeUuid: {
    _type: Type.String,
    _description: 'Procedure Order type UUID',
    _default: 'b4a7c280-369e-4d12-9ce8-18e36783fed6',
  },
  triageServiceConceptUuid: {
    _type: Type.ConceptUuid,
    _description: 'Concept UUID for triage service',
    _default: '167411AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  },
  labServiceConceptUuid: {
    _type: Type.ConceptUuid,
    _description: 'Concept UUID for lab service',
    _default: 'c9604249-db0a-4d03-b074-fc6bc2fa13e6',
  },
  pharmacyServiceConceptUuid: {
    _type: Type.ConceptUuid,
    _description: 'Concept UUID for pharmacy service',
    _default: 'b75e466f-a6f5-4d5e-849a-84424d3c85cd',
  },
  radiologyServiceConceptUuid: {
    _type: Type.ConceptUuid,
    _description: 'Concept UUID for radiology service',
    _default: '160463AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  },
  inpatientDrugOrderTypeUuid: {
    _type: Type.String,
    _description: 'Order type UUID for inpatient drug orders.',
    _default: '131168f4-15f5-102d-96e4-000c29c2a5d7',
  },
  inpatientCareSettingUuid: {
    _type: Type.String,
    _description: 'Care setting UUID for inpatient orders.',
    _default: '6f0c9a92-6f24-11e3-af88-005056821db0',
  },
  inpatientLocationTags: {
    _default: {
      maternityWard: 'b95dd376-fa35-40a6-b140-d144c5f22f62',
      labourWard: '7680b7ee-6880-450c-8b7e-2a748b6f9dc7',
    },
  },
  outpatientVisitTypeUuid: {
    _type: Type.String,
    _description: 'The UUID of the outpatient visit type.',
    _default: '3371a4d4-f66f-4454-a86d-92c7b3da990c',
  },
  inPatientVisitTypeUuid: {
    _type: Type.String,
    _description: 'The UUID of the in-patient visit type.',
    _default: 'a73e2ac6-263b-47fc-99fc-e0f2c09fc914',
  },
  defaultFacilityUrl: {
    _type: Type.String,
    _default: '',
    _description: 'Custom URL to load default facility if it is not in the session',
  },
  offlineVisitTypeUuid: {
    _type: Type.UUID,
    _description: 'The UUID of the visit type to be used for the automatically created offline visits.',
    _default: '',
  },
  showRecommendedVisitTypeTab: {
    _type: Type.Boolean,
    _description: 'Whether start visit form should display recommended visit type tab. Requires `visitTypeResourceUrl`',
    _default: false,
  },
  visitTypeResourceUrl: {
    _type: Type.String,
    _default: '',
    _description: 'Custom URL to load resources required for showing recommended visit types',
  },
  disableChangingVisitLocation: {
    _type: Type.Boolean,
    _description: 'Whether the visit location field in the Start Visit form should be view-only.',
    _default: false,
  },
  enableDemographicSync: {
    _type: Type.Boolean,
    _description:
      'Whether registrars can compare a local patient against the HIE record and overwrite the local ' +
      'demographics with the HIE values. Off by default because syncing rewrites the local record.',
    _default: false,
  },
  visitAttributeTypes: {
    _type: Type.Array,
    _elements: {
      _type: Type.Object,
      uuid: {
        _type: Type.UUID,
        _description: 'UUID of the visit attribute type',
      },
      required: {
        _type: Type.Boolean,
        _description: 'Whether the attribute type field is required or not',
        _default: false,
      },
      displayInThePatientBanner: {
        _type: Type.Boolean,
        _description: "Whether we should show this visit attribute's value in the patient banner",
        _default: true,
      },
    },
    _description: 'List of visit attribute types shown when filling the visit form',
    _default: [],
  },
  showUpcomingAppointments: {
    _type: Type.Boolean,
    _description: 'Whether start visit form should display upcoming appointments',
    _default: false,
  },
  excludedVisitTypeUuids: {
    _type: Type.Array,
    _elements: {
      _type: Type.UUID,
    },
    _default: ['02b67c47-6071-4091-953d-ad21452e830c'],
    _description: 'List of visit type UUIDs to exclude from the start visit form',
  },
  isDHAWorkflow: {
    _type: Type.Boolean,
    _description: 'Whether the workflow is DHA Workflow',
    _default: true,
  },
  crIdentificationNumberUUID: {
    _type: Type.String,
    _description:
      'The patient identifier type UUID for the SHA Client Registry (CR) number, used for virtual claims and OTP/biometric authentication.',
    _default: '24aedd37-b5be-4e08-8311-3721b8d5100d',
  },
  providerNationalIdUuid: {
    _type: Type.String,
    _description: 'The provider attribute type UUID for the national ID, used in SHA biometric authorization requests.',
    _default: '3d152c97-2293-4a2b-802e-e0f1009b7b15',
  },
  nationalIdUUID: {
    _type: Type.String,
    _description: 'The patient identifier type UUID for the national ID, used for SHA eligibility checks.',
    _default: '49af6cdc-7968-4abb-bf46-de10d7f4859f',
  },
  phoneAttributeTypeUUID: {
    _type: Type.String,
    _description: 'The person attribute type UUID for the telephone contact number.',
    _default: 'b2c38640-2603-4629-aebd-3b54f33f1e3a',
  },
  shaNumberUUID: {
    _type: Type.String,
    _description: 'The patient identifier type UUID for the SHA (Social Health Authority) membership number.',
    _default: '52c3c0c3-05b8-4b26-930e-2a6a54e14c90',
  },
  passportUUID: {
    _type: Type.String,
    _description: 'The patient identifier type UUID for the passport number.',
    _default: 'be9beef6-aacc-4e1f-ac4e-5babeaa1e303',
  },
  birthCertificateUUID: {
    _type: Type.String,
    _description: 'The patient identifier type UUID for the birth certificate number.',
    _default: '68449e5a-8829-44dd-bfef-c9c8cf2cb9b2',
  },
  icd11DataSourceUuid: {
    _type: Type.String,
    _description: 'UUID for ICD-11 concept source used in diagnosis search',
    _default: '39ADDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
  },

  haemodialysis: {
    _type: Type.Object,
    _description:
      'Haemodialysis Flow Chart (v1.2) form UUIDs, encounter metadata, concept UUIDs by section, and monitoring slot timing',
    _default: defaultHaemodialysisConfig,
  },

  anaesthetic: {
    _type: Type.Object,
    _description: 'Anaesthetic module configuration',
    _default: {
      conceptMappings: {
        'fetal-heart-rate': ['1440AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'],
        'blood-pressure': ['5085AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', '5086AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'],
        'maternal-pulse': ['5087AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'],
        temperature: ['5088AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'],
        'cervical-dilation': ['162261AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'],
        'descent-of-head': ['1810AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'],
        'uterine-contractions': ['163750AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'],
        'urine-analysis': [
          '161442AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          '887AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          '165438AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        ],
        'drugs-fluids': ['1282AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', '161911AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'],
        'progress-events': [
          '162879AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          '160632AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          '1440AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          '162261AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          '163750AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        ],
      },
      stationDisplayMapping: {
        '160769AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '0/5',
        '162135AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '1/5',
        '166065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '2/5',
        '166066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '3/5',
        '166067AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '4/5',
        '163734AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '5/5',
      },
      stationValueMapping: {
        '160769AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 0,
        '162135AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 1,
        '166065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 2,
        '166066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 3,
        '166067AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 4,
        '163734AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 5,
      },
      encounterPatterns: [
        'mch-partograph',
        'partography',
        'fetal-monitoring',
        'maternal-monitoring',
        'obstetric-vitals',
        'labor-monitoring',
        'labour-monitoring',
      ],
      fallbackEncounterMapping: {
        'fetal-heart-rate': ['mch-mother-consultation', 'vitals', 'obstetric', 'maternal', 'consultation', 'clinical'],
        'cervical-dilation': ['mch-mother-consultation', 'obstetric', 'maternal', 'consultation', 'clinical'],
        'maternal-pulse': ['vitals', 'maternal', 'consultation', 'clinical'],
        'blood-pressure': ['vitals', 'maternal', 'consultation', 'clinical'],
        temperature: ['vitals', 'consultation', 'clinical'],
        'urine-analysis': ['vitals', 'laboratory', 'consultation', 'clinical'],
        'drugs-fluids': ['medication', 'treatment', 'consultation', 'clinical'],
        'progress-events': ['obstetric', 'maternal', 'consultation', 'clinical'],
      },
      defaultFallbackSequence: ['consultation', 'clinical'],
      retryFallbackTypes: ['vitals', 'consultation', 'clinical'],
      defaultEncounterProviderRole: 'a0b03050-c99b-11e0-9572-0800200c9a66',
      defaultLocationUuid: '1',
      storage: {
        maxLocalEntries: 100,
        storageKeyPrefix: 'partography_',
        cacheKeyPrefix: 'partography_encounters_',
      },
      timeConfig: {
        defaultEncounterOffset: 300000,
        retryEncounterOffset: 3600000,
        cacheInvalidationDelay: 1000,
      },
      progressEventConceptNames: {
        '1440AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': {
          name: 'Fetal Heart Rate',
          unit: 'BPM',
        },
        '162261AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': {
          name: 'Cervical Dilation',
          unit: 'cm',
        },
        '163750AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': {
          name: 'Uterine Contractions',
          unit: 'per 10min',
        },
      },

      uuids: {
        timeSlot: 'a1b2c3d4-1111-2222-3333-444455556666',
        mchPartographyEncounterUuid: 'd14dde5b-95dc-40a1-8ff0-acad34fb58b2',
        drugsFluidsEncounterUuid: '39da3525-afe4-45ff-8977-c53b7b359158',
        contractionStrongConceptUuid: '4b90b73a-ad11-4650-91b0-baea131974e0',
      },
      graphTypeDisplayNames: {
        'fetal-heart-rate': 'Fetal Heart Rate',
        'cervical-dilation': 'Cervical Dilation',
        'descent-of-head': 'Descent of Head',
        'uterine-contractions': 'Uterine Contractions',
        'maternal-pulse': 'Maternal Pulse',
        'blood-pressure': 'Blood Pressure',
        temperature: 'Temperature',
        'urine-analysis': 'Urine Analysis',
        'drugs-fluids': 'Drugs & Fluids',
        'progress-events': 'Progress & Events',
      },
      amnioticFluidMap: {
        'Membrane intact': '164899AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        'Clear liquor': '159484AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        'Meconium Stained': '134488AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        Absent: '163747AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        'Blood Stained': '1077AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      },
      mouldingMap: {
        '0': '1107AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        '+': '1362AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        '++': '1363AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        '+++': '1364AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      },
      testData: {
        testGraphTypes: ['fetal-heart-rate', 'cervical-dilation', 'maternal-pulse', 'temperature', 'blood-pressure'],
        sampleDataPoints: [
          { value: 120, time: '10:00' },
          { value: 125, time: '11:00' },
          { value: 130, time: '12:00' },
          { value: 128, time: '13:00' },
        ],
        valueIncrement: 10,
        bloodPressureDecrement: 40,
      },
      descentOfHeadUuidToValue: {
        '160769AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 0,
        '162135AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 1,
        '166065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 2,
        '166066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 3,
        '166067AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 4,
        '163734AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 5,
      },
    },
  },
};

export type ExpressWorkflowConfig = {
  identifierTypes: Array<{ identifierType: string; identifierValue: string }>;
  supersetDashboardConfig: {
    host: string;
    dashboardId: string;
  };
  visitQueueNumberAttributeUuid: string;
  concepts: {
    defaultPriorityConceptUuid: string;
    defaultStatusConceptUuid: string;
    emergencyPriorityConceptUuid: string;
  };
  patientChartConfig: {
    femaleOnlyExtensions: Array<string>;
    excludeFromMainChart: Array<string>;
    includeInMchChart: Array<string>;
    excludeExtensions: Array<string>;
  };
  queueServiceConceptUuids: {
    triageService: string;
    consultationService: string;
    procedureService: string;
  };
  queueStatusConceptUuids: {
    waitingStatus: string;
    inServiceStatus: string;
    finishedStatus: string;
  };
  labOrderTypeUuid: string;
  imagingConceptClassUuid: string;
  orderableConceptSets: Array<string>;
  imagingOrderTypeUuid: string;
  proceduresOrderTypeUuid: string;
  imagingOrderableConceptSets: Array<string>;
  clinicalEncounter: {
    encounterTypeUuid: string;
    formUuid: string;
  };
  priorities: {
    emergencyPriorityConceptUuid: string;
    urgentPriorityConceptUuid: string;
    notUrgentPriorityConceptUuid: string;
  };
  otpExpirationDurationInminutes: number;
  proceduresConceptClassUuid: string;
  triageServiceConceptUuid: string;
  labServiceConceptUuid: string;
  pharmacyServiceConceptUuid: string;
  radiologyServiceConceptUuid: string;
  inpatientDrugOrderTypeUuid: string;
  inpatientCareSettingUuid: string;
  inpatientLocationTags: {
    maternityWard: string;
    labourWard: string;
  };
  outpatientVisitTypeUuid: string;
  inPatientVisitTypeUuid: string;
  defaultFacilityUrl: string; //done
  offlineVisitTypeUuid: string;
  nationalIdUUID: string;
  showRecommendedVisitTypeTab: boolean;
  visitTypeResourceUrl: string;
  disableChangingVisitLocation: boolean;
  enableDemographicSync: boolean;
  restrictByVisitLocationTag: boolean;
  visitAttributeTypes: Array<{
    displayInThePatientBanner: boolean;
    required: boolean;
    showWhenExpression?: string;
    uuid: string;
  }>; // done
  showUpcomingAppointments: boolean; //done
  excludedVisitTypeUuids: Array<string>;
  isDHAWorkflow: boolean;
  crIdentificationNumberUUID: string;
  providerNationalIdUuid: string;
  phoneAttributeTypeUUID: string;
  shaNumberUUID: string;
  passportUUID: string;
  birthCertificateUUID: string;
  icd11DataSourceUuid: string;
  haemodialysis: HaemodialysisConfig;
};
export interface ConfigObject {
  requireMaritalStatusOnAgeGreaterThanOrEqualTo: number;
  peerEducatorRelationship: string;
  morgueVisitTypeUuid: string;
  morgueDischargeEncounterUuid: string;
  caseManagementForms: Array<{ id: string; title: string; formUuid: string; encounterTypeUuid: string }>;
  peerCalendarOutreactForm: string;
  htsClientTracingConceptsUuids: {
    modeOfClienttracingConceptUuid: string;
    reasonNotContactedConceptUuid: string;
    tracingStatusConceptUuid: string;
    remarksConceptUuid: string;
  };
  encounterTypes: {
    mchMotherConsultation: string;
    hivTestingServices: string;
    kpPeerCalender: string;
    htsEcounterUuid: string;
    triage: string;
  };
  formsList: {
    labourAndDelivery: string;
    antenatal: string;
    postnatal: string;
    admissionRequestFormUuid: string;
    htsScreening: string;
    htsInitialTest: string;
    htsRetest: string;
    defaulterTracingFormUuid: string;
    clinicalEncounterFormUuid: string;
    peerCalendarOutreactForm: string;
    autopsyFormUuid: string;
    htsClientTracingFormUuid: string;
    complaintsFormUuid: string;
  };
  defaulterTracingEncounterUuid: string;
  autopsyEncounterFormUuid: string;
  clinicalEncounterUuid: string;
  registrationEncounterUuid: string;
  registrationObs: {
    encounterTypeUuid: string | null;
    encounterProviderRoleUuid: string;
    registrationFormUuid: string | null;
  };
  openmrsIDUuid: string;
  openmrsIdentifierSourceUuid: string;
  maritalStatusUuid: string;
  hivProgramUuid: string;
  kvpProgramUuid: string;
  concepts: Record<string, string>;
  specialClinics: Array<{ id: string; formUuid: string; encounterTypeUuid: string; title: string }>;
  contactPersonAttributesUuid: {
    telephone: string;
    baselineHIVStatus: string;
    contactCreated: string;
    preferedPnsAproach: string;
    livingWithContact: string;
    contactIPVOutcome: string;
  };
  relationshipTypesList: Array<{
    uuid: string;
    display: string;
    category: Array<'sexual' | 'pns' | 'family'>;
  }>;
  partography: {
    conceptMappings: Record<string, string[]>;
    stationDisplayMapping: Record<string, string>;
    stationValueMapping: Record<string, number>;
    encounterPatterns: string[];
    fallbackEncounterMapping: Record<string, string[]>;
    defaultFallbackSequence: string[];
    retryFallbackTypes: string[];
    defaultEncounterProviderRole: string;
    defaultLocationUuid: string;
    storage: {
      maxLocalEntries: number;
      storageKeyPrefix: string;
      cacheKeyPrefix: string;
    };
    timeConfig: {
      defaultEncounterOffset: number;
      retryEncounterOffset: number;
      cacheInvalidationDelay: number;
    };
    progressEventConceptNames: Record<string, { name: string; unit: string }>;
    graphTypeDisplayNames: Record<string, string>;
    testData: {
      testGraphTypes: string[];
      sampleDataPoints: Array<{ value: number; time: string }>;
      valueIncrement: number;
      bloodPressureDecrement: number;
    };
    uuids?: {
      timeSlot: string;
      mchPartographyEncounterUuid: string;
      drugsFluidsEncounterUuid: string;
      contractionStrongConceptUuid: string;
    };
  };
  caseManagerRelationshipType: string;
  complaintsConceptUuids: Array<string>;
  complaints: {
    chiefComplaintConceptUuid: string;
    complaintMemberConceptUuid: string;
    durationConceptUuid: string;
    onsetConceptUuid: string;
  };
  icd11DataSourceUuid: string;
  proceduresConceptClassUuid: string;
  maintenanceAgentOptions: Array<{ value: string; label: string }>;
}

// Maintenance of Anaesthesia options – configurable so each deployment (Kenya, DRC, Congo …) can specify its own agents
export const DEFAULT_MAINTENANCE_AGENT_OPTIONS = [
  { value: '77343AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', label: 'Halothane' },
  { value: '83872AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', label: 'Evoflurane' },
  { value: '78258AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', label: 'Isoflurane' },
];

// Fetal Heart Rate Graph
export const FETAL_HEART_RATE_CONCEPT = '1440AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const FETAL_HEART_RATE_TIME_CONCEPT = 'bb3724c9-fbcc-49c5-9702-6cde0be325ca';
export const FETAL_HEART_RATE_HOUR_CONCEPT = '160632AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

// Membrane Amniotic Fluid Graph
export const AMNIOTIC_FLUID_CONCEPT = '162653AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const RUPTURED_MEMBRANES_CONCEPT = '164900AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const AMNIOTIC_CLEAR_LIQUOR_CONCEPT = '159484AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const AMNIOTIC_MECONIUM_STAINED_CONCEPT = '134488AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const AMNIOTIC_ABSENT_CONCEPT = '163747AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const AMNIOTIC_BLOOD_STAINED_CONCEPT = '1077AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const AMNIOTIC_MEMBRANE_INTACT_CONCEPT = 'd1787a76-7310-4223-a645-9fd410d418c1';

//Contractions Graph
export const UTERINE_CONTRACTIONS_CONCEPT = '163750AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const CONTRACTION_LEVEL_MILD_CONCEPT = '1498AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const CONTRACTION_LEVEL_MODERATE_CONCEPT = '1499AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const CONTRACTION_LEVEL_STRONG_CONCEPT = '166788AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const UTERINE_CONTRACTION_FREQUENCY_CONCEPT = '166529AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const UTERINE_CONTRACTION_DURATION_CONCEPT = '159368AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

// Oxytocin Graph

export const OXYTOCIN_TIME_CONCEPT = 'bb3724c9-fbcc-49c5-9702-6cde0be325ca';
export const OXYTOCIN_DROPS_PER_MINUTE_CONCEPT = '1d109b10-7b30-4bfa-8a7c-6ecb73357fc2';
export const OXYTOCIN_DOSE_CONCEPT = '81369AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const ROUTE_CONCEPT = '8878f9c0-a1ce-47ec-a88f-69ef0f6576ba';
export const FREQUENCY_CONCEPT = 'fd9f82fd-f327-4502-ac8e-5d9144dbd504';

// Drugs IV Fluids Graph
export const MEDICATION_CONCEPT = 'c3082af8-f935-40c5-aa5b-74c684e81aea';
export const IV_FLUIDS_CONCEPT = '161911AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const DOSAGE_CONCEPT = 'b71ddb80-2d7f-4bde-a44b-236e62d4c1b6';
export const DRUG_DOSE_CONCEPT = '162384AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

// Pulse BP Graph
export const MATERNAL_PULSE_CONCEPT = '5087AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const SYSTOLIC_BP_CONCEPT = '5085AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const DIASTOLIC_BP_CONCEPT = '5086AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const PULSE_BP_TIME_CONCEPT = 'bb3724c9-fbcc-49c5-9702-6cde0be325ca';

// Urine Test Graph
export const PROTEIN_LEVEL_CONCEPT = '161442AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const GLUCOSE_LEVEL_CONCEPT = '887AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const KETONE_LEVEL_CONCEPT = '165438AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const URINE_VOLUME_CONCEPT = '159660AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const URINE_CHARACTERISTICS_CONCEPT = '56AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const TIME_RESULTS_RETURNED = '67c3d4c6-465e-4c12-9b7f-d8587ca90603';
export const TIME_SAMPLE_COLLECTED = 'c554f157-2e16-4585-af29-c48f5e765ce0';

// Cervix / Cervical Monitoring During Labor
export const CERVIX_CONCEPT = '162261AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const DESCENT_OF_HEAD_CONCEPT = '1810AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const STATION_0_CONCEPT = '160769AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const STATION_1_CONCEPT = '162135AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const STATION_2_CONCEPT = '166065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const STATION_3_CONCEPT = '166066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const STATION_4_CONCEPT = '166067AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const STATION_5_CONCEPT = '163734AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export const DRUG_ORDER_TYPE_UUID = '131168f4-15f5-102d-96e4-000c29c2a5d7';
export const ENCOUNTER_ROLE = '240b26f9-dd88-4172-823d-4a8bfeb7841f';
export const MOULDING_NONE_CONCEPT = '1107AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const MOULDING_SLIGHT_CONCEPT = '1362AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const MOULDING_MODERATE_CONCEPT = '1363AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const MOULDING_SEVERE_CONCEPT = '1364AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const TEMPERATURE_CONCEPT = '5088AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const CONTRACTION_COUNT_CONCEPT = '159682AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const MEDICATION_NAME_CONCEPT = '164231AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const EVENT_TYPE_CONCEPT = '162879AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const EVENT_DESCRIPTION_CONCEPT = '160632AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const MOULDING_CONCEPT = '166527AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const BLOOD_GROUP_CONCEPT = '300AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const TIME_SLOT_CONCEPT = '163286AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const LABOR_PATTERN_CONCEPT = '164135AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const HOURS_SINCE_RUPTURE_CONCEPT = '167149AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const DATE_OF_ADMISSION_CONCEPT = '1640AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const GESTATION_WEEKS_CONCEPT = '1789AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const ESTIMATED_DELIVERY_DATE_CONCEPT = '5596AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
export const LAST_MENSTRUAL_PERIOD_CONCEPT = '1427AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
