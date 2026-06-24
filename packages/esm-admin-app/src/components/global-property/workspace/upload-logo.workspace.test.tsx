import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import UploadLogoWorkspace from './upload-logo.workspace';

const mockShowSnackbar = vi.fn();
const mockUploadLogo = vi.fn();
const mockCloseWorkspace = vi.fn();
const mockMutateGlobalProperty = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

vi.mock('@openmrs/esm-framework', () => ({
  useLayoutType: vi.fn(() => 'desktop'),
  showSnackbar: (...args: unknown[]) => mockShowSnackbar(...args),
  Workspace2: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  ),
}));

vi.mock('../hooks/useLogoUpload', async (importOriginal) => {
  const original = await importOriginal<typeof import('../hooks/useLogoUpload')>();
  return {
    ...original,
    uploadLogo: (...args: unknown[]) => mockUploadLogo(...args),
  };
});

vi.mock('@carbon/react', async (importOriginal) => {
  const original = await importOriginal<typeof import('@carbon/react')>();
  return {
    ...original,
    Button: ({ children, onClick, disabled, type }: any) => (
      <button onClick={onClick} disabled={disabled} type={type || 'button'}>
        {children}
      </button>
    ),
    FileUploader: ({ onChange, onDelete, disabled }: any) => (
      <div>
        <input
          data-testid="file-input"
          type="file"
          disabled={disabled}
          onChange={(e) => onChange({ target: e.target, addedFiles: Array.from(e.target.files ?? []) })}
        />
        <button type="button" onClick={() => onDelete?.()}>
          remove-file
        </button>
      </div>
    ),
  };
});

const baseProps = {
  closeWorkspace: mockCloseWorkspace,
  workspaceProps: {
    mutateGlobalProperty: mockMutateGlobalProperty,
  },
} as any;

function makeFile(name: string, type: string, size?: number) {
  const file = new File(['logo-bytes'], name, { type });
  if (size != null) {
    Object.defineProperty(file, 'size', { value: size });
  }
  return file;
}

describe('UploadLogoWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => 'blob:preview');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('renders the workspace with the Upload button disabled until a file is chosen', () => {
    render(<UploadLogoWorkspace {...baseProps} />);
    expect(screen.getByText('Upload image')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows a preview and enables Upload after selecting a valid image', async () => {
    render(<UploadLogoWorkspace {...baseProps} />);

    await userEvent.upload(screen.getByTestId('file-input'), makeFile('logo.png', 'image/png'));

    expect(screen.getByRole('img', { name: 'Image preview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeEnabled();
  });

  it('rejects an unsupported file type and keeps Upload disabled', async () => {
    render(<UploadLogoWorkspace {...baseProps} />);

    await userEvent.upload(screen.getByTestId('file-input'), makeFile('notes.pdf', 'application/pdf'));

    expect(screen.getByText(/Unsupported file type/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('rejects a file larger than the 2 MB limit', async () => {
    render(<UploadLogoWorkspace {...baseProps} />);

    await userEvent.upload(screen.getByTestId('file-input'), makeFile('huge.png', 'image/png', 2 * 1024 * 1024 + 1));

    expect(screen.getByText(/exceeds the 2 MB maximum/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled();
  });

  it('uploads the selected image, shows a success snackbar, refreshes and closes', async () => {
    mockUploadLogo.mockResolvedValue({ savedPath: '/srv/openmrs/prescription-logo.png', message: 'ok' });
    render(<UploadLogoWorkspace {...baseProps} />);

    const file = makeFile('logo.png', 'image/png');
    await userEvent.upload(screen.getByTestId('file-input'), file);
    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    await waitFor(() => {
      expect(mockUploadLogo).toHaveBeenCalledWith(file, 'prescription');
      expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }));
      expect(mockMutateGlobalProperty).toHaveBeenCalled();
      expect(mockCloseWorkspace).toHaveBeenCalled();
    });
  });

  it('uploads to the receipt destination when the receipt option is selected', async () => {
    mockUploadLogo.mockResolvedValue({ savedPath: '/srv/openmrs/receipt-logo.png', message: 'ok' });
    render(<UploadLogoWorkspace {...baseProps} />);

    await userEvent.click(screen.getByRole('radio', { name: 'Receipt logo' }));
    const file = makeFile('mtrh-logo.png', 'image/png');
    await userEvent.upload(screen.getByTestId('file-input'), file);
    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    await waitFor(() => {
      expect(mockUploadLogo).toHaveBeenCalledWith(file, 'receipt');
    });
  });

  it('shows an error snackbar and keeps the workspace open when upload fails', async () => {
    mockUploadLogo.mockRejectedValue(new Error('Upload failed'));
    render(<UploadLogoWorkspace {...baseProps} />);

    await userEvent.upload(screen.getByTestId('file-input'), makeFile('logo.png', 'image/png'));
    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'error' }));
    });
    expect(mockMutateGlobalProperty).not.toHaveBeenCalled();
    expect(mockCloseWorkspace).not.toHaveBeenCalled();
  });

  it('closes the workspace when Cancel is clicked', async () => {
    render(<UploadLogoWorkspace {...baseProps} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockCloseWorkspace).toHaveBeenCalledTimes(1);
    expect(mockUploadLogo).not.toHaveBeenCalled();
  });

  it('clears the preview and disables Upload when the chosen file is removed', async () => {
    render(<UploadLogoWorkspace {...baseProps} />);

    await userEvent.upload(screen.getByTestId('file-input'), makeFile('logo.png', 'image/png'));
    expect(screen.getByRole('img', { name: 'Image preview' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'remove-file' }));

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled();
  });
});
