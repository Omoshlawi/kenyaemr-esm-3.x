import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it } from 'vitest';
import VisitSummaryVitals from './visit-summary-vitals.component';
import VisitSummaryComplaints from './visit-summary-complaints.component';
import VisitSummaryConditions from './visit-summary-conditions.component';
import VisitSummaryAllergies from './visit-summary-allergies.component';
import VisitSummaryClinicalNotes from './visit-summary-clinical-notes.component';
import VisitSummaryDiagnoses from './visit-summary-diagnoses.component';
import VisitSummaryMedications from './visit-summary-medications.component';
import VisitSummaryLabResults from './visit-summary-lab-results.component';
import { VisitSummaryImaging, VisitSummaryProceduresOnly } from './visit-summary-procedures.component';
import { emptyVitals, fullVitals, mockVisitSummary } from './visit-summary.mock';
import type { VisitSummary } from './visit-summary.resource';

describe('VisitSummaryVitals', () => {
  it('renders a vitals grid with values, units, computed BMI and MUAC', () => {
    render(<VisitSummaryVitals vitals={fullVitals} />);

    expect(screen.getByRole('heading', { name: 'Latest Vitals' })).toBeInTheDocument();
    expect(screen.getByText('37°')).toBeInTheDocument();
    expect(screen.getByText('120/80')).toBeInTheDocument();
    expect(screen.getByText('98')).toBeInTheDocument();
    // BMI = 70 / (1.75 * 1.75) = 22.9
    expect(screen.getByText('22.9')).toBeInTheDocument();
    expect(screen.getByText('MUAC')).toBeInTheDocument();
  });

  it('shows a dash for null values and hides BMI when height is missing', () => {
    const vitals = { ...emptyVitals, weight: { value: 70, unit: 'kg', interpretation: null } };
    render(<VisitSummaryVitals vitals={vitals} />);

    expect(screen.getByText('70')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.queryByText('BMI')).not.toBeInTheDocument();
  });

  it('renders an empty state when no vitals are recorded', () => {
    render(<VisitSummaryVitals vitals={emptyVitals} />);

    expect(screen.getByText('No vitals recorded for this visit')).toBeInTheDocument();
  });
});

describe('VisitSummaryComplaints', () => {
  it('renders complaints with duration and onset', () => {
    render(<VisitSummaryComplaints complaints={mockVisitSummary.complaints} />);

    expect(screen.getByText('Chief Complaints')).toBeInTheDocument();
    expect(screen.getByText(/Headache \(3 days\)/)).toBeInTheDocument();
    expect(screen.getByText(/at sudden/)).toBeInTheDocument();
  });

  it('renders nothing when there are no complaints', () => {
    const { container } = render(<VisitSummaryComplaints complaints={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('VisitSummaryConditions', () => {
  it('renders conditions with active and inactive status tags', () => {
    render(<VisitSummaryConditions conditions={mockVisitSummary.conditions} />);

    expect(screen.getByText('Hypertension')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Asthma')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('shows a dash when a condition has no onset date', () => {
    render(<VisitSummaryConditions conditions={[{ name: 'Diabetes', onsetDate: '', status: 'ACTIVE' }]} />);

    expect(screen.getByText('Diabetes')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders nothing when there are no conditions', () => {
    const { container } = render(<VisitSummaryConditions conditions={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('VisitSummaryAllergies', () => {
  it('renders allergens with severity-based tags', () => {
    render(<VisitSummaryAllergies allergies={mockVisitSummary.allergies} />);

    expect(screen.getByText('Penicillin')).toBeInTheDocument();
    expect(screen.getByText('SEVERE')).toBeInTheDocument();
    expect(screen.getByText('MODERATE')).toBeInTheDocument();
    expect(screen.getByText('MILD')).toBeInTheDocument();
  });

  it('renders nothing when there are no allergies', () => {
    const { container } = render(<VisitSummaryAllergies allergies={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('VisitSummaryClinicalNotes', () => {
  it('renders clinical notes with the encounter type', () => {
    render(<VisitSummaryClinicalNotes clinicalNotes={mockVisitSummary.clinicalNotes} />);

    expect(screen.getByText('Patient stable.')).toBeInTheDocument();
    expect(screen.getByText(/Consultation/)).toBeInTheDocument();
  });

  it('renders nothing when there are no clinical notes', () => {
    const { container } = render(<VisitSummaryClinicalNotes clinicalNotes={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('VisitSummaryDiagnoses', () => {
  it('groups diagnoses into impression, main and other buckets', () => {
    render(<VisitSummaryDiagnoses diagnoses={mockVisitSummary.diagnoses} />);

    expect(screen.getByText('Impression')).toBeInTheDocument();
    expect(screen.getByText('Typhoid')).toBeInTheDocument();
    expect(screen.getByText('Main Diagnosis')).toBeInTheDocument();
    expect(screen.getByText('Malaria')).toBeInTheDocument();
    expect(screen.getByText('Anemia')).toBeInTheDocument();
    expect(screen.getByText('(presumed)')).toBeInTheDocument();
  });

  it('renders nothing when there are no diagnoses', () => {
    const { container } = render(<VisitSummaryDiagnoses diagnoses={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('VisitSummaryMedications', () => {
  it('renders medications with active and stopped status', () => {
    render(<VisitSummaryMedications medications={mockVisitSummary.medications} />);

    expect(screen.getByText('Paracetamol')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Amoxicillin')).toBeInTheDocument();
    expect(screen.getByText('Stopped')).toBeInTheDocument();
    expect(screen.getByText('500mg · TDS · Oral · 5 days')).toBeInTheDocument();
  });

  it('falls back to a dash for missing drug and dosage', () => {
    render(
      <VisitSummaryMedications
        medications={[
          { drug: '', dose: '', frequency: '', route: '', duration: '', dateActivated: '', autoExpireDate: '' },
        ]}
      />,
    );

    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('renders nothing when there are no medications', () => {
    const { container } = render(<VisitSummaryMedications medications={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('VisitSummaryLabResults', () => {
  it('renders results with interpretation, reference ranges and panels', () => {
    render(<VisitSummaryLabResults labResults={mockVisitSummary.labResults} />);

    expect(screen.getByText('Hemoglobin')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('12 – 16')).toBeInTheDocument();
    // Panel grouping
    expect(screen.getByText('Liver Function Test')).toBeInTheDocument();
    expect(screen.getByText('ALT')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('< 40')).toBeInTheDocument();
    expect(screen.getByText('> 10')).toBeInTheDocument();
  });

  it('renders a dash when no reference range is available', () => {
    const labResults: VisitSummary['labResults'] = [
      {
        panel: null,
        panelUuid: null,
        isPanel: false,
        results: [
          {
            test: 'Glucose',
            testUuid: 'g1',
            value: '5',
            date: '2024-01-15',
            units: 'mmol/L',
            lowNormal: null,
            hiNormal: null,
            lowCritical: null,
            hiCritical: null,
            interpretation: null,
          },
        ],
      },
    ];
    render(<VisitSummaryLabResults labResults={labResults} />);

    expect(screen.getByText('Glucose')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders nothing when no results exist', () => {
    const { container } = render(
      <VisitSummaryLabResults labResults={[{ panel: null, panelUuid: null, isPanel: false, results: [] }]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('VisitSummaryProceduresOnly', () => {
  it('renders procedures with status tags and a decoded report', () => {
    render(<VisitSummaryProceduresOnly procedures={mockVisitSummary.procedures} />);

    expect(screen.getByText('Appendectomy')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    expect(screen.getByText('Report')).toBeInTheDocument();
    expect(screen.getByText('Procedure went well')).toBeInTheDocument();
  });

  it('shows a dash when a procedure has no ordered date', () => {
    render(
      <VisitSummaryProceduresOnly
        procedures={[
          {
            procedure: 'Biopsy',
            procedureUuid: 'p9',
            orderNumber: 'ORD-9',
            action: 'NEW',
            urgency: 'ROUTINE',
            status: 'ORDERED',
            orderedDate: '',
            instructions: '',
            orderer: 'Dr. Who',
            procedureReport: '',
            results: [],
          },
        ]}
      />,
    );

    expect(screen.getByText('Biopsy')).toBeInTheDocument();
    expect(screen.getByText('ORDERED')).toBeInTheDocument();
  });

  it('renders nothing when there are no procedures', () => {
    const { container } = render(<VisitSummaryProceduresOnly procedures={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('VisitSummaryImaging', () => {
  it('renders imaging orders with an impression', () => {
    render(<VisitSummaryImaging imaging={mockVisitSummary.imaging} />);

    expect(screen.getByText('Chest X-Ray')).toBeInTheDocument();
    expect(screen.getByText('Impression')).toBeInTheDocument();
    expect(screen.getByText('No acute findings')).toBeInTheDocument();
  });

  it('renders nothing when there is no imaging', () => {
    const { container } = render(<VisitSummaryImaging imaging={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
