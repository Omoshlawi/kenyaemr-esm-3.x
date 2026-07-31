import React from 'react';
import { render, screen } from '@testing-library/react';
import { getDefaultsFromConfigSchema, useConfig } from '@openmrs/esm-framework';
import dayjs from 'dayjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configSchema } from '../../../../config-schema';
import { type ProviderResponse, type UserResponse } from '../../../../types';
import UserDetails from './user-details.component';

const config = getDefaultsFromConfigSchema(configSchema);
const attribute = (uuid: string, value: unknown) => ({
  uuid: `${uuid}-${String(value)}`,
  attributeType: { uuid, display: uuid },
  value,
});

const user = {
  uuid: 'user-1',
  roles: [],
} as UserResponse;

function providerWith(attributes: Array<ReturnType<typeof attribute>>, gender = 'F') {
  return {
    uuid: 'provider-1',
    person: { uuid: 'person-1', display: 'Alice Wanjiku', gender },
    attributes,
  } as ProviderResponse;
}

describe('UserDetails', () => {
  beforeEach(() => {
    vi.mocked(useConfig).mockReturnValue(config);
  });

  it('shows an unlicensed status, female gender, and the no-roles state', () => {
    render(<UserDetails provider={providerWith([])} user={user} />);

    expect(screen.getByText('Unlicensed')).toBeVisible();
    expect(screen.getByText('Female')).toBeVisible();
    expect(screen.getByText('No roles assigned')).toBeInTheDocument();
  });

  it('shows expired and expiring-soon license statuses', () => {
    const { rerender } = render(
      <UserDetails
        provider={providerWith([
          attribute(config.licenseNumberUuid, 'LIC-1'),
          attribute(config.licenseExpiryDateUuid, dayjs().subtract(2, 'day').toISOString()),
        ])}
        user={user}
      />,
    );
    expect(screen.getByText('License expired')).toBeVisible();

    rerender(
      <UserDetails
        provider={providerWith([
          attribute(config.licenseNumberUuid, 'LIC-1'),
          attribute(config.licenseExpiryDateUuid, dayjs().add(2, 'day').toISOString()),
        ])}
        user={user}
      />,
    );
    expect(screen.getByText('License expiring soon')).toBeVisible();
  });

  it('shows male gender and leaves unknown gender blank', () => {
    const { rerender } = render(<UserDetails provider={providerWith([], 'M')} user={user} />);
    expect(screen.getByText('Male')).toBeVisible();

    rerender(<UserDetails provider={providerWith([], 'U')} user={user} />);
    expect(screen.queryByText('Male')).not.toBeInTheDocument();
    expect(screen.queryByText('Female')).not.toBeInTheDocument();
  });

  it('renders practice and provider identifiers with non-string attribute values', () => {
    render(
      <UserDetails
        provider={providerWith([
          attribute(config.licenseNumberUuid, 'LIC-1'),
          attribute(config.practiceTypeUuid, 'private practice'),
          attribute(config.providerUniqueIdentifierAttributeTypeUuid, 12345),
          attribute(config.externalProviderIdentifierUuid, 'EXT-99'),
        ])}
        user={user}
      />,
    );

    expect(screen.getByText('private practice')).toBeVisible();
    expect(screen.getByText('12345')).toBeVisible();
    expect(screen.getByText('EXT-99')).toBeVisible();
  });

  it('renders qualification, specialty, and cadre tags for an active provider', () => {
    render(
      <UserDetails
        provider={providerWith([
          attribute(config.licenseNumberUuid, 'LIC-1'),
          attribute(config.licenseExpiryDateUuid, dayjs().add(30, 'day').toISOString()),
          attribute(config.qualificationUuid, 'medical degree'),
          attribute(config.specialtyUuid, 'cardiology'),
          attribute(config.providerCadreUuid, 'consultant'),
        ])}
        user={user}
      />,
    );

    expect(screen.getByText('Active')).toBeVisible();
    expect(screen.getByText('Medical degree')).toBeVisible();
    expect(screen.getByText('Cardiology')).toBeVisible();
    expect(screen.getByText('Consultant')).toBeVisible();
  });

  it('renders assigned roles and falls back when a role has no description', () => {
    render(
      <UserDetails
        provider={providerWith([])}
        user={
          {
            ...user,
            roles: [
              { uuid: 'role-1', display: 'Inventory Manager', description: 'Manages inventory' },
              { uuid: 'role-2', display: 'Provider', description: '' },
            ],
          } as UserResponse
        }
      />,
    );

    expect(screen.getByText('Inventory Manager')).toBeInTheDocument();
    expect(screen.getByText('Manages inventory')).toBeInTheDocument();
    expect(screen.getByText('Provider')).toBeInTheDocument();
    expect(screen.getByText('No description available')).toBeInTheDocument();
  });
});
