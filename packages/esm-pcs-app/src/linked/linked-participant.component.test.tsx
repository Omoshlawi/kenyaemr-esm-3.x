import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import LinkedParticipant from './linked-participant.component';
import { usePcsDependants, usePcsParticipant } from '../resources/pcs.resource';
import { type PcsParticipant } from '../types';

vi.mock('@openmrs/esm-framework', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openmrs/esm-framework')>()),
  launchWorkspace2: vi.fn(),
  showModal: vi.fn(),
  useConfig: () => ({
    pcsAttributeTypes: { pbidsEnrollmentStatus: 'pbids-attr', cardseEnrollmentStatus: 'cardse-attr' },
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

vi.mock('../resources/pcs.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../resources/pcs.resource')>()),
  usePcsParticipant: vi.fn(),
  usePcsDependants: vi.fn(),
}));

vi.mock('../resources/link-participant.resource', () => ({
  useSyncStudyAttributes: () => ({ syncNow: vi.fn() }),
}));

vi.mock('./use-study-sync-snackbars', () => ({
  useStudySyncSnackbars: () => ({ onSynced: vi.fn(), onSyncError: vi.fn() }),
}));

// The panels are exercised by their own tests; here they would only add mocking noise.
vi.mock('./participant-details.component', () => ({ default: () => null }));
vi.mock('./dependants-list.component', () => ({ default: () => null }));

const mockUsePcsParticipant = vi.mocked(usePcsParticipant);
const mockUsePcsDependants = vi.mocked(usePcsDependants);

const participant = { individualId: '901-1-1-2', firstName: 'JANE', lastName: 'ODONGO' } as PcsParticipant;

const subject = { name: 'Jane Odongo', phoneNumber: '0712345678', hiePatient: { id: 'hie-1' } } as any;

const renderBanner = () =>
  render(
    <LinkedParticipant
      subject={subject}
      studyParticipantId="901-1-1-2"
      localPatient={{ uuid: 'mother-uuid' }}
      onDelinked={vi.fn()}
    />,
  );

beforeEach(() => {
  vi.clearAllMocks();
  mockUsePcsParticipant.mockReturnValue({ participant, isLoading: false, error: null, mutate: vi.fn() } as any);
  mockUsePcsDependants.mockReturnValue({
    dependants: [],
    totalCount: 0,
    isLoading: false,
    error: null,
    mutate: vi.fn(),
  } as any);
});

describe('LinkedParticipant dependant questions', () => {
  it("launches the add-dependant workspace with the mother's individual ID", async () => {
    renderBanner();

    await userEvent.click(screen.getByRole('button', { name: /Dependant not in HIE and PCS\?/ }));

    // The feature's only entry point — a drifted workspace name fails silently in the browser.
    expect(launchWorkspace2).toHaveBeenCalledWith(
      'pcs-add-dependant-workspace-form',
      expect.objectContaining({ motherIndividualId: '901-1-1-2' }),
    );
  });

  it('revalidates the dependants list once the child is created', async () => {
    const mutateDependants = vi.fn();
    mockUsePcsDependants.mockReturnValue({
      dependants: [],
      totalCount: 0,
      isLoading: false,
      error: null,
      mutate: mutateDependants,
    } as any);

    renderBanner();
    await userEvent.click(screen.getByRole('button', { name: /Dependant not in HIE and PCS\?/ }));

    // Without this the new child does not appear until the page is refreshed.
    vi.mocked(launchWorkspace2).mock.calls[0][1].onCreated();
    expect(mutateDependants).toHaveBeenCalled();
  });

  it('holds the question closed until the participant has loaded', () => {
    mockUsePcsParticipant.mockReturnValue({ participant: null, isLoading: true, error: null, mutate: vi.fn() } as any);

    renderBanner();

    // The handler reads participant.individualId, so an early click would throw.
    expect(screen.getByRole('button', { name: /Dependant not in HIE and PCS\?/ })).toBeDisabled();
  });

  it("launches the HIE-dependant workspace with the mother's record and ID", async () => {
    renderBanner();

    await userEvent.click(screen.getByRole('button', { name: /Dependant in HIE and not PCS\?/ }));

    // hiePatient is the candidate list's only source — without it the workspace shows empty.
    expect(launchWorkspace2).toHaveBeenCalledWith(
      'pcs-link-hie-dependant-workspace-form',
      expect.objectContaining({
        motherIndividualId: '901-1-1-2',
        hiePatient: subject.hiePatient,
        parentPhoneNumber: '0712345678',
      }),
    );
  });

  it('holds the HIE question closed until the participant has loaded', () => {
    mockUsePcsParticipant.mockReturnValue({ participant: null, isLoading: true, error: null, mutate: vi.fn() } as any);

    renderBanner();

    expect(screen.getByRole('button', { name: /Dependant in HIE and not PCS\?/ })).toBeDisabled();
  });
});
