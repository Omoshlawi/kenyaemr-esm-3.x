import React from 'react';
import { screen, render, waitFor } from '@testing-library/react';
import { useFormContext } from 'react-hook-form';
import { useConfig, useFeatureFlag, usePatient, useSession } from '@openmrs/esm-framework';
import BillingCheckInForm, { type VisitFormCallbacks } from './billing-checkin-form.component';
import { createPatientBill, useBillableItems, useCashPoint } from '../billing.resource';
import { useFacilityRegistry } from '../hooks/useFacilityRegistry';
import { useSHAEligibility } from './hie.resource';
import {
  useBiometricAgentStatus,
  useBiometricConfig,
  useElectiveCheckin,
  useOtpWhitelistReasons,
  usePatientPhone,
  useProviderNationalId,
} from './social-health-authority/sha-virtual-claim.resource';

vi.mock('@openmrs/esm-framework', () => ({
  showModal: vi.fn(),
  showSnackbar: vi.fn(),
  useConfig: vi.fn(),
  useFeatureFlag: vi.fn(),
  usePatient: vi.fn(),
  useSession: vi.fn(),
}));

vi.mock('../billing.resource', () => ({
  useBillableItems: vi.fn(),
  useCashPoint: vi.fn(),
  createPatientBill: vi.fn(),
  createVisitAttribute: vi.fn(),
}));

vi.mock('../hooks/useFacilityRegistry', () => ({
  useFacilityRegistry: vi.fn(),
}));

vi.mock('./hie.resource', () => ({
  useSHAEligibility: vi.fn(),
}));

vi.mock('./social-health-authority/sha-virtual-claim.resource', () => ({
  addVisitAttribute: vi.fn(),
  checkBiometricAuthorizationStatus: vi.fn(),
  createSHABiometricAuthorize: vi.fn(),
  createSHAVirtualClaim: vi.fn(),
  detectAuthorizingDeviceOS: vi.fn(() => 'web'),
  fetchWhitelistStatus: vi.fn(),
  linkVisitToClaim: vi.fn(),
  rejectBiometricAuthorization: vi.fn(),
  sendSHAOtp: vi.fn(),
  submitOtpWhitelist: vi.fn(),
  useBiometricAgentStatus: vi.fn(),
  useBiometricConfig: vi.fn(),
  useElectiveCheckin: vi.fn(),
  useOtpWhitelistReasons: vi.fn(),
  usePatientPhone: vi.fn(),
  useProviderNationalId: vi.fn(),
}));

// These SHA-flow children are irrelevant here (shaEnabled is false in every test below) — stubbed
// out so the test only has to reason about billing-checkin-form itself.
vi.mock('./social-health-authority/sha-number-validity.component', () => ({ default: () => null }));
vi.mock('../benefits-package/forms/packages-and-interventions-form.component', () => ({ default: () => null }));
vi.mock('./elective-item.component', () => ({ default: () => null }));
vi.mock('./social-health-authority/pomsf-scheme-balance-picker.component', () => ({ default: () => null }));

const PAYMENT_MODE_UUID = 'cash-payment-mode-uuid';

// Stands in for the real visit-attributes form: sets a payment method (so the "Chargeable
// service" section becomes eligible to render) without exercising its own unrelated UI. Declared
// as a named function (rather than inline in the vi.mock factory) so eslint's rules-of-hooks
// name-based heuristic recognizes it as a component.
function MockVisitAttributesForm({
  setAttributes,
}: {
  setAttributes: (attrs: Array<{ attributeType: string; value: string }>) => void;
}) {
  const { setValue } = useFormContext();
  React.useEffect(() => {
    setValue('paymentMethods', PAYMENT_MODE_UUID, { shouldDirty: true });
    setAttributes([]);
  }, [setValue, setAttributes]);
  return null;
}

vi.mock('./visit-attributes/visit-attributes-form.component', () => ({
  default: MockVisitAttributesForm,
}));

const mockUseConfig = useConfig as vi.MockedFunction<typeof useConfig>;
const mockUseFeatureFlag = useFeatureFlag as vi.MockedFunction<typeof useFeatureFlag>;
const mockUsePatient = usePatient as vi.MockedFunction<typeof usePatient>;
const mockUseSession = useSession as vi.MockedFunction<typeof useSession>;
const mockUseBillableItems = useBillableItems as vi.MockedFunction<typeof useBillableItems>;
const mockUseCashPoint = useCashPoint as vi.MockedFunction<typeof useCashPoint>;
const mockCreatePatientBill = createPatientBill as vi.MockedFunction<typeof createPatientBill>;
const mockUseFacilityRegistry = useFacilityRegistry as vi.MockedFunction<typeof useFacilityRegistry>;
const mockUseSHAEligibility = useSHAEligibility as vi.MockedFunction<typeof useSHAEligibility>;
const mockUseOtpWhitelistReasons = useOtpWhitelistReasons as vi.MockedFunction<typeof useOtpWhitelistReasons>;
const mockUsePatientPhone = usePatientPhone as vi.MockedFunction<typeof usePatientPhone>;
const mockUseProviderNationalId = useProviderNationalId as vi.MockedFunction<typeof useProviderNationalId>;
const mockUseBiometricConfig = useBiometricConfig as vi.MockedFunction<typeof useBiometricConfig>;
const mockUseBiometricAgentStatus = useBiometricAgentStatus as vi.MockedFunction<typeof useBiometricAgentStatus>;
const mockUseElectiveCheckin = useElectiveCheckin as vi.MockedFunction<typeof useElectiveCheckin>;

const INPATIENT_VISIT_TYPE_UUID = 'inpatient-visit-type-uuid';
const OUTPATIENT_VISIT_TYPE_UUID = 'outpatient-visit-type-uuid';

const consultationService = {
  uuid: '864506f8-ab5d-4851-8ed3-5dcb3d40c302',
  name: 'consultation',
  shortName: 'CONSULT',
  serviceStatus: 'ENABLED',
  serviceType: { uuid: '167410AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', display: 'Clinical consultation' },
  servicePrices: [
    {
      uuid: 'f8f5c043-125f-4c13-a249-6023fbe680c0',
      name: 'Insurance',
      paymentMode: { uuid: 'insurance-payment-mode-uuid', name: 'Insurance' },
      price: 255,
    },
  ],
};

const lineItems = [
  consultationService,
  {
    uuid: 'lab-testing-uuid',
    name: 'Lab Testing',
    shortName: 'LAB',
    serviceStatus: 'ENABLED',
    serviceType: { display: 'Laboratory' },
    servicePrices: [],
  },
];

const testProps = {
  patientUuid: 'some-patient-uuid',
  setVisitFormCallbacks: vi.fn(),
  visitStatus: 'ongoing',
  visitTypeUuid: OUTPATIENT_VISIT_TYPE_UUID,
};

function renderBillingCheckinForm(overrides: Partial<typeof testProps> = {}) {
  return render(<BillingCheckInForm {...testProps} {...overrides} />);
}

describe('BillingCheckInForm', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockUseConfig.mockReturnValue({
      visitAttributeTypes: { isPatientExempted: 'exempted-attr-uuid', claimScheme: 'claim-scheme-uuid' },
      inPatientVisitTypeUuid: INPATIENT_VISIT_TYPE_UUID,
      crIdentificationNumberUUID: 'cr-id-uuid',
      enableSHAVerification: true,
      minorOtpAgeThreshold: 18,
    } as any);
    // shaEnabled = hieFeatureFlags && enableSHAVerification — keeping the SHA flow off lets these
    // tests focus purely on the billing-service picker without needing to mock the SHA UI.
    mockUseFeatureFlag.mockReturnValue(false);
    mockUsePatient.mockReturnValue({ patient: undefined } as any);
    mockUseSession.mockReturnValue({ currentProvider: { uuid: 'provider-uuid' } } as any);
    mockUseSHAEligibility.mockReturnValue({
      isPatientWhiteListed: false,
      facilityBiometricsEnforced: false,
      eligibilityData: undefined,
    } as any);
    mockUseOtpWhitelistReasons.mockReturnValue({ reasons: [] } as any);
    mockUsePatientPhone.mockReturnValue('' as any);
    mockUseProviderNationalId.mockReturnValue({ providerNationalid: undefined } as any);
    mockUseBiometricConfig.mockReturnValue({ agentUrl: undefined } as any);
    mockUseBiometricAgentStatus.mockReturnValue({ workstationId: undefined } as any);
    mockUseElectiveCheckin.mockReturnValue({ electiveRecord: null, isApproved: false, isAlreadyUsed: false } as any);
    mockUseCashPoint.mockReturnValue({
      cashPoints: [{ uuid: 'cash-point-uuid' }],
      isLoading: false,
      error: null,
    } as any);
    mockCreatePatientBill.mockResolvedValue({} as any);
  });

  test('shows the loading spinner while retrieving billing data', () => {
    mockUseBillableItems.mockReturnValue({
      lineItems: [],
      consultationService: null,
      isLoading: true,
      error: null,
      searchTerm: '',
      setSearchTerm: vi.fn(),
    } as any);
    mockUseFacilityRegistry.mockReturnValue({ facilityLevel: '1' } as any);

    renderBillingCheckinForm();

    expect(screen.getByText(/Loading billing services/)).toBeInTheDocument();
  });

  test('shows an error notification when billing data fails to load', () => {
    mockUseBillableItems.mockReturnValue({
      lineItems: [],
      consultationService: null,
      isLoading: false,
      error: new Error('Internal server error'),
      searchTerm: '',
      setSearchTerm: vi.fn(),
    } as any);
    mockUseFacilityRegistry.mockReturnValue({ facilityLevel: '1' } as any);

    renderBillingCheckinForm();

    expect(screen.getByText('Bill service error')).toBeInTheDocument();
    expect(screen.getByText('Error loading bill services')).toBeInTheDocument();
  });

  test('shows the chargeable service picker for a non-Level-2 facility', () => {
    mockUseFacilityRegistry.mockReturnValue({ facilityLevel: '1' } as any);
    mockUseBillableItems.mockReturnValue({
      lineItems,
      consultationService,
      isLoading: false,
      error: null,
      searchTerm: '',
      setSearchTerm: vi.fn(),
    } as any);

    renderBillingCheckinForm();

    expect(screen.getByText('Search services')).toBeInTheDocument();
  });

  test('shows the chargeable service picker for an inpatient visit at a Level 2 facility', () => {
    // Level 2 facilities are outpatient-only dispensaries — an inpatient visit there still needs
    // the normal manual picker, since the fixed-consultation shortcut only applies to outpatients.
    mockUseFacilityRegistry.mockReturnValue({ facilityLevel: '2' } as any);
    mockUseBillableItems.mockReturnValue({
      lineItems,
      consultationService,
      isLoading: false,
      error: null,
      searchTerm: '',
      setSearchTerm: vi.fn(),
    } as any);

    renderBillingCheckinForm({ visitTypeUuid: INPATIENT_VISIT_TYPE_UUID });

    expect(screen.getByText('Search services')).toBeInTheDocument();
  });

  test('hides the chargeable service picker and bills the default consultation service for a Level 2 PHC outpatient visit', async () => {
    mockUseFacilityRegistry.mockReturnValue({ facilityLevel: '2' } as any);
    mockUseBillableItems.mockReturnValue({
      lineItems,
      consultationService,
      isLoading: false,
      error: null,
      searchTerm: '',
      setSearchTerm: vi.fn(),
    } as any);

    renderBillingCheckinForm({ visitTypeUuid: OUTPATIENT_VISIT_TYPE_UUID });

    expect(screen.queryByText('Search services')).not.toBeInTheDocument();

    await waitFor(() => expect(testProps.setVisitFormCallbacks).toHaveBeenCalled());
    const lastCallbacks: VisitFormCallbacks =
      testProps.setVisitFormCallbacks.mock.calls[testProps.setVisitFormCallbacks.mock.calls.length - 1][0];

    await lastCallbacks.onVisitCreatedOrUpdated({ uuid: 'visit-uuid' } as any);

    expect(mockCreatePatientBill).toHaveBeenCalledWith(
      expect.objectContaining({
        lineItems: [expect.objectContaining({ billableService: consultationService.uuid })],
      }),
    );
  });
});
