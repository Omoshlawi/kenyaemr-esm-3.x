import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useSession } from '@openmrs/esm-framework';
import { configSchema } from './config-schema';
import PharmacyComponent from './pharmacy-component/pharmacy.component';
import PharmacyDetail from './pharmacy-detail/pharmacy-detail.component';
import PharmacyDetailHeader from './pharmacy-detail-header/pharmacy-detail-header.component';
import { PhamacyHeader } from './pharmacy-header/pharmacy-header.component';
import PharmacyIllustration from './pharmacy-header/pharmacy-illustration.component';
import { createLeftPanelLink, LinkExtension } from './pharmacy-left-panel/pharmacy-left-panel-link.component';
import MetricsCard from './pharmacy-metrics/pharmacy-card.component';
import MetricsHeader from './pharmacy-metrics/pharmacy-metrics-header.component';
import PharmacyMetrics from './pharmacy-metrics/pharmacy-metrics.component';
import { PharmacyTabs } from './pharmacy-tabs/pharmacy-tabs-component';
import { usePharmacy, usePharmacyPatients, usePharmacyUsers, useUserMappedPharmacies } from './hooks';
import Root from './root.component';

vi.mock('./hooks', () => ({
  usePharmacy: vi.fn(),
  usePharmacyPatients: vi.fn(),
  usePharmacyUsers: vi.fn(),
  useUserMappedPharmacies: vi.fn(),
}));

describe('remaining pharmacy application UI', () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue({
      user: { uuid: 'user-1' },
      sessionLocation: { display: 'MTRH' },
    } as any);
    vi.mocked(usePharmacy).mockReturnValue({
      isLoading: false,
      error: null,
      pharmacy: { uuid: 'p1', name: 'Afya Pharmacy' },
    } as any);
    vi.mocked(usePharmacyPatients).mockReturnValue({ isLoading: false, error: null, patients: [] });
    vi.mocked(usePharmacyUsers).mockReturnValue({ isLoading: false, error: null, users: [] });
    vi.mocked(useUserMappedPharmacies).mockReturnValue({ isLoading: false, error: null, pharmacies: [] });
  });

  it('exports usable configuration defaults and validation', () => {
    expect(configSchema.casualGreeting._default).toBe(false);
    expect(configSchema.whoToGreet._default).toEqual(['World']);
    expect(configSchema.admissionLocationTagUuid._default).toBeTruthy();
  });

  it('renders the main pharmacy and detail compositions', () => {
    const view = render(<PharmacyComponent />);
    expect(screen.getByText('Pharmacy')).toBeVisible();
    expect(screen.getByText('No Community Pharmacies to list.')).toBeVisible();
    view.rerender(
      <MemoryRouter initialEntries={['/p1']}>
        <PharmacyDetail />
      </MemoryRouter>,
    );
    expect(screen.getByText('Afya Pharmacy')).toBeVisible();
    expect(screen.getByText('Assigned Patients')).toBeVisible();
    expect(screen.getByText('Asigned Users')).toBeVisible();
  });

  it('renders pharmacy headers and their loading state', () => {
    const view = render(<PhamacyHeader title="Community network" />);
    expect(screen.getByText('Community network')).toBeVisible();
    expect(screen.getByText('MTRH')).toBeVisible();
    expect(screen.getByText(/Today/)).toBeVisible();
    view.rerender(<PharmacyIllustration />);
    expect(view.container.querySelector('svg')).toBeInTheDocument();

    vi.mocked(usePharmacy).mockReturnValue({ isLoading: true, error: null, pharmacy: undefined });
    view.rerender(
      <MemoryRouter>
        <PharmacyDetailHeader />
      </MemoryRouter>,
    );
    expect(view.container.querySelector('.cds--skeleton__text')).toBeInTheDocument();
  });

  it('renders left navigation links for ordinary and UUID detail paths', () => {
    const view = render(
      <MemoryRouter initialEntries={['/home/pharmacy']}>
        <LinkExtension config={{ name: 'pharmacy', title: 'Community Pharmacy' }} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Community Pharmacy' })).toHaveClass('active-left-nav-link');
    view.rerender(
      <MemoryRouter initialEntries={['/home/pharmacy/12345678-1234-1234-1234-123456789abc']}>
        <LinkExtension config={{ name: 'pharmacy', title: 'Community Pharmacy' }} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Community Pharmacy' })).toHaveAttribute(
      'href',
      '/openmrs/spa/home/pharmacy',
    );
    const CreatedLink = createLeftPanelLink({ name: 'pharmacy', title: 'Created Link' });
    view.rerender(<CreatedLink />);
    expect(screen.getByText('Created Link')).toBeVisible();
  });

  it('renders metrics cards, optional children, header, and summary', () => {
    const view = render(
      <MetricsCard label="Total" value={4} headerLabel="Pharmacies">
        <span>Extra metric</span>
      </MetricsCard>,
    );
    expect(screen.getByText('Extra metric')).toBeVisible();
    expect(screen.getByText('View Report')).toBeVisible();
    view.rerender(<MetricsHeader />);
    expect(screen.getByRole('button', { name: 'Tag pharmacy' })).toBeVisible();
    view.rerender(<PharmacyMetrics />);
    expect(screen.getByTestId('clinic-metrics')).toBeVisible();
    expect(screen.getByText('Total community phamacies')).toBeVisible();
    expect(screen.getAllByText('0')).toHaveLength(4);
  });

  it('renders pharmacy tabs with patient and user content', () => {
    render(
      <MemoryRouter>
        <PharmacyTabs />
      </MemoryRouter>,
    );
    expect(screen.getByText('No Pharmacy Patients to list.')).toBeVisible();
    expect(screen.getByText('No Pharmacy users to list.')).toBeInTheDocument();
  });

  it('routes the pharmacy application root and detail pages', () => {
    window.history.pushState({}, '', '/openmrs/spa/home/pharmacy');
    const view = render(<Root />);
    expect(screen.getByText('No Community Pharmacies to list.')).toBeVisible();
    view.unmount();

    window.history.pushState({}, '', '/openmrs/spa/home/pharmacy/p1');
    render(<Root />);
    expect(screen.getByText('Afya Pharmacy')).toBeVisible();
  });
});
