import { z } from 'zod';
import type { TFunction } from 'i18next';

export const createGlobalPropertyFormSchema = (t: TFunction) =>
  z.object({
    property: z.string().min(1, { message: t('gpPropertyNameRequired', 'Property name is required') }),
    description: z.string().optional(),
    datatypeClassname: z.string().optional(),
    datatypeConfig: z.string().optional(),
    preferredHandlerClassname: z.string().optional(),
    handlerConfig: z.string().nullable().optional(),
    value: z.string().min(1, { message: t('gpValueRequired', 'Value is required') }),
  });

export type GlobalPropertyFormType = z.infer<ReturnType<typeof createGlobalPropertyFormSchema>>;

export const openmrsCustomDatatypes = [
  'org.openmrs.customdatatype.datatype.BooleanDatatype',
  'org.openmrs.customdatatype.datatype.DateDatatype',
  'org.openmrs.customdatatype.datatype.DateTimeDatatype',
  'org.openmrs.customdatatype.datatype.FloatDatatype',
  'org.openmrs.customdatatype.datatype.FreeTextDatatype',
  'org.openmrs.customdatatype.datatype.LongFreeTextDatatype',
  'org.openmrs.customdatatype.datatype.RegexValidatedTextDatatype',
  'org.openmrs.customdatatype.datatype.SpecifiedTextOptionsDatatype',
  'org.openmrs.customdatatype.datatype.ConceptDatatype',
  'org.openmrs.customdatatype.datatype.LocationDatatype',
  'org.openmrs.customdatatype.datatype.ProgramDatatype',
  'org.openmrs.customdatatype.datatype.ProviderDatatype',
];

export type OpenmrsCustomDatatype = (typeof openmrsCustomDatatypes)[number];
