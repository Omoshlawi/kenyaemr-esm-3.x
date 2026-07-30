import React from 'react';
import { render, screen } from '@testing-library/react';
import ClaimShaPreview from './claim-sha-preview.component';
import { type ClaimPreviewResponse } from './claim-submit-resource';

vi.mock('../../../../helpers/currency', () => ({
  useCurrencyFormatting: () => ({
    formatSimple: (amount: number) => `KES ${Number(amount).toFixed(2)}`,
  }),
}));

const previewWithSha: ClaimPreviewResponse = {
  success: true,
  consent_token: 'RJJS8ER258',
  ready_to_dispatch: true,
  local: { workflow_state: 'DRAFT' },
  sha: {
    workflow_state: 'SUBMISSION_READY',
    interventions: [{ intervention_code: 'SHA-19-119', intervention_name: 'Appendicectomy', keph_level_tarrif: 67200 }],
  },
};

describe('ClaimShaPreview', () => {
  it('shows a loading state while the preview is being fetched', () => {
    render(<ClaimShaPreview preview={null} isLoading />);
    expect(screen.getByText('Loading SHA preview…')).toBeInTheDocument();
  });

  it('renders SHA state and interventions when the preview loads', () => {
    render(<ClaimShaPreview preview={previewWithSha} isLoading={false} />);

    expect(screen.getByText('Review before submitting')).toBeInTheDocument();
    expect(screen.getByText('Ready to dispatch')).toBeInTheDocument();
    expect(screen.getByText('SUBMISSION_READY')).toBeInTheDocument();
    expect(screen.getByText('SHA-19-119')).toBeInTheDocument();
    expect(screen.getByText('Appendicectomy')).toBeInTheDocument();
    expect(screen.getByText('KES 67200.00')).toBeInTheDocument();
  });

  it('surfaces a non-blocking warning when SHA returns an error', () => {
    render(
      <ClaimShaPreview
        preview={{ success: true, consent_token: 'X', ready_to_dispatch: false, sha_error: 'SHA preview HTTP 503' }}
        isLoading={false}
      />,
    );
    expect(screen.getByText('SHA preview unavailable')).toBeInTheDocument();
    expect(screen.getByText('SHA preview HTTP 503')).toBeInTheDocument();
  });

  it('surfaces a warning when the request itself failed', () => {
    render(<ClaimShaPreview preview={null} isLoading={false} error={new Error('Network down')} />);
    expect(screen.getByText('SHA preview unavailable')).toBeInTheDocument();
    expect(screen.getByText('Network down')).toBeInTheDocument();
  });
});
