import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import DeleteGlobalPropertyModal from './delete-global-property-modal.component';

const mockShowSnackbar = vi.fn();
const mockDeleteGlobalProperty = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string, opts?: Record<string, unknown>) => fallback }),
}));

vi.mock('@openmrs/esm-framework', () => ({
  showSnackbar: (...args: unknown[]) => mockShowSnackbar(...args),
}));

vi.mock('../hooks/useGlobalProperty', () => ({
  deleteGlobalProperty: (...args: unknown[]) => mockDeleteGlobalProperty(...args),
}));

describe('DeleteGlobalPropertyModal', () => {
  const defaultProps = {
    close: vi.fn(),
    property: 'setting.example',
    uuid: 'uuid-abc',
    onDeleted: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays the modal heading', () => {
    render(<DeleteGlobalPropertyModal {...defaultProps} />);
    expect(screen.getByText('Delete global property')).toBeInTheDocument();
  });

  it('shows the property name in the confirmation message', () => {
    render(<DeleteGlobalPropertyModal {...defaultProps} />);
    expect(screen.getByText('Are you sure you want to delete the global property "{{property}}"?')).toBeInTheDocument();
  });

  it('shows a warning that the action cannot be undone', () => {
    render(<DeleteGlobalPropertyModal {...defaultProps} />);
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
  });

  it('calls close when the Cancel button is clicked', () => {
    render(<DeleteGlobalPropertyModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.close).toHaveBeenCalledTimes(1);
  });

  it('does not call onDeleted when Cancel is clicked', () => {
    render(<DeleteGlobalPropertyModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onDeleted).not.toHaveBeenCalled();
  });

  it('calls deleteGlobalProperty with the correct uuid when Delete is clicked', async () => {
    mockDeleteGlobalProperty.mockResolvedValue(undefined);
    render(<DeleteGlobalPropertyModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Delete'));
    await waitFor(() => {
      expect(mockDeleteGlobalProperty).toHaveBeenCalledWith('uuid-abc');
    });
  });

  it('shows a success snackbar and closes the modal after successful deletion', async () => {
    mockDeleteGlobalProperty.mockResolvedValue(undefined);
    render(<DeleteGlobalPropertyModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Delete'));
    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }));
      expect(defaultProps.onDeleted).toHaveBeenCalledTimes(1);
      expect(defaultProps.close).toHaveBeenCalledTimes(1);
    });
  });

  it('shows an error snackbar when deletion fails', async () => {
    mockDeleteGlobalProperty.mockRejectedValue(new Error('Server error'));
    render(<DeleteGlobalPropertyModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Delete'));
    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'error' }));
      expect(defaultProps.close).not.toHaveBeenCalled();
      expect(defaultProps.onDeleted).not.toHaveBeenCalled();
    });
  });

  it('disables both buttons while deletion is in progress', async () => {
    let resolveDelete: () => void;
    mockDeleteGlobalProperty.mockReturnValue(
      new Promise<void>((res) => {
        resolveDelete = res;
      }),
    );
    render(<DeleteGlobalPropertyModal {...defaultProps} />);

    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeDisabled();
    });

    await act(async () => {
      resolveDelete!();
    });
  });

  it('shows a loading indicator while deletion is in progress', async () => {
    let resolveDelete: () => void;
    mockDeleteGlobalProperty.mockReturnValue(
      new Promise<void>((res) => {
        resolveDelete = res;
      }),
    );
    render(<DeleteGlobalPropertyModal {...defaultProps} />);

    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(screen.getByText('Deleting...')).toBeInTheDocument();
    });

    await act(async () => {
      resolveDelete!();
    });
  });
});
