import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SWRConfig } from 'swr';
import { updateRelationship } from '../../relationships/relationship.resources';
import { showSnackbar } from '@openmrs/esm-framework';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EndRelationshipWorkspace from './case-management-workspace.component';

vi.mock('../../relationships/relationship.resources', () => ({
  updateRelationship: vi.fn(),
}));

vi.mock('@openmrs/esm-framework', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openmrs/esm-framework')>()),
  showSnackbar: vi.fn(),
}));

describe('EndRelationshipWorkspace', () => {
  const mockCloseWorkspace = vi.fn();
  const mockRelationshipUuid = '235634748948357462514';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the workspace with the correct content', () => {
    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <EndRelationshipWorkspace
          closeWorkspace={mockCloseWorkspace}
          workspaceProps={{ relationshipUuid: mockRelationshipUuid }}
        />
      </SWRConfig>,
    );

    expect(
      screen.getByText(/this will end the relationship\. are you sure you want to proceed\?/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /discard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('closes the workspace when the discard button is clicked', () => {
    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <EndRelationshipWorkspace
          closeWorkspace={mockCloseWorkspace}
          workspaceProps={{ relationshipUuid: mockRelationshipUuid }}
        />
      </SWRConfig>,
    );

    const discardButton = screen.getByRole('button', { name: /discard/i });
    fireEvent.click(discardButton);

    expect(mockCloseWorkspace).toHaveBeenCalledTimes(1);
  });
});
