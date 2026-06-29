import React from 'react';
import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClaimDocumentGenerator from './claim-document-generator.component';
import { useClaimDocumentGenerator, type ClaimDocumentActions, type DocumentRow } from './use-claim-document-generator';

vi.mock('./use-claim-document-generator', () => ({
  useClaimDocumentGenerator: vi.fn(),
}));

const mockUseClaimDocumentGenerator = useClaimDocumentGenerator as MockedFunction<typeof useClaimDocumentGenerator>;

const actions: ClaimDocumentActions = {
  generate: vi.fn(),
  upload: vi.fn(),
  cancel: vi.fn(),
  discard: vi.fn(),
  preview: vi.fn(),
  replace: vi.fn(),
  manualSelect: vi.fn(),
};

const buildRow = (overrides: Partial<DocumentRow> = {}): DocumentRow => ({
  documentType: 'CLAIM_FORM',
  label: 'CLAIM FORM',
  status: 'idle',
  progress: 0,
  hasEndpoint: true,
  isLocked: false,
  isBusy: false,
  canGenerate: true,
  canManualUpload: false,
  missingParams: [],
  ...overrides,
});

const renderWith = (result: Partial<ReturnType<typeof useClaimDocumentGenerator>>) => {
  mockUseClaimDocumentGenerator.mockReturnValue({
    isLoading: false,
    error: undefined,
    rows: [],
    actions,
    ...result,
  });
  return render(
    <ClaimDocumentGenerator
      consentToken="token"
      interventionCode="SHA-001"
      documentTypes={['CLAIM_FORM']}
      params={{}}
    />,
  );
};

describe('<ClaimDocumentGenerator />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a loading skeleton while endpoints are loading', () => {
    renderWith({ isLoading: true });
    expect(screen.queryByText('CLAIM FORM')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('surfaces an error message when endpoints fail to load', () => {
    renderWith({ error: new Error('boom') });
    expect(screen.getByText('Could not load document endpoints')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('renders one card per document row with its label', () => {
    renderWith({
      rows: [
        buildRow({ documentType: 'CLAIM_FORM', label: 'CLAIM FORM' }),
        buildRow({ documentType: 'INVOICE', label: 'INVOICE' }),
      ],
    });
    expect(screen.getByText('CLAIM FORM')).toBeInTheDocument();
    expect(screen.getByText('INVOICE')).toBeInTheDocument();
  });

  describe('idle row', () => {
    it('lets the user generate when an endpoint and context are available', async () => {
      const user = userEvent.setup();
      renderWith({ rows: [buildRow()] });

      const button = screen.getByRole('button', { name: 'Generate' });
      expect(button).toBeEnabled();
      await user.click(button);
      expect(actions.generate).toHaveBeenCalledWith('CLAIM_FORM');
    });

    it('warns and disables generation when no endpoint is configured', () => {
      renderWith({ rows: [buildRow({ hasEndpoint: false, canGenerate: false })] });

      expect(screen.getByText('No endpoint configured')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Generate' })).toBeDisabled();
    });

    it('warns about missing context and disables generation', () => {
      renderWith({
        rows: [buildRow({ canGenerate: false, missingParams: ['billUuid', 'patientUuid'] })],
      });

      expect(screen.getByText('Missing context')).toBeInTheDocument();
      expect(screen.getByText(/Cannot resolve/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Generate' })).toBeDisabled();
    });
  });

  describe('failed row', () => {
    it('shows the error and offers a retry that re-triggers generation', async () => {
      const user = userEvent.setup();
      renderWith({ rows: [buildRow({ status: 'failed', error: 'Could not generate document' })] });

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Could not generate document')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Retry' }));
      expect(actions.generate).toHaveBeenCalledWith('CLAIM_FORM');
    });
  });

  describe('ready row', () => {
    const readyRow = (docOverrides = {}) =>
      buildRow({
        status: 'ready',
        objectUrl: 'blob:preview',
        document: { blob: new Blob(), mimeType: 'application/pdf', filename: 'claim_form.pdf', ...docOverrides },
      });

    it('exposes upload, preview, regenerate and discard actions wired to the row', async () => {
      const user = userEvent.setup();
      renderWith({ rows: [readyRow()] });

      await user.click(screen.getByRole('button', { name: 'Upload' }));
      expect(actions.upload).toHaveBeenCalledWith('CLAIM_FORM');

      await user.click(screen.getByRole('button', { name: 'Preview' }));
      expect(actions.preview).toHaveBeenCalledWith('CLAIM_FORM');

      await user.click(screen.getByRole('button', { name: 'Regenerate' }));
      expect(actions.generate).toHaveBeenCalledWith('CLAIM_FORM');

      await user.click(screen.getByRole('button', { name: 'Discard' }));
      expect(actions.discard).toHaveBeenCalledWith('CLAIM_FORM');
    });

    it('previews a PDF in an inline frame', () => {
      renderWith({ rows: [readyRow({ mimeType: 'application/pdf' })] });
      expect(screen.getByTitle('CLAIM_FORM-preview')).toBeInTheDocument();
    });

    it('previews an image inline', () => {
      renderWith({ rows: [readyRow({ mimeType: 'image/png' })] });
      expect(screen.getByRole('img', { name: 'CLAIM_FORM preview' })).toBeInTheDocument();
    });

    it('falls back to a download link for non-image, non-PDF types', () => {
      renderWith({ rows: [readyRow({ mimeType: 'application/zip', filename: 'bundle.zip' })] });
      expect(screen.getByText('bundle.zip')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Open in new tab/ })).toBeInTheDocument();
    });
  });

  describe('busy row', () => {
    it('shows generating feedback and a cancel control', async () => {
      const user = userEvent.setup();
      renderWith({ rows: [buildRow({ status: 'generating', isBusy: true })] });

      expect(screen.getByText('Generating…')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(actions.cancel).toHaveBeenCalledWith('CLAIM_FORM');
    });

    it('shows upload progress and a cancel control while uploading', async () => {
      const user = userEvent.setup();
      renderWith({ rows: [buildRow({ status: 'uploading', isBusy: true, progress: 42 })] });

      expect(screen.getByText('42%')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(actions.cancel).toHaveBeenCalledWith('CLAIM_FORM');
    });
  });

  describe('locked row', () => {
    it('marks the document uploaded, links to the claim, and offers a replace action', async () => {
      const user = userEvent.setup();
      renderWith({
        rows: [buildRow({ status: 'uploaded', isLocked: true, uploadedUrl: 'https://claim/doc' })],
      });

      expect(screen.getByText('Uploaded')).toBeInTheDocument();
      const link = screen.getByRole('link', { name: /View on claim/ });
      expect(link).toHaveAttribute('href', 'https://claim/doc');

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(1);
      await user.click(screen.getByRole('button', { name: 'Replace' }));
      expect(actions.replace).toHaveBeenCalledWith('CLAIM_FORM');
    });
  });
});
