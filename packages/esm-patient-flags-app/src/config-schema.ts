import { ConfigSchema, Type } from '@openmrs/esm-framework';

export const configSchema: ConfigSchema = {
  excludeLinks: {
    _type: Type.Array,
    _elements: {
      _type: Type.String,
      _description: 'Label for the link to hide',
    },
    _default: [],
    _description: 'Array of links to hide in the patient flags app',
  },
  instanceName: {
    _type: Type.String,
    _description: 'Application Instance Name',
    _default: 'KenyaEMR ',
  },
  clinicalEncounterFormUuid: {
    _type: Type.String,
    _description: 'UUID for the clinical encounter form',
    _default: 'e958f902-64df-4819-afd4-7fb061f59308',
  },
};

export type ConfigObject = {
  excludeLinks: Array<string>;
  instanceName: string;
  clinicalEncounterFormUuid: string;
};
