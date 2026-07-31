import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { createLeftPanelLink } from './left-pannel-link.component';

// The global react-i18next mock returns undefined for single-argument t(key)
// calls, which would leave the links unlabelled; label links by key instead.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// name/title pairs as registered in src/index.ts and src/components/global-property/index.ts
const registeredLinks = [
  { name: 'user-management', title: 'manageUsers' },
  { name: 'etl-administration', title: 'etlAdministration' },
  { name: 'locations', title: 'locations' },
  { name: 'facility-setup', title: 'facilityDetails' },
  { name: 'global-property', title: 'globalProperty' },
];

describe('createLeftPanelLink', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    window.history.pushState({}, '', '/openmrs/spa/admin');
  });

  it.each(registeredLinks)('renders the $title link pointing at /admin/$name', ({ name, title }) => {
    const LinkComponent = createLeftPanelLink({ name, title });
    render(<LinkComponent />);

    const link = screen.getByRole('link', { name: title });
    expect(link).toHaveAttribute('href', `/openmrs/spa/admin/${name}`);
  });

  it.each(registeredLinks)('navigates to /admin/$name when the $title link is clicked', async ({ name, title }) => {
    const LinkComponent = createLeftPanelLink({ name, title });
    render(<LinkComponent />);

    await user.click(screen.getByRole('link', { name: title }));
    expect(window.location.pathname).toBe(`/openmrs/spa/admin/${name}`);
  });

  it('marks the link matching the current route as active', () => {
    window.history.pushState({}, '', '/openmrs/spa/admin/locations');
    const LocationsLink = createLeftPanelLink({ name: 'locations', title: 'locations' });
    const FacilityLink = createLeftPanelLink({ name: 'facility-setup', title: 'facilityDetails' });
    render(
      <>
        <LocationsLink />
        <FacilityLink />
      </>,
    );

    expect(screen.getByRole('link', { name: 'locations' })).toHaveClass('active-left-nav-link');
    expect(screen.getByRole('link', { name: 'facilityDetails' })).not.toHaveClass('active-left-nav-link');
  });

  it('treats a trailing UUID segment as the user-management route', () => {
    window.history.pushState({}, '', '/openmrs/spa/admin/6eb8d678-514d-46ad-9554-51e48d96d567');
    const UserManagementLink = createLeftPanelLink({ name: 'user-management', title: 'manageUsers' });
    render(<UserManagementLink />);

    expect(screen.getByRole('link', { name: 'manageUsers' })).toHaveClass('active-left-nav-link');
  });
});
