import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SHRDataTable from './shrDataTable.component';

const goTo = vi.hoisted(() => vi.fn());
vi.mock('@openmrs/esm-framework', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openmrs/esm-framework')>()),
  usePagination: vi.fn((data) => ({ results: data.slice(0, 5), goTo, currentPage: 1 })),
}));
vi.mock('@openmrs/esm-patient-common-lib', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openmrs/esm-patient-common-lib')>()),
  PatientChartPagination: ({ onPageNumberChange }: any) => (
    <button onClick={() => onPageNumberChange({ page: 2 })}>Next records page</button>
  ),
}));

describe('SHRDataTable', () => {
  it('shows shared record data and lets the user request another page', async () => {
    const user = userEvent.setup();
    render(
      <SHRDataTable
        data={[{ uuid: 'record-1', service: 'Outpatient' }]}
        tableHeaders={[{ key: 'service', header: 'Service' }]}
      />,
    );

    expect(screen.getByText('Outpatient')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next records page' }));
    expect(goTo).toHaveBeenCalledWith(2);
  });
});
