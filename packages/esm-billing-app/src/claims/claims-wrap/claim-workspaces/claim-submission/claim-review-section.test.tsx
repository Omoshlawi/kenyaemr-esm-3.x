import React from 'react';
import { render, screen } from '@testing-library/react';
import ClaimReviewSection from './claim-review-section.component';

vi.mock('../../../../helpers/currency', () => ({
  useCurrencyFormatting: () => ({
    formatSimple: (amount: number) => `KES ${Number(amount).toFixed(2)}`,
  }),
}));

describe('ClaimReviewSection', () => {
  const diagnoses = [
    { icd_code: 'K35.8', icd_description: 'Acute appendicitis', status: 'ATTACHED' },
    { icd_code: 'Z00.0', icd_description: 'General exam', status: 'REJECTED' },
  ];
  const billLines = [
    { item_name: 'Theatre fee', intervention_code: 'SHA-19-119', line_total_amount: 67200 },
    { item_name: null, intervention_code: 'SHA-11-008', line_total_amount: null },
  ];

  it('renders diagnoses and bill lines from the passed claim data', () => {
    render(<ClaimReviewSection diagnoses={diagnoses} billLines={billLines} />);

    expect(screen.getByText('K35.8')).toBeInTheDocument();
    expect(screen.getByText('Acute appendicitis')).toBeInTheDocument();
    expect(screen.getByText('ATTACHED')).toBeInTheDocument();
    expect(screen.getByText('REJECTED')).toBeInTheDocument();

    expect(screen.getByText('Theatre fee')).toBeInTheDocument();
    expect(screen.getByText('KES 67200.00')).toBeInTheDocument();
    // Bill line with a null item name falls back to its intervention code.
    expect(screen.getByText('SHA-11-008')).toBeInTheDocument();
    expect(screen.getByText('KES 0.00')).toBeInTheDocument();
  });

  it('renders nothing when there is no claim data to review', () => {
    const { container } = render(<ClaimReviewSection />);
    expect(container).toBeEmptyDOMElement();
  });
});
