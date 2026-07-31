import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Header from './header.component';

vi.mock('@openmrs/esm-framework', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openmrs/esm-framework')>()),
  PageHeader: ({ title, illustration }: { title: string; illustration: React.ReactNode }) => (
    <div>
      <span>{illustration}</span>
      <h1>{title}</h1>
    </div>
  ),
  AppointmentsPictogram: () => <svg data-testid="appointments-pictogram" />,
}));

describe('Header', () => {
  it('renders the ADR assessment page header with its illustration', () => {
    render(<Header />);

    expect(screen.getByRole('heading', { name: 'ADR Assessment' })).toBeInTheDocument();
    expect(screen.getByTestId('appointments-pictogram')).toBeInTheDocument();
  });
});
