import React, { type PropsWithChildren } from 'react';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { openmrsFetch } from '@openmrs/esm-api';
import {
  type DrugOrderBasketItem,
  type PostDataPrepFunction,
  useOrderBasket,
  usePatientChartStore,
} from '@openmrs/esm-patient-common-lib';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PatientDiagnosisComponent from './patient-diagnosis.component';

vi.mock('@openmrs/esm-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openmrs/esm-api')>()),
  openmrsFetch: vi.fn(),
}));

vi.mock('@openmrs/esm-framework', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openmrs/esm-framework')>()),
  useVisit: (await import('@openmrs/esm-framework-real')).useVisit,
}));

let patientUuid: string;
let patient: fhir.Patient;
let patientSequence = 0;
const drugOrder = {
  uuid: 'drug-order-1',
  drug: { uuid: 'drug-1' },
  isOrderIncomplete: false,
} as DrugOrderBasketItem;

const mockOpenmrsFetch = vi.mocked(openmrsFetch);

const TestWrapper = ({ children }: PropsWithChildren) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
);

function seedPatient() {
  const patientStore = renderHook(() => usePatientChartStore(patientUuid));
  act(() => patientStore.result.current.setPatient(patient));
  patientStore.unmount();
}

const identityPostDataPrep = ((order: DrugOrderBasketItem) => order) as unknown as PostDataPrepFunction;

function useDrugBasket() {
  return useOrderBasket<DrugOrderBasketItem>(patient, 'drug', identityPostDataPrep);
}

function renderDrugBasket() {
  return renderHook(useDrugBasket);
}

function renderPatientDiagnosis() {
  return render(<PatientDiagnosisComponent patientUuid={patientUuid} />, { wrapper: TestWrapper });
}

function respondWithVisit(diagnoses: Array<{ rank: number }> = []) {
  mockOpenmrsFetch.mockResolvedValue({
    data: {
      results: [
        {
          uuid: 'visit-1',
          stopDatetime: null,
          encounters: [{ uuid: 'encounter-1', diagnoses }],
        },
      ],
    },
  } as never);
}

describe('<PatientDiagnosisComponent />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    patientSequence += 1;
    patientUuid = `patient-${patientSequence}`;
    patient = { id: patientUuid } as fhir.Patient;
    seedPatient();
  });

  it('warns the user without blocking the medication order when a main diagnosis is missing', async () => {
    const basket = renderDrugBasket();
    act(() => basket.result.current.setOrders([drugOrder]));
    respondWithVisit();

    renderPatientDiagnosis();

    const warning = await screen.findByRole('status');
    expect(warning).toHaveTextContent('Main diagnosis required');
    expect(warning).toHaveTextContent(
      'Main diagnosis is required, please add main diagnosis to the clinical encounter form',
    );
    expect(basket.result.current.orders[0].isOrderIncomplete).toBe(false);
  });

  it('does not warn or fetch the visit when the basket has no medication', () => {
    const basket = renderDrugBasket();
    act(() => basket.result.current.setOrders([]));

    renderPatientDiagnosis();

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(mockOpenmrsFetch).not.toHaveBeenCalled();
  });

  it('does not warn while the visit request is pending', () => {
    const basket = renderDrugBasket();
    act(() => basket.result.current.setOrders([drugOrder]));
    mockOpenmrsFetch.mockReturnValue(new Promise(() => {}) as never);

    renderPatientDiagnosis();

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('does not warn when a main diagnosis exists', async () => {
    const basket = renderDrugBasket();
    act(() => basket.result.current.setOrders([drugOrder]));
    respondWithVisit([{ rank: 2 }]);

    renderPatientDiagnosis();

    await waitFor(() => expect(mockOpenmrsFetch).toHaveBeenCalled());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
