import React from 'react';
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { openmrsFetch, useVisit } from '@openmrs/esm-framework';
import { renderWithSwr } from '../../../../tools/test-helpers';
import PatientVisitSummary from './visit-summary.component';
import { buildVisitSummary, fullVitals, mockVisits, mockVisitSummary } from './visit-summary.mock';
import type { VisitSummary } from './visit-summary.resource';

const mockUseVisit = vi.mocked(useVisit);
const mockOpenmrsFetch = vi.mocked(openmrsFetch);

function setupFetch(summary: VisitSummary = mockVisitSummary, visits = mockVisits) {
  mockOpenmrsFetch.mockImplementation((url: string) => {
    if (url.includes('visitSummary')) {
      return Promise.resolve({ data: summary }) as ReturnType<typeof openmrsFetch>;
    }
    return Promise.resolve({ data: { results: visits } }) as ReturnType<typeof openmrsFetch>;
  });
}

function setActiveVisit(uuid: string | null) {
  mockUseVisit.mockReturnValue({ activeVisit: uuid ? { uuid } : null, isLoading: false } as ReturnType<
    typeof useVisit
  >);
}

beforeEach(() => {
  vi.clearAllMocks();
  setActiveVisit('visit-1');
  setupFetch();
});

describe('PatientVisitSummary', () => {
  it('shows a loading skeleton while the visit is loading', () => {
    mockUseVisit.mockReturnValue({ activeVisit: null, isLoading: true } as ReturnType<typeof useVisit>);

    const { container } = renderWithSwr(<PatientVisitSummary patientUuid="patient-1" />);

    expect(container.querySelector('[class*="skeleton"]')).toBeInTheDocument();
    expect(screen.queryByText('CASE SUMMARY:')).not.toBeInTheDocument();
  });

  it('shows an empty state when the patient has no visits', async () => {
    setActiveVisit(null);
    setupFetch(mockVisitSummary, []);

    renderWithSwr(<PatientVisitSummary patientUuid="patient-1" />);

    expect(await screen.findByText('No visits found for this patient.')).toBeInTheDocument();
  });

  it('shows an error state when the visit summary fails to load', async () => {
    mockOpenmrsFetch.mockImplementation((url: string) => {
      if (url.includes('visitSummary')) {
        return Promise.reject(new Error('boom')) as ReturnType<typeof openmrsFetch>;
      }
      return Promise.resolve({ data: { results: mockVisits } }) as ReturnType<typeof openmrsFetch>;
    });

    renderWithSwr(<PatientVisitSummary patientUuid="patient-1" />);

    expect(await screen.findByText('Error State')).toBeInTheDocument();
  });

  it('renders the visit summary sections for the active visit', async () => {
    renderWithSwr(<PatientVisitSummary patientUuid="patient-1" />);

    expect(await screen.findByText('CASE SUMMARY:')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Latest Vitals' })).toBeInTheDocument();
    expect(screen.getByText('Malaria')).toBeInTheDocument();
    expect(screen.getByText('Paracetamol')).toBeInTheDocument();
  });

  it('falls back to the most recent visit when there is no active visit', async () => {
    setActiveVisit(null);

    renderWithSwr(<PatientVisitSummary patientUuid="patient-1" />);

    expect(await screen.findByText('CASE SUMMARY:')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Latest Vitals' })).toBeInTheDocument();
  });

  it('shows no critical alert when blood pressure is absent', async () => {
    setupFetch(
      buildVisitSummary({
        vitals: { ...fullVitals, bloodPressure: { value: null, unit: 'mmHg', interpretation: null } },
      }),
    );

    renderWithSwr(<PatientVisitSummary patientUuid="patient-1" />);

    await screen.findByRole('heading', { name: 'Latest Vitals' });
    expect(screen.queryByText(/Elevated Blood Pressure/)).not.toBeInTheDocument();
  });

  it('shows a critical alert when blood pressure is elevated', async () => {
    setupFetch(
      buildVisitSummary({
        vitals: { ...fullVitals, bloodPressure: { value: '150/95', unit: 'mmHg', interpretation: null } },
      }),
    );

    renderWithSwr(<PatientVisitSummary patientUuid="patient-1" />);

    expect(await screen.findByText(/Elevated Blood Pressure/)).toBeInTheDocument();
  });

  it('does not show a critical alert when blood pressure is normal', async () => {
    renderWithSwr(<PatientVisitSummary patientUuid="patient-1" />);

    await screen.findByRole('heading', { name: 'Latest Vitals' });
    expect(screen.queryByText(/Elevated Blood Pressure/)).not.toBeInTheDocument();
  });

  it('renders the history section when history data is present', async () => {
    renderWithSwr(<PatientVisitSummary patientUuid="patient-1" />);

    expect(await screen.findByText('HISTORY & EXAMINATION')).toBeInTheDocument();
  });

  it('hides the history section when there is no history data', async () => {
    setupFetch(buildVisitSummary({ complaints: [], conditions: [], allergies: [], clinicalNotes: [] }));

    renderWithSwr(<PatientVisitSummary patientUuid="patient-1" />);

    await screen.findByRole('heading', { name: 'Latest Vitals' });
    expect(screen.queryByText('HISTORY & EXAMINATION')).not.toBeInTheDocument();
  });
});
