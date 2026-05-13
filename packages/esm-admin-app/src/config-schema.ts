import { fhirBaseUrl, Type } from '@openmrs/esm-framework';
import dayjs from 'dayjs';

export const configSchema = {
  providerNationalIdUuid: {
    _type: Type.String,
    _description: 'UUID for provider national ID',
    _default: '3d152c97-2293-4a2b-802e-e0f1009b7b15',
  },
  passportNumberUuid: {
    _type: Type.String,
    _description: 'UUID for passport number identification for provider',
    _default: '5b4b88e8-9db3-41e6-a175-5e39f2c8a9a5',
  },
  providerUniqueIdentifierAttributeTypeUuid: {
    _type: Type.String,
    _description: 'UUID for cross-regulator provider unique identifier (PUID)',
    _default: 'dace9d99-9f29-4653-9eae-c05929f34a32',
  },
  externalProviderIdentifierUuid: {
    _type: Type.String,
    _description: 'UUID for external provider identifier (regulator-public reference)',
    _default: 'bbdf67e8-c020-40ff-8ad6-74ba34893882',
  },

  licenseNumberUuid: {
    _type: Type.String,
    _description: 'UUID for license number',
    _default: 'bcaaa67b-cc72-4662-90c2-e1e992ceda66',
  },
  licenseExpiryDateUuid: {
    _type: Type.String,
    _description: 'UUID for license expiry date',
    _default: '00539959-a1c7-4848-a5ed-8941e9d5e835',
  },
  licenseBodyUuid: {
    _type: Type.String,
    _description: 'UUID for licensing body (e.g. KMPDC, NCK, PPB, COC)',
    _default: 'ba18bb97-d17c-4640-80d2-58e7df90ca4c',
  },
  qualificationUuid: {
    _type: Type.String,
    _description: 'UUID for provider educational qualification',
    _default: '43f99413-6e7f-4812-bc60-066bb1d43f94',
  },
  specialtyUuid: {
    _type: Type.String,
    _description: 'UUID for provider clinical specialty',
    _default: '7f5d8e2c-3a1b-4d6e-9c0f-2b4a1d5e8c91',
  },
  providerCadreUuid: {
    _type: Type.String,
    _description: 'UUID for provider professional cadre',
    _default: '8a6e9f3d-4b2c-5e7f-ad10-3c5b2e6f9da2',
  },
  practiceTypeUuid: {
    _type: Type.String,
    _description: 'UUID for provider practice type (clinical, non-clinical, etc.)',
    _default: '9b7faa4e-5c3d-6f80-be21-4d6c3f70aeb3',
  },
  phoneNumberUuid: {
    _type: Type.String,
    _description: 'UUID for provider phone number',
    _default: '37daed7f-1f4e-4e62-8e83-6048ade18a87',
  },
  providerAddressUuid: {
    _type: Type.String,
    _description: 'UUID for provider postal address',
    _default: '033ff604-ecf7-464f-b623-5b77c733667f',
  },
  providerHieFhirReference: {
    _type: Type.String,
    _description: 'UUID for provider HIE FHIR reference',
    _default: '67b94e8e-4d61-4810-b0f1-d86497f6e553',
  },
  personEmailAttributeUuid: {
    _type: Type.String,
    _description: 'UUID for person email attribute',
    _default: 'b8d0b331-1d2d-4a9a-b741-1816f498bdb6',
  },
  personPhonenumberAttributeUuid: {
    _type: Type.String,
    _description: 'UUID for person phone number attribute',
    _default: 'b2c38640-2603-4629-aebd-3b54f33f1e3a',
  },
};

export interface UserProperties {
  loginAttempts: string;
  lastViewedPatientIds: string;
}

export interface ConfigObject {
  providerNationalIdUuid: string;
  passportNumberUuid: string;
  providerUniqueIdentifierAttributeTypeUuid: string;
  externalProviderIdentifierUuid: string;
  licenseNumberUuid: string;
  licenseExpiryDateUuid: string;
  licenseBodyUuid: string;
  qualificationUuid: string;
  specialtyUuid: string;
  providerCadreUuid: string;
  practiceTypeUuid: string;
  phoneNumberUuid: string;
  providerAddressUuid: string;
  providerHieFhirReference: string;
  personEmailAttributeUuid: string;
  personPhonenumberAttributeUuid: string;
}
