import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProceduresTabs from './procedures-tabs.component';

vi.mock('../../shared/tabs/extension-tabs.component', () => ({
  default: ({ extensionSlotName, patientUuid }: { extensionSlotName: string; patientUuid: string }) => (
    <div data-testid="extension-tabs" data-extension-slot-name={extensionSlotName} data-patient-uuid={patientUuid} />
  ),
}));

describe('ProceduresTabs', () => {
  it('renders the procedure extension tabs for the patient', () => {
    render(<ProceduresTabs patientUuid="test-patient-uuid" />);

    const extensionTabs = screen.getByTestId('extension-tabs');
    expect(extensionTabs).toHaveAttribute('data-extension-slot-name', 'patient-procedure-tabs-slot');
    expect(extensionTabs).toHaveAttribute('data-patient-uuid', 'test-patient-uuid');
  });
});
