import { Type } from '@openmrs/esm-framework';

export const configSchema = {
  pcsIdentifiers: {
    _type: Type.Object,
    _description: 'PBIDS study identifier types.',
    _default: {
      studyParticipantID: 'e65e699e-6b56-4be4-8d8b-14ead2de408d',
      studyTemporaryParticipantID: 'ad7d9813-1bc7-4e7e-b730-20a55f50b8e0',
    },
  },
  pcsAttributeTypes: {
    _type: Type.Object,
    _description: 'PCS study person attribute types. Both are java.lang.Boolean format.',
    _default: {
      pbidsEnrollmentStatus: '4fbf219b-8965-418a-b6d7-53229eeeb18f',
      cardseEnrollmentStatus: 'a49c97f9-a571-47da-88ee-ed2c8558f8f4',
    },
  },
  nationalIdUUID: {
    _type: Type.String,
    _description: 'The patient identifier type UUID for the national ID. Also set in express-workflow.',
    _default: '49af6cdc-7968-4abb-bf46-de10d7f4859f',
  },
  phoneAttributeTypeUUID: {
    _type: Type.String,
    _description: 'The person attribute type UUID for the telephone contact number. Also set in express-workflow.',
    _default: 'b2c38640-2603-4629-aebd-3b54f33f1e3a',
  },
  shaNumberUUID: {
    _type: Type.String,
    _description: 'The patient identifier type UUID for the SHA membership number. Also set in express-workflow.',
    _default: '52c3c0c3-05b8-4b26-930e-2a6a54e14c90',
  },
  passportUUID: {
    _type: Type.String,
    _description: 'The patient identifier type UUID for the passport number. Also set in express-workflow.',
    _default: 'be9beef6-aacc-4e1f-ac4e-5babeaa1e303',
  },
  birthCertificateUUID: {
    _type: Type.String,
    _description: 'The patient identifier type UUID for the birth certificate number. Also set in express-workflow.',
    _default: '68449e5a-8829-44dd-bfef-c9c8cf2cb9b2',
  },
  crIdentificationNumberUUID: {
    _type: Type.String,
    _description: 'The patient identifier type UUID for the client registry (CR) number, the HIE sha-id-number.',
    _default: '24aedd37-b5be-4e08-8311-3721b8d5100d',
  },
};

export interface PcsConfig {
  pcsIdentifiers: {
    studyParticipantID: string;
    studyTemporaryParticipantID: string;
  };
  pcsAttributeTypes: {
    pbidsEnrollmentStatus: string;
    cardseEnrollmentStatus: string;
  };
  nationalIdUUID: string;
  phoneAttributeTypeUUID: string;
  shaNumberUUID: string;
  passportUUID: string;
  birthCertificateUUID: string;
  crIdentificationNumberUUID: string;
}
