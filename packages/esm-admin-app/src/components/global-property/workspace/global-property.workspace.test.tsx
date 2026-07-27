import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import GlobalPropertyWorkspace from './global-property.workspace';

const mockShowSnackbar = vi.fn();
const mockSaveOrUpdateGlobalProperty = vi.fn();
const mockCloseWorkspace = vi.fn();
const mockMutateGlobalProperty = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

vi.mock('@openmrs/esm-framework', () => ({
  useLayoutType: vi.fn(() => 'desktop'),
  showSnackbar: (...args: unknown[]) => mockShowSnackbar(...args),
  ResponsiveWrapper: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Workspace2: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  ),
}));

vi.mock('../hooks/useGlobalProperty', () => ({
  saveOrUpdateGlobalProperty: (...args: unknown[]) => mockSaveOrUpdateGlobalProperty(...args),
}));

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: () => async (values: unknown) => ({ values, errors: {} }),
}));

const baseProps = {
  closeWorkspace: mockCloseWorkspace,
  workspaceProps: {
    systemSetting: null,
    mutateGlobalProperty: mockMutateGlobalProperty,
  },
};

describe('GlobalPropertyWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows "Add global property" title in add mode', () => {
    render(<GlobalPropertyWorkspace {...baseProps} />);
    expect(screen.getByText('Add global property')).toBeInTheDocument();
  });

  it('shows "Edit global property" title when editing an existing property', () => {
    const props = {
      ...baseProps,
      workspaceProps: {
        systemSetting: { uuid: 'uuid-1', property: 'setting.one', value: 'value1' },
        mutateGlobalProperty: mockMutateGlobalProperty,
      },
    };
    render(<GlobalPropertyWorkspace {...props} />);
    expect(screen.getByText('Edit global property')).toBeInTheDocument();
  });

  it('pre-fills form fields when editing an existing property', () => {
    const props = {
      ...baseProps,
      workspaceProps: {
        systemSetting: { uuid: 'uuid-1', property: 'my.setting', value: 'my-value' },
        mutateGlobalProperty: mockMutateGlobalProperty,
      },
    };
    render(<GlobalPropertyWorkspace {...props} />);
    expect(screen.getByDisplayValue('my.setting')).toBeInTheDocument();
    expect(screen.getByDisplayValue('my-value')).toBeInTheDocument();
  });

  it('disables the property field when editing an existing property', () => {
    const props = {
      ...baseProps,
      workspaceProps: {
        systemSetting: { uuid: 'uuid-1', property: 'setting.one', value: 'value1' },
        mutateGlobalProperty: mockMutateGlobalProperty,
      },
    };
    render(<GlobalPropertyWorkspace {...props} />);
    expect(screen.getByLabelText(/Property/i)).toBeDisabled();
  });

  it('enables the property field in add mode', () => {
    render(<GlobalPropertyWorkspace {...baseProps} />);
    expect(screen.getByLabelText(/Property/i)).not.toBeDisabled();
  });

  it('renders the Cancel and Save & close buttons', () => {
    render(<GlobalPropertyWorkspace {...baseProps} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Save & close')).toBeInTheDocument();
  });

  it('calls closeWorkspace when Cancel is clicked', () => {
    render(<GlobalPropertyWorkspace {...baseProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockCloseWorkspace).toHaveBeenCalledTimes(1);
  });

  it('shows validation error when form is submitted with empty required fields', async () => {
    render(<GlobalPropertyWorkspace {...baseProps} />);
    const saveButton = screen.getByText('Save & close');
    fireEvent.click(saveButton);
    await waitFor(() => {
      expect(mockSaveOrUpdateGlobalProperty).not.toHaveBeenCalled();
    });
  });

  it('saves a new property with the entered values', async () => {
    mockSaveOrUpdateGlobalProperty.mockResolvedValue(undefined);
    render(<GlobalPropertyWorkspace {...baseProps} />);

    await userEvent.type(screen.getByLabelText(/Property/i), 'new.setting');
    await userEvent.type(screen.getByLabelText(/Value/i), 'new-value');

    fireEvent.submit(screen.getByLabelText(/Property/i).closest('form')!);

    await waitFor(() => {
      expect(mockSaveOrUpdateGlobalProperty).toHaveBeenCalledWith(
        expect.objectContaining({ property: 'new.setting', value: 'new-value' }),
        undefined,
      );
    });
  });

  it('shows a success snackbar and closes workspace after saving', async () => {
    mockSaveOrUpdateGlobalProperty.mockResolvedValue(undefined);
    render(<GlobalPropertyWorkspace {...baseProps} />);

    await userEvent.type(screen.getByLabelText(/Property/i), 'new.setting');
    await userEvent.type(screen.getByLabelText(/Value/i), 'new-value');

    fireEvent.submit(screen.getByLabelText(/Property/i).closest('form')!);

    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }));
      expect(mockMutateGlobalProperty).toHaveBeenCalled();
      expect(mockCloseWorkspace).toHaveBeenCalled();
    });
  });

  it('shows an error snackbar when saving fails', async () => {
    mockSaveOrUpdateGlobalProperty.mockRejectedValue(new Error('Failed to save'));
    render(<GlobalPropertyWorkspace {...baseProps} />);

    await userEvent.type(screen.getByLabelText(/Property/i), 'new.setting');
    await userEvent.type(screen.getByLabelText(/Value/i), 'new-value');

    fireEvent.submit(screen.getByLabelText(/Property/i).closest('form')!);

    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'error' }));
      expect(mockCloseWorkspace).not.toHaveBeenCalled();
    });
  });

  it('renders optional fields: description, datatype config, handler config', () => {
    render(<GlobalPropertyWorkspace {...baseProps} />);
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Datatype config/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Handler config/i)).toBeInTheDocument();
  });
});
