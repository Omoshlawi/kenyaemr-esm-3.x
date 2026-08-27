import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PCSSearchResults from './pcs-search.component';
import { usePcsParticipantSearch } from './pcs.resource';
import { type PcsSearchSubject } from './pcs.types';

vi.mock('@openmrs/esm-framework', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openmrs/esm-framework')>()),
  ErrorState: () => null,
}));

// Interpolates, unlike the bare fallback mock used elsewhere — the tag labels under test
// are built from `{{value}}`.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string, options?: Record<string, unknown>) =>
      fallback.replace(/{{(\w+)}}/g, (_match, name) => String(options?.[name] ?? '')),
  }),
}));

// The boundary that receives the committed filters. Keeping the rest of the module real
// means `toPcsParticipantFilters` and `hasAnyFilter` still drive the component.
vi.mock('./pcs.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./pcs.resource')>()),
  usePcsParticipantSearch: vi.fn(),
}));

vi.mock('./pcs-participant.component', () => ({ default: () => null }));

const mockUsePcsParticipantSearch = vi.mocked(usePcsParticipantSearch);

const subject: PcsSearchSubject = {
  id: 'patient-uuid',
  source: 'local',
  name: 'Mary Akinyi Odongo',
  gender: 'female',
  birthDate: '1991-04-12',
  nationalId: '12345678',
  phoneNumber: '0712345678',
};

const committedFilters = () => mockUsePcsParticipantSearch.mock.calls.at(-1)?.[0];

beforeEach(() => {
  vi.clearAllMocks();
  mockUsePcsParticipantSearch.mockReturnValue({
    participants: [],
    totalCount: 0,
    isLoading: false,
    error: undefined,
  });
});

describe('PCS filter bar', () => {
  it('searches on the patient demographics, tagging what was derived for you', () => {
    render(<PCSSearchResults subject={subject} />);

    expect(committedFilters()).toEqual({ name: 'Mary Akinyi Odongo', village: '', phone: '0712345678' });
    expect(screen.getByText('Name: Mary Akinyi Odongo')).toBeInTheDocument();
    expect(screen.getByText('Phone: 0712345678')).toBeInTheDocument();
    // Village is the search box, so it never appears as a tag — and a patient carries no
    // village, so the box starts empty.
    expect(screen.getByPlaceholderText('Village name')).toHaveValue('');
    expect(screen.queryByText(/^Village:/)).not.toBeInTheDocument();
  });

  it('dismissing the name tag drops that filter and re-searches immediately', async () => {
    const user = userEvent.setup();
    render(<PCSSearchResults subject={subject} />);

    await user.click(screen.getByRole('button', { name: 'Remove Name: Mary Akinyi Odongo' }));

    expect(committedFilters()).toEqual({ name: '', village: '', phone: '0712345678' });
    expect(screen.queryByText('Name: Mary Akinyi Odongo')).not.toBeInTheDocument();
    expect(screen.getByText('Phone: 0712345678')).toBeInTheDocument();
  });

  it('searches the village typed into the box without tagging it', async () => {
    const user = userEvent.setup();
    render(<PCSSearchResults subject={subject} />);

    await user.type(screen.getByPlaceholderText('Village name'), 'KAMBI{Enter}');

    expect(committedFilters()).toEqual({ name: 'Mary Akinyi Odongo', village: 'KAMBI', phone: '0712345678' });
    expect(screen.queryByText('Village: KAMBI')).not.toBeInTheDocument();
  });

  it('discards an uncommitted name edit when the panel is collapsed', async () => {
    const user = userEvent.setup();
    render(<PCSSearchResults subject={subject} />);

    await user.click(screen.getByRole('button', { name: 'Edit filters' }));
    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Someone Else');
    await user.click(screen.getByRole('button', { name: 'Hide filters' }));

    // Never searched, so it must not appear as a tag describing the results.
    expect(screen.queryByText('Name: Someone Else')).not.toBeInTheDocument();
    expect(screen.getByText('Name: Mary Akinyi Odongo')).toBeInTheDocument();
    expect(committedFilters()).toEqual({ name: 'Mary Akinyi Odongo', village: '', phone: '0712345678' });
  });

  it('commits an edited name on submit and tags it', async () => {
    const user = userEvent.setup();
    render(<PCSSearchResults subject={subject} />);

    await user.click(screen.getByRole('button', { name: 'Edit filters' }));
    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Someone Else');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(committedFilters()).toEqual({ name: 'Someone Else', village: '', phone: '0712345678' });

    await user.click(screen.getByRole('button', { name: 'Hide filters' }));
    expect(screen.getByText('Name: Someone Else')).toBeInTheDocument();
  });

  it('opens the panel and stops searching once every filter is gone', async () => {
    const user = userEvent.setup();
    render(<PCSSearchResults subject={{ ...subject, phoneNumber: null }} />);

    await user.click(screen.getByRole('button', { name: 'Remove Name: Mary Akinyi Odongo' }));

    expect(committedFilters()).toEqual({ name: '', village: '', phone: '' });
    expect(screen.getByText('Add a filter to search the PCS registry')).toBeInTheDocument();
    // The panel opens itself so there are fields to type into.
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });
});
