export const PENDING_PAYMENT_STATUS = 'PENDING';
export const EXEMPTED_PAYMENT_STATUS = 'EXEMPTED';
export const spaBasePath = `${window.spaBase}/home`;
export const billingAdminBasePath = `${window.spaBase}/billing-admin`;

export const colorsArray = [
  'red',
  'magenta',
  'purple',
  'blue',
  'cyan',
  'teal',
  'green',
  'gray',
  'cool-gray',
  'warm-gray',
  'high-contrast',
  'outline',
];

// Size in MegaBits
export const MAX_ALLOWED_FILE_SIZE = 2097152;
export const PAYMENT_MODE_ATTRIBUTE_FORMATS = ['java.lang.String', 'java.lang.Integer', 'java.lang.Double'];
export const SHA_INSURANCE_SCHEME = 'SHA';

export const SHA_INTERVENTION_LABELS: Record<string, string> = {
  'SHA-12-001': 'Consultation',
  'SHA-12-002': 'Laboratory Tests',
  'SHA-12-003': 'Imaging & Procedures',
  'SHA-12-004': 'Pharmacy',
  'SHA-12-005': 'Other Outpatient Services',
  'SHA-12-006': 'Screening',
  'SHA-12-007': 'Daycare Procedures',
  'SHA-12-008': 'Antenatal Care',
  'SHA-12-009': 'Postnatal Care',
  'SHA-12-010': 'Immunization',
};
