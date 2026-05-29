import { OpenmrsResource } from '@openmrs/esm-framework';
import { type Drug, type OrderBasketItem } from '@openmrs/esm-patient-common-lib';
export interface MappedBill {
  uuid: string;
  id: number;
  patientUuid: string;
  patientName: string;
  cashPointUuid: string;
  cashPointName: string;
  cashPointLocation: string;
  cashier: Provider;
  receiptNumber: string;
  status: PaymentStatus;
  identifier: string;
  dateCreated: string;
  dateCreatedUnformatted: string;
  lineItems: Array<LineItem>;
  billingService: string;
  payments: Array<Payment>;
  totalAmount?: number;
  tenderedAmount?: number;
  display?: string;
  referenceCodes?: string;
  adjustmentReason?: string;
  totalPayments?: number;
  totalDeposits?: number;
  totalExempted?: number;
  balance?: number;
  closed?: boolean;
}

interface LocationLink {
  rel: string;
  uri: string;
  resourceAlias: string;
}

interface Location {
  uuid: string;
  display: string;
  links: LocationLink[];
}

interface CashPoint {
  uuid: string;
  name: string;
  description: string;
  retired: boolean;
  location: Location;
}

interface ProviderLink {
  rel: string;
  uri: string;
  resourceAlias: string;
}

export interface Provider {
  uuid: string;
  display: string;
  links: ProviderLink[];
}

export interface LineItem {
  uuid: string;
  display: string;
  voided: boolean;
  voidReason: string | null;
  item: string;
  billableService: string;
  quantity: number;
  price: number;
  priceName: string;
  priceUuid: string;
  lineItemOrder: number;
  resourceVersion: string;
  paymentStatus: string;
  itemOrServiceConceptUuid: string;
  serviceTypeUuid: string;
  order: OpenmrsResource;
  is_return?: boolean;
  is_cancellation?: boolean;
}

interface PatientLink {
  rel: string;
  uri: string;
  resourceAlias: string;
}

export interface Patient {
  uuid: string;
  display: string;
  links: PatientLink[];
  identifiers: Array<PatientIdentifier>;
}
interface AttributeType {
  uuid?: string;
  name: string;
  description: string;
  retired: boolean;
  attributeOrder?: number;
  format?: string;
  foreignKey?: string | null;
  regExp?: string | null;
  required: boolean;
  value?: string;
}

interface Attribute {
  uuid: string;
  display: string;
  voided: boolean;
  voidReason: string | null;
  value: string;
  attributeType: AttributeType;
  order: number;
  valueName: string;
  resourceVersion: string;
}

interface PaymentInstanceType {
  uuid: string;
  name: string;
  description: string;
  retired: boolean;
}
export interface PatientInvoice {
  uuid: string;
  display: string;
  voided: boolean;
  voidReason: string | null;
  adjustedBy: any[];
  billAdjusted: any;
  cashPoint: CashPoint;
  cashier: Provider;
  dateCreated: string;
  lineItems: LineItem[];
  patient: Patient;
  payments: Payment[];
  receiptNumber: string;
  status: PaymentStatus;
  adjustmentReason: any;
  id: number;
  resourceVersion: string;
  totalPayments?: number;
  totalDeposits?: number;
  totalExempted?: number;
  balance?: number;
  closed?: boolean;
}

export interface PatientDetails {
  name: string;
  age: string;
  gender: string;
  city: string;
  county: string;
  subCounty: string;
}

export interface FacilityDetail {
  uuid: string;
  display: string;
}

export type ServiceConcept = {
  concept: {
    uuid: string;
    display: string;
  };
  conceptName: {
    uuid: string;
    display: string;
  };
  display: string;
};

export type BillingService = {
  name: string;
  servicePrices: Array<{ name: string; paymentMode: { uuid: string; name: string }; price: number; uuid: string }>;
  serviceStatus: string;
  serviceType: { display: string };
  shortName: string;
  uuid: string;
  stockItem?: string;
};

export interface DrugOrderBasketItem extends OrderBasketItem {
  drug: Drug;
  unit: DosingUnit;
  commonMedicationName: string;
  dosage: number;
  frequency: MedicationFrequency;
  route: MedicationRoute;
  quantityUnits: QuantityUnit;
  patientInstructions: string;
  asNeeded: boolean;
  asNeededCondition: string;
  // TODO: This is unused
  startDate: Date | string;
  durationUnit: DurationUnit;
  duration: number | null;
  pillsDispensed: number;
  numRefills: number;
  indication: string;
  isFreeTextDosage: boolean;
  freeTextDosage: string;
  previousOrder?: string;
  template?: OrderTemplate;
}

export interface DrugOrderTemplate {
  uuid: string;
  name: string;
  drug: Drug;
  template: OrderTemplate;
}

export interface OrderTemplate {
  type: string;
  dosingType: string;
  dosingInstructions: DosingInstructions;
}

export interface DosingInstructions {
  dose: Array<MedicationDosage>;
  units: Array<DosingUnit>;
  route: Array<MedicationRoute>;
  frequency: Array<MedicationFrequency>;
  instructions?: Array<MedicationInstructions>;
  durationUnits?: Array<DurationUnit>;
  quantityUnits?: Array<QuantityUnit>;
  asNeeded?: boolean;
  asNeededCondition?: string;
}

export interface MedicationDosage extends Omit<CommonMedicationProps, 'value'> {
  value: number;
}

export type MedicationFrequency = CommonMedicationValueCoded;

export type MedicationRoute = CommonMedicationValueCoded;

export type MedicationInstructions = CommonMedicationProps;

export type DosingUnit = CommonMedicationValueCoded;

export type QuantityUnit = CommonMedicationValueCoded;

export type DurationUnit = CommonMedicationValueCoded;

interface CommonMedicationProps {
  value: string;
  default?: boolean;
}

export interface CommonMedicationValueCoded extends CommonMedicationProps {
  valueCoded: string;
}

export interface AuditInfo {
  creator: Creator;
  dateCreated: string;
  changedBy: null;
  dateChanged: null;
}

export interface Link {
  rel: string;
  uri: string;
  resourceAlias: string;
}

export interface Creator {
  uuid: string;
  display: string;
  links: Link[];
}

export interface PaymentMethod {
  uuid: string;
  name: string;
  description: string;
  retired: boolean;
  retireReason: null;
  auditInfo: AuditInfo;
  attributeTypes: AttributeType[];
  sortOrder: null;
  resourceVersion: string;
}

export interface Payment {
  uuid: string;
  instanceType: PaymentInstanceType;
  attributes: Attribute[];
  amount: number;
  amountTendered: number;
  dateCreated: number;
  voided: boolean;
  resourceVersion: string;
}

export type FormPayment = { method: PaymentMethod; amount: string | number; referenceCode?: number | string };

export type PaymentFormValue = {
  payment: Array<FormPayment>;
};

export type QueueEntry = {
  queueEntry: {
    uuid: string;
    priority: OpenmrsResource;
    status: OpenmrsResource;
    queue: OpenmrsResource;
    queueComingFrom: OpenmrsResource;
  };
};

export type RequestStatus = 'INITIATED' | 'COMPLETE' | 'FAILED' | 'NOT-FOUND';

export enum PaymentStatus {
  POSTED = 'POSTED',
  PENDING = 'PENDING',
  PAID = 'PAID',
  CREDITED = 'CREDITED',
  CANCELLED = 'CANCELLED',
  ADJUSTED = 'ADJUSTED',
  EXEMPTED = 'EXEMPTED',
}

export interface Benefits {
  shaPackageCode: string;
  shaPackageName: string;
  shaInterventionCode: string;
  shaInterventionName: string;
}

export interface Intervention {
  shaInterventionCode: string;
  shaInterventionName?: string;
}
export interface SHAPackage {
  uuid: string;
  shaPackageCode: string;
  shaPackageName: string;
}

export interface PatientBenefit {
  packageCode: string;
  packageName: string;
  interventionCode: string;
  interventionName: string;
  interventioTariff: number;
  requirePreauth: boolean;
  status: string;
}

export interface InsurersBenefits extends PatientBenefit {
  insurer: string;
}

export interface CoverageEligibilityResponse {
  inforce: boolean;
  insurer: string;
  start: string;
  end: string;
  benefits: Array<PatientBenefit>;
}

export interface FHIRErrorResponse {
  resourceType: string;
  issue: Issue[];
}

export interface Issue {
  severity: string;
  code: string;
  diagnostics: string;
}

export type FHIRPatientResponse = {
  resourceType: string;
  id: string;
  extension: Array<{
    url: string;
    valueCoding?: {
      system: string;
      code: string;
      display: string;
    };
    valueString?: string;
    valueInteger?: number;
  }>;
  identifier: Array<{
    use: string;
    type: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
    };
    value: string;
  }>;
  active: boolean;
  name: Array<{
    text: string;
    family: string;
    given: Array<string>;
    prefix: Array<string>;
  }>;
  telecom: Array<{
    system: string;
    value: string;
  }>;
  gender: string;
  birthDate: string;
  deceasedBoolean: boolean;
  address: Array<{
    extension: Array<
      Array<{
        url: string;
        valueString: string;
      }>
    >;
    use: string;
    text: string;
    city: string;
    postalCode: string;
    country: string;
  }>;
  maritalStatus: {
    coding: Array<{
      system: string;
      code: string;
    }>;
  };
};
export interface Package {
  uuid: string;
  packageCode: string;
  packageName: string;
  packageAccessPoint?: 'OP' | 'IP' | 'Both';
}

export interface Diagnosis {
  uuid: string;
  name: string;
  dateRecorded: string;
  value: string;
}

export interface PaymentPoint {
  uuid: string;
  name: string;
  description: string;
  retired: boolean;
  location: Location;
}

export interface Timesheet {
  uuid: string;
  display: string;
  cashier: Cashier;
  cashPoint: CashPoint;
  clockIn: string;
  clockOut: null;
  id: number;
}

export interface Cashier {
  uuid: string;
  display: string;
  links: Link[];
}

export interface Link {
  rel: string;
  uri: string;
  resourceAlias: string;
}

export type ExcelFileRow = {
  concept_id: number;
  name: string;
  price: number;
  disable: 'false' | 'true';
  service_type_id: number;
  short_name: string;
};

export type PaymentMode = {
  uuid?: string;
  name: string;
  description: string;
  retired: boolean;
  retiredReason?: string | null;
  auditInfo?: AuditInfo;
  attributeTypes?: Array<AttributeType>;
  sortOrder?: number | null;
  resourceVersion?: string;
};

export type SHAIntervention = {
  interventionCode: string;
  interventionPackage: string;
  shaCategory: string;
  accessCode: string;
  subCategoryBenefitsPackage: string;
  interventionName: string;
  needsPreAuth: string;
  categoryHealthFacility: string;
  providerPaymentMechanism: string;
  gender: string;
  limitIndividualHousehold: string;
  interventionQuantityYear: string;
  tariffs: string;
  limitIndividual: string;
  minAge: string;
  maxAge: string;
  limitsIndividualHousehold: string;
  phc: string;
  shif: string;
  eccif: string;
  automateManual: string;
};

export interface ClaimsPreAuthFilter {
  fromDate?: Date;
  toDate?: Date;
  status: string;
  search?: string;
}

export interface BenefitDataResponse {
  title?: string;
  allocation?: string;
  expenditure?: string;
  balance?: string;
  isActive?: boolean;
  description?: string;
}

export interface shifIdentifiersResponse {
  identiferNumber: string;
  identiferType: string;
}

export interface ClaimResponse {
  uuid: string;
  claimCode: string;
  use: string;
  dateFrom: string;
  dateTo: string;
  claimedTotal: number;
  approvedTotal: null | number;
  status:
    | 'REJECTED'
    | 'ENTERED'
    | 'CHECKED'
    | 'VALUATED'
    | 'ERRORED'
    | 'APPROVED'
    | 'DRAFT'
    | 'PENDING'
    | 'SUBMITTED'
    | 'CLOSED'
    | 'SUBMISSION_READY';
  workflowState?: string | null;
  authorizationCode?: string | null;
  authorizationGuid?: string | null;
  serviceType?: 'OUTPATIENT' | 'INPATIENT' | 'CAPITATION' | null;
  claimAuthStatus?: string | null;
  totalClaimAmount?: number | null;
  totalClaimNetAmount?: number | null;
  totalClaimCopay?: number | null;
  totalClaimDiscount?: number | null;
  invoiceNumber?: string | null;
  memberNumber?: string | null;
  interventions?: string[];
  interventionDetails?: Array<{
    intervention_code: string;
    intervention_name: string | null;
    tariff: string | null;
    payment_mechanism: string | null;
    needs_preauth: boolean;
    preauth_exist: boolean;
    workflow_state: string | null;
    sub_benefit_code: string | null;
    intervention_fund: string | null;
    supported_scheme: string | null;
    requires_surgical_preauth: boolean;
    requires_renal_preauth: boolean;
    requires_oncology_preauth: boolean;
    requires_radiology_preauth: boolean;
    requires_optical_preauth: boolean;
    applicable_document_types: string[];
  }>;
  invoices?: Array<{
    invoice_number: string | null;
    invoice_date: string | null;
    dispatch_status: string | null;
    workflow_state: string | null;
    total_inv_amount: string | null;
    total_inv_net_amount: string | null;
    total_inv_copay: string | null;
    total_inv_discount: string | null;
    service_type: string | null;
    lines: Array<{
      id: string | null;
      item_code: string | null;
      item_name: string | null;
      intervention_code: string | null;
      quantity: number;
      unit: string | null;
      unit_price: string | null;
      line_total_amount: string | null;
      line_net_amount: string | null;
      line_copay: number;
      charge_date: string | null;
      is_active: boolean;
      scheme_name: string | null;
      map_request: string | null;
    }>;
  }>;
  packages?: string[];
  provider: {
    uuid: string;
    display: string;
    person?: {
      uuid: string;
      display: string;
      gender?: string;
      age?: number;
      birthdate?: string;
      birthDate?: string;
    };
  } | null;
  patient?: {
    uuid: string;
    display: string;
    identifiers?: Array<{ uuid: string; display: string }>;
    person?: {
      display?: string;
      gender?: string;
      age?: number;
      birthdate?: string;
      birthDate?: string;
    };
  };
  location?: { uuid: string; display: string };
  visitType?: { uuid: string; display: string };
  visit?: {
    uuid: string;
    display: string;
    startDatetime: string;
    stopDatetime: string;
    voided?: boolean;
    encounters: Array<{
      uuid: string;
      display: string;
      encounterType?: { uuid: string; display: string };
      diagnoses: Array<{
        uuid: string;
        display?: string;
        certainty?: string;
        voided?: boolean;
        rank?: number;
        diagnosis: {
          coded?: { uuid: string; display: string };
          nonCoded?: string;
          display?: string;
        };
      }>;
      obs?: Array<{ uuid: string; display: string }>;
      orders?: Array<{ uuid: string; display: string; type?: string }>;
    }>;
    attributes?: Array<{
      uuid: string;
      display: string;
      attributeType: { uuid: string; display: string };
      value: string;
    }>;
  };
  bill?: {
    uuid: string;
    totalAmount: number;
    paymentStatus: string;
    paymentType: string;
    startDate: string;
    endDate: string;
    diagnosis?: string | null;
    patient?: {
      uuid: string;
      display: string;
      identifiers?: Array<{ uuid: string; display: string }>;
      person?: {
        display?: string;
        gender?: string;
        age?: number;
        birthdate?: string;
        birthDate?: string;
        dead?: boolean;
        deathDate?: string | null;
        causeOfDeath?: { uuid: string; display: string } | null;
      };
      voided?: boolean;
    };
    providedItems?: Array<{
      uuid: string;
      originUuid: string;
      price: number;
      dateOfServed: string | null;
      status: string;
      numberOfConsumptions: number;
      interventionCode: string | null;
      interventionPackage: string | null;
      item: { uuid: string; display: string };
      patient?: { uuid: string; display: string };
    }>;
  };
  externalId?: string;
  responseUUID?: string;
  insurer?: string;
  adjustment?: string;
  explanation?: string;
  billNumber?: string | null;
  rejectionReason?: string | null;
  guaranteeId?: string;
  dateProcessed?: string | null;
  isResubmitted?: string | null;
  hasClaimReview?: string | null;
  externalApiErrors?: string;
}

export type BillingPromptType = 'patient-chart' | 'billing-orders';

export interface Schema {
  services: Record<string, unknown>;
  commodities: Record<string, unknown>;
}

export type ServiceType = { uuid: string; display: string; id: number };

export type ServiceTypesResponse = {
  setMembers: Array<ServiceType>;
};
export interface Filter {
  paymentMethods?: Array<string>;
  amountRange?: { min: number; max: number };
  serviceTypes?: Array<string>;
  cashiers?: Array<string>;
  status?: string;
}
export interface DataTableRow {
  id: string;
  cells: Array<Cell>;
}

export interface Cell {
  id: string;
  value: any;
  info: Info;
}

export interface Info {
  header: string;
}

export interface Claim {
  id: string;
  status: string;
  claimCode?: string;
  providerName?: string;
  patientName?: string;
  claimedTotal?: number | string;
  approvedTotal?: number | string;
  dateFrom: string;
}

export interface Header {
  key: string;
  header: string;
}

export interface TableProps {
  title: string;
  emptyStateText: string;
  emptyStateHeader: string;
  includeClaimCode?: boolean;
  use?: string;
  renderActionButton?: () => React.ReactNode;
}

export interface ProgressTracker {
  completed: number;
  total: number;
  success?: number;
  failed?: number;
}
export interface checkSHARegNumResponse {
  registrationNumber: string;
}
export type OTPVerificationModalOptions = {
  otpLength?: number;
  onVerify?: (otp: string) => Promise<void>;
  obscureText?: boolean;
  centerBoxes?: boolean;
  phoneNumber: string;
  onRequestOtp?: (phoneNumber: string) => Promise<void>;
  onVerificationSuccess?: () => void;
  expiryMinutes?: number;
};

export interface OtpPayload {
  otp: string;
  receiver: string;
}

export interface OtpContext extends Record<string, string | number> {
  otp: string;
  patient_name: string;
  expiry_time: number;
}

export interface OtpResponse {
  success: boolean;
  message: string;
}

export interface ClaimSummary {
  totalAmount: number;
  facility: string;
  totalItems: number;
  services: string;
  startDate: string;
  endDate: string;
}

export interface DashboardConfig {
  name: string;
  slot: string;
  title: string;
}

interface IdentifierType {
  uuid: string;
  required: boolean;
  name: string;
}

interface PatientIdentifier {
  uuid: string;
  identifier: string;
  identifierType: IdentifierType;
  preferred: boolean;
}

export interface PatientIdentifierResponse {
  results: Array<PatientIdentifier>;
}

export interface OTPSource {
  otpSource?: string;
}

export enum PayerClaimWorkflowState {
  CLARIFICATION_AFTER_AUTOMATIC_CHECKS = 'CLARIFICATION_AFTER_AUTOMATIC_CHECKS',
  CLARIFICATION_AFTER_PAYER_CHECKS = 'CLARIFICATION_AFTER_PAYER_CHECKS',
  CLARIFICATION_AFTER_PAYER_REVIEW = 'CLARIFICATION_AFTER_PAYER_REVIEW',
  DRAFT_PROVIDER_RESUBMITTED = 'DRAFT_PROVIDER_RESUBMITTED',
  REJECTED = 'REJECTED',
  SENT_BACK = 'SENT_BACK',
  MISSING_DOCUMENTS = 'MISSING_DOCUMENTS',
  DRAFT_PROVIDER_RESUBMITTED_MISSING_DOCUMENTS = 'DRAFT_PROVIDER_RESUBMITTED_MISSING_DOCUMENTS',
  PROVIDER_RESUBMISSION_FINALISED = 'PROVIDER_RESUBMISSION_FINALISED',
}

export const PAYER_VALID_RESUBMISSION_STATES = [
  PayerClaimWorkflowState.CLARIFICATION_AFTER_AUTOMATIC_CHECKS,
  PayerClaimWorkflowState.CLARIFICATION_AFTER_PAYER_CHECKS,
  PayerClaimWorkflowState.CLARIFICATION_AFTER_PAYER_REVIEW,
  PayerClaimWorkflowState.DRAFT_PROVIDER_RESUBMITTED,
  PayerClaimWorkflowState.REJECTED,
  PayerClaimWorkflowState.SENT_BACK,
  PayerClaimWorkflowState.MISSING_DOCUMENTS,
  PayerClaimWorkflowState.DRAFT_PROVIDER_RESUBMITTED_MISSING_DOCUMENTS,
  PayerClaimWorkflowState.PROVIDER_RESUBMISSION_FINALISED,
];
