import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { type Role, type StockOperationType, type UserRoleScope } from '../../../../../types';
import UserRoleScopeFormFields from './user-role-scope-fields.component';

vi.mock('@carbon/react', async (importOriginal) => {
  const original = await importOriginal<typeof import('@carbon/react')>();
  return {
    ...original,
    DatePicker: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DatePickerInput: ({ id, labelText }: { id: string; labelText: React.ReactNode }) => (
      <label htmlFor={id}>
        {labelText}
        <input id={id} />
      </label>
    ),
  };
});

const roles: Array<Role> = [
  { uuid: 'role-1', display: 'Inventory Clerk' },
  { uuid: 'role-2', display: 'Inventory Manager' },
];

const stockOperations = [
  { uuid: 'operation-1', name: 'Stock Issue' },
  { uuid: 'operation-2', name: 'Stock Receipt' },
] as Array<StockOperationType>;

const stockLocations = [
  { id: 'location-1', name: 'Main Store' },
  { id: 'location-2', name: 'Pharmacy' },
] as Array<fhir.Location>;

const emptyScope = null as UserRoleScope;

function TestForm({
  defaultValues = {
    forms: [
      {
        role: '',
        enabled: false,
        permanent: false,
        dateRange: {},
        operationTypes: [],
        locations: [],
      },
    ],
  },
  loadingStock = false,
  initialScope = emptyScope,
  removeForm = vi.fn(),
}: {
  defaultValues?: Record<string, any>;
  loadingStock?: boolean;
  initialScope?: UserRoleScope;
  removeForm?: (index: number) => void;
}) {
  const methods = useForm({ defaultValues });
  return (
    <FormProvider {...methods}>
      <UserRoleScopeFormFields
        field={{}}
        index={0}
        control={methods.control}
        removeForm={removeForm}
        filteredInventoryRoles={roles}
        hasInventoryRole
        stockOperations={stockOperations}
        loadingStock={loadingStock}
        stockLocations={stockLocations}
        roleScopeformMethods={methods}
        userRoleScopeInitialValues={initialScope}
      />
      <output data-testid="values">{JSON.stringify(methods.watch())}</output>
    </FormProvider>
  );
}

describe('UserRoleScopeFormFields', () => {
  it('renders the role, access, operation, and location controls', () => {
    render(<TestForm />);

    expect(screen.getByText('Stock Role')).toBeVisible();
    expect(screen.getByText('Stock Role Access')).toBeVisible();
    expect(screen.getByLabelText('Enable?')).not.toBeChecked();
    expect(screen.getByLabelText('Stock Issue')).not.toBeChecked();
    expect(screen.getByLabelText('Stock Receipt')).not.toBeChecked();
    expect(screen.getByLabelText('Main Store')).not.toBeChecked();
    expect(screen.getByLabelText('Pharmacy')).not.toBeChecked();
  });

  it('shows duration controls when enabled and clears dates when permanent is selected', async () => {
    const user = userEvent.setup();
    render(
      <TestForm
        defaultValues={{
          forms: [
            {
              enabled: false,
              permanent: false,
              dateRange: { activeFrom: new Date('2026-08-01'), activeTo: new Date('2026-08-02') },
              operationTypes: [],
              locations: [],
            },
          ],
        }}
      />,
    );

    await user.click(screen.getByLabelText('Enable?'));
    expect(screen.getByLabelText('Permanent?')).toBeVisible();
    expect(screen.getByText('Active From')).toBeVisible();
    expect(screen.getByText('Active To')).toBeVisible();

    await user.click(screen.getByLabelText('Permanent?'));
    expect(screen.queryByText('Active From')).not.toBeInTheDocument();
    expect(screen.getByTestId('values')).toHaveTextContent('"dateRange":{}');
  });

  it('adds and removes stock operations and locations', async () => {
    const user = userEvent.setup();
    render(<TestForm />);

    await user.click(screen.getByLabelText('Stock Issue'));
    await user.click(screen.getByLabelText('Main Store'));
    expect(screen.getByTestId('values')).toHaveTextContent(
      '"operationTypes":[{"operationTypeUuid":"operation-1","operationTypeName":"Stock Issue"}]',
    );
    expect(screen.getByTestId('values')).toHaveTextContent(
      '"locations":[{"locationName":"Main Store","locationUuid":"location-1"}]',
    );

    await user.click(screen.getByLabelText('Stock Issue'));
    await user.click(screen.getByLabelText('Main Store'));
    expect(screen.getByTestId('values')).toHaveTextContent('"operationTypes":[]');
    expect(screen.getByTestId('values')).toHaveTextContent('"locations":[]');
  });

  it('shows loading indicators while stock data is loading', () => {
    render(<TestForm loadingStock />);
    expect(screen.getAllByText('Loading data...')).toHaveLength(2);
    expect(screen.queryByLabelText('Stock Issue')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Main Store')).not.toBeInTheDocument();
  });

  it('removes a new form but does not offer removal while editing', async () => {
    const user = userEvent.setup();
    const removeForm = vi.fn();
    const { rerender } = render(<TestForm removeForm={removeForm} />);

    await user.click(screen.getByText('Remove'));
    expect(removeForm).toHaveBeenCalledWith(0);

    rerender(<TestForm removeForm={removeForm} initialScope={{ uuid: 'scope-1' } as UserRoleScope} />);
    expect(screen.queryByText('Remove')).not.toBeInTheDocument();
  });
});
