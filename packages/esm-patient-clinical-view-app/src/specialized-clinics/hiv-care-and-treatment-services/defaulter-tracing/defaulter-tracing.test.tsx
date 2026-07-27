import React from 'react';
import { screen, render } from '@testing-library/react';
import DefaulterTracing from './defaulter-tracing.component';
import { usePatientTracing } from '../../../hooks/usePatientTracing';
import useEvent from '@testing-library/user-event';
import { useConfig } from '@openmrs/esm-framework';
import { describe, expect, test, vi } from 'vitest';

const { launchWorkspaceMock } = vi.hoisted(() => ({ launchWorkspaceMock: vi.fn() }));
const usePatientTracingMock = vi.mocked(usePatientTracing);

vi.mock('../../../hooks/usePatientTracing', () => ({
  defaulterTracingEncounterUuid: 'some-uuid',
  usePatientTracing: vi.fn(),
}));

vi.mock('@openmrs/esm-patient-common-lib', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openmrs/esm-patient-common-lib')>()),
  useLaunchWorkspaceRequiringVisit: vi.fn(() => launchWorkspaceMock),
  usePatientChartStore: vi.fn(() => ({
    visitContext: { uuid: 'visit-uuid' },
    mutateVisitContext: vi.fn(),
  })),
}));

vi.mocked(useConfig).mockReturnValue({
  formsList: {
    defaulterTracingFormUuid: 'defaulterTracingFormUuid',
  },
});

describe('DefaulterTracing', () => {
  test('should launch `Defaulter Tracing` form', async () => {
    const user = useEvent.setup();
    usePatientTracingMock.mockReturnValue({
      encounters: [],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
      isValidating: false,
    });
    const patient = { resourceType: 'Patient', id: 'patientUuid' } as fhir.Patient;
    render(<DefaulterTracing patientUuid="patientUuid" patient={patient} />);
    const recordDefaulterTracing = screen.getByRole('button', { name: 'Record' });
    await user.click(recordDefaulterTracing);
    expect(launchWorkspaceMock).toHaveBeenCalledWith(
      {
        workspaceTitle: 'Defaulter Tracing Form',
        form: { uuid: 'defaulterTracingFormUuid' },
        encounterUuid: '',
      },
      {},
      expect.objectContaining({
        patient,
        patientUuid: 'patientUuid',
        visitContext: { uuid: 'visit-uuid' },
        mutateVisitContext: expect.any(Function),
      }),
    );
  });
});
