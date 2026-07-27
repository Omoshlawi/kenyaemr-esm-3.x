import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { launchWorkspace, showModal, showSnackbar, usePagination, useSession } from '@openmrs/esm-framework';
import { mutate } from 'swr';
import { useParams } from 'react-router-dom';
import { usePharmacyPatients, usePharmacyUsers, useUserMappedPharmacies } from '../hooks';
import { revokePharamacyAssignment } from '../pharmacy.resources';
import PharmaciesTable from './pharmacy-table.component';
import { PharmacyPatients } from './pharmacy-patients.component';
import { PharmacyUsers } from './pharmacy-users.component';

vi.mock('swr', async (importOriginal) => ({ ...(await importOriginal<any>()), mutate: vi.fn() }));
vi.mock('react-router-dom', async (importOriginal) => ({ ...(await importOriginal<any>()), useParams: vi.fn() }));
vi.mock('../hooks', () => ({
  usePharmacyPatients: vi.fn(),
  usePharmacyUsers: vi.fn(),
  useUserMappedPharmacies: vi.fn(),
}));
vi.mock('../pharmacy.resources', () => ({ revokePharamacyAssignment: vi.fn() }));
vi.mock('@openmrs/esm-patient-common-lib', () => ({
  CardHeader: ({ title, children }) => (
    <header>
      <h3>{title}</h3>
      {children}
    </header>
  ),
  EmptyDataIllustration: () => <span>empty illustration</span>,
  usePaginationInfo: () => ({ pageSizes: [1, 10] }),
}));
vi.mock('@carbon/react', () => {
  const Element = ({ children, ...props }) => {
    const clean = { ...props };
    delete clean.useZebraStyles;
    delete clean.renderIcon;
    delete clean.kind;
    return <div {...clean}>{children}</div>;
  };
  return {
    Button: ({ children, ...props }) => <button {...props}>{children}</button>,
    DataTableSkeleton: () => <div>loading table</div>,
    Layer: Element,
    Tile: Element,
    Table: ({ children }) => <table>{children}</table>,
    TableBody: ({ children }) => <tbody>{children}</tbody>,
    TableCell: ({ children }) => <td>{children}</td>,
    TableContainer: Element,
    TableHead: ({ children }) => <thead>{children}</thead>,
    TableHeader: ({ children }) => <th>{children}</th>,
    TableRow: ({ children }) => <tr>{children}</tr>,
    Pagination: ({ onChange }) => <button onClick={() => onChange({ page: 2, pageSize: 1 })}>Next page</button>,
    DataTable: ({ rows, headers, render: renderTable }) =>
      renderTable({
        rows: rows.map((row) => ({
          id: row.id,
          cells: headers.map((header) => ({ id: `${row.id}-${header.key}`, value: row[header.key] })),
        })),
        headers,
        getHeaderProps: ({ header }) => ({ key: header.key }),
        getTableProps: () => ({}),
        getTableContainerProps: () => ({}),
      }),
  };
});

const goTo = vi.fn();
vi.mock('@openmrs/esm-framework', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    ConfigurableLink: ({ to, children }) => <a href={to}>{children}</a>,
    ErrorState: ({ headerTitle, error }) => (
      <div>
        {headerTitle}: {error.message}
      </div>
    ),
    UserHasAccess: ({ children }) => <>{children}</>,
    isDesktop: () => true,
    launchWorkspace: vi.fn(),
    showModal: vi.fn(),
    showSnackbar: vi.fn(),
    useLayoutType: () => 'large-desktop',
    usePagination: vi.fn(),
    useSession: vi.fn(),
  };
});

const patient = {
  uuid: 'patient-1',
  openmrsId: '10001',
  name: 'Jane Patient',
  age: undefined,
  gender: undefined,
  telephoneContact: undefined,
  dateMapped: '2 Jan 2025',
};
const userRecord = { uuid: 'user-1', name: 'Ada Admin', dateMapped: '2 Jan 2025' };
const pharmacy = {
  uuid: 'pharmacy-1',
  name: 'Afya Pharmacy',
  dateMaped: '2 Jan 2025',
  cityVillage: undefined,
  stateProvince: undefined,
  countyDistrict: undefined,
};

describe('pharmacy workflow tables', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useParams).mockReturnValue({ pharmacyUuid: 'pharmacy-1' });
    vi.mocked(useSession).mockReturnValue({ user: { uuid: 'session-user' } } as any);
    vi.mocked(usePagination).mockImplementation(
      (items) =>
        ({
          results: items,
          totalPages: 1,
          currentPage: 1,
          goTo,
        } as any),
    );
  });

  it.each([
    ['mapped pharmacies', PharmaciesTable, useUserMappedPharmacies],
    ['patients', PharmacyPatients, usePharmacyPatients],
    ['users', PharmacyUsers, usePharmacyUsers],
  ])('renders loading and error states for %s', (_label, Component, hook) => {
    vi.mocked(hook as any).mockReturnValue({ isLoading: true, error: null, patients: [], users: [], pharmacies: [] });
    const view = render(<Component />);
    expect(screen.getByText('loading table')).toBeVisible();
    vi.mocked(hook as any).mockReturnValue({
      isLoading: false,
      error: new Error('request failed'),
      patients: [],
      users: [],
      pharmacies: [],
    });
    view.rerender(<Component />);
    expect(screen.getByText(/request failed/)).toBeVisible();
  });

  it('renders empty mapped pharmacy, patient, and user states with assignment controls', async () => {
    const user = userEvent.setup();
    vi.mocked(useUserMappedPharmacies).mockReturnValue({ isLoading: false, error: null, pharmacies: [] });
    const view = render(<PharmaciesTable />);
    expect(screen.getByText('No Community Pharmacies to list.')).toBeVisible();
    expect(useUserMappedPharmacies).toHaveBeenCalledWith('session-user');

    vi.mocked(usePharmacyPatients).mockReturnValue({ isLoading: false, error: null, patients: [] });
    view.rerender(<PharmacyPatients />);
    expect(screen.getByText('No Pharmacy Patients to list.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Assign Patient' }));
    expect(launchWorkspace).toHaveBeenLastCalledWith('pharmacy-assignment-form', {
      workspaceTitle: 'Pharmacy Assignment Form',
      pharmacyUuid: 'pharmacy-1',
      type: 'org.openmrs.Patient',
    });

    vi.mocked(usePharmacyUsers).mockReturnValue({ isLoading: false, error: null, users: [] });
    view.rerender(<PharmacyUsers />);
    expect(screen.getByText('No Pharmacy users to list.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Assign User' }));
    expect(launchWorkspace).toHaveBeenLastCalledWith(
      'pharmacy-assignment-form',
      expect.objectContaining({
        pharmacyUuid: 'pharmacy-1',
        type: 'org.openmrs.User',
      }),
    );
  });

  it('renders mapped pharmacy values, links, fallbacks, headings, and pagination', async () => {
    vi.mocked(useUserMappedPharmacies).mockReturnValue({
      isLoading: false,
      error: null,
      pharmacies: [pharmacy],
    } as any);
    render(<PharmaciesTable />);
    expect(screen.getByRole('heading', { name: 'Community Pharmacies (1)' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Afya Pharmacy' })).toHaveAttribute(
      'href',
      '/openmrs/spa/home/pharmacy/pharmacy-1',
    );
    expect(screen.getByText('Date Mapped')).toBeVisible();
    expect(screen.getAllByText('--')).toHaveLength(3);
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(goTo).toHaveBeenCalledWith(2);
  });

  it.each([
    [
      'patient',
      PharmacyPatients,
      usePharmacyPatients,
      { patients: [patient] },
      'Jane Patient',
      '/patient/patient-1/chart/Patient Summary',
    ],
    ['user', PharmacyUsers, usePharmacyUsers, { users: [userRecord] }, 'Ada Admin', null],
  ])('assigns and revokes a populated %s row', async (_label, Component, hook, records, visibleName, href) => {
    const actor = userEvent.setup();
    vi.mocked(hook as any).mockReturnValue({ isLoading: false, error: null, ...records });
    const dispose = vi.fn();
    let modalProps;
    vi.mocked(showModal).mockImplementation((_name, props) => {
      modalProps = props;
      return dispose;
    });
    vi.mocked(revokePharamacyAssignment).mockResolvedValue('Access revoked');
    render(<Component />);
    expect(screen.getByText(visibleName)).toBeVisible();
    if (href) {
      expect(screen.getByRole('link', { name: visibleName })).toHaveAttribute('href', expect.stringContaining(href));
    }
    await actor.click(screen.getByRole('button', { name: /^Assign/ }));
    await actor.click(screen.getByRole('button', { name: 'Revoke' }));
    expect(showModal).toHaveBeenCalledWith('pharmacy-delete-confirm-dialog', expect.any(Object));
    modalProps.onClose();
    expect(dispose).toHaveBeenCalledOnce();
    modalProps.onDelete();
    await waitFor(() => expect(revokePharamacyAssignment).toHaveBeenCalled());
    expect(dispose).toHaveBeenCalledTimes(2);
    expect(showSnackbar).toHaveBeenCalledWith({ kind: 'success', subtitle: 'Access revoked', title: 'Success' });
    const payload = vi.mocked(revokePharamacyAssignment).mock.calls[0][0];
    expect(payload).toMatchObject({
      entityIdentifier: _label === 'patient' ? 'patient-1' : 'user-1',
      basisIdentifier: 'pharmacy-1',
      entityType: _label === 'patient' ? 'org.openmrs.Patient' : 'org.openmrs.User',
      basisType: 'org.openmrs.Location',
    });
    const matcher = vi.mocked(mutate).mock.calls[0][0] as (key: unknown) => boolean;
    expect(matcher(`/ws/rest/v1/datafilter/search?type=${payload.entityType}`)).toBe(true);
    expect(matcher(null)).toBe(false);
  });

  it.each([
    ['patient', PharmacyPatients, usePharmacyPatients, { patients: [patient] }],
    ['user', PharmacyUsers, usePharmacyUsers, { users: [userRecord] }],
  ])('reports %s revoke failures without revalidation', async (_label, Component, hook, records) => {
    const actor = userEvent.setup();
    vi.mocked(hook as any).mockReturnValue({ isLoading: false, error: null, ...records });
    let modalProps;
    vi.mocked(showModal).mockImplementation((_name, props) => {
      modalProps = props;
      return vi.fn();
    });
    vi.mocked(revokePharamacyAssignment).mockRejectedValue(new Error('Revoke failed'));
    render(<Component />);
    await actor.click(screen.getByRole('button', { name: 'Revoke' }));
    modalProps.onDelete();
    await waitFor(() =>
      expect(showSnackbar).toHaveBeenCalledWith({ kind: 'error', subtitle: 'Revoke failed', title: 'Failure' }),
    );
    expect(mutate).not.toHaveBeenCalled();
  });
});
