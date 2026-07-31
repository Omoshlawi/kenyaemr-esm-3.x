import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getDefaultsFromConfigSchema, useConfig } from '@openmrs/esm-framework';
import dayjs from 'dayjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configSchema } from '../../../../config-schema';
import { useSystemUserRoleConfigSetting } from '../../../hook/useSystemRoleSetting';
import { useProvider, useUsers } from './user-list.resource';
import UserList from './user-list.component';

vi.mock('./user-list.resource', () => ({
  useProvider: vi.fn(),
  useUsers: vi.fn(),
}));

vi.mock('../../../hook/useSystemRoleSetting', () => ({
  useSystemUserRoleConfigSetting: vi.fn(),
}));

const config = getDefaultsFromConfigSchema(configSchema);
const users = [
  {
    uuid: 'user-active',
    systemId: 'active-1',
    person: { uuid: 'person-active', display: 'Active Provider', gender: 'F' },
    roles: [],
  },
  {
    uuid: 'user-expiring',
    systemId: 'soon-1',
    person: { uuid: 'person-expiring', display: 'Expiring Provider', gender: 'M' },
    roles: [],
  },
  {
    uuid: 'user-expired',
    systemId: 'expired-1',
    person: { uuid: 'person-expired', display: 'Expired Provider', gender: 'F' },
    roles: [],
  },
  {
    uuid: 'user-unlicensed',
    systemId: 'unlicensed-1',
    person: { uuid: 'person-unlicensed', display: 'Unlicensed Provider', gender: 'M' },
    roles: [],
  },
] as ReturnType<typeof useUsers>['users'];

const attribute = (uuid: string, value: string) => ({
  uuid: `${uuid}-${value}`,
  attributeType: { uuid, display: uuid },
  value,
});

const providers = [
  {
    uuid: 'provider-active',
    person: { uuid: 'person-active', display: 'Active Provider', gender: 'F' },
    attributes: [
      attribute(config.licenseNumberUuid, 'ACTIVE-123'),
      attribute(config.licenseExpiryDateUuid, dayjs().add(30, 'day').toISOString()),
    ],
  },
  {
    uuid: 'provider-expiring',
    person: { uuid: 'person-expiring', display: 'Expiring Provider', gender: 'M' },
    attributes: [
      attribute(config.licenseNumberUuid, 'SOON-123'),
      attribute(config.licenseExpiryDateUuid, dayjs().add(2, 'day').toISOString()),
    ],
  },
  {
    uuid: 'provider-expired',
    person: { uuid: 'person-expired', display: 'Expired Provider', gender: 'F' },
    attributes: [
      attribute(config.licenseNumberUuid, 'OLD-123'),
      attribute(config.licenseExpiryDateUuid, dayjs().subtract(2, 'day').toISOString()),
    ],
  },
  {
    uuid: 'provider-unlicensed',
    person: { uuid: 'person-unlicensed', display: 'Unlicensed Provider', gender: 'M' },
    attributes: [],
  },
] as ReturnType<typeof useProvider>['provider'];

const mockUseUsers = vi.mocked(useUsers);
const mockUseProvider = vi.mocked(useProvider);

async function selectFilter(name: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('combobox'));
  await user.click(await screen.findByRole('option', { name }));
}

describe('UserList filters and pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useConfig).mockReturnValue(config);
    vi.mocked(useSystemUserRoleConfigSetting).mockReturnValue({
      rolesConfig: [],
      isLoading: false,
      mutate: vi.fn(),
      error: undefined,
    });
    mockUseUsers.mockReturnValue({ users, isLoading: false, error: undefined, mutate: vi.fn() });
    mockUseProvider.mockReturnValue({ provider: providers, isLoading: false, error: undefined });
  });

  it('filters to active licensed providers', async () => {
    render(<UserList />);
    await selectFilter('Active Licensed');

    expect(screen.getByText('ACTIVE PROVIDER')).toBeVisible();
    expect(screen.getByText('EXPIRING PROVIDER')).toBeVisible();
    expect(screen.queryByText('EXPIRED PROVIDER')).not.toBeInTheDocument();
    expect(screen.queryByText('UNLICENSED PROVIDER')).not.toBeInTheDocument();
  });

  it('filters to licenses expiring within three days', async () => {
    render(<UserList />);
    await selectFilter('Licensed expiring soon');

    expect(screen.getByText('EXPIRING PROVIDER')).toBeVisible();
    expect(screen.queryByText('ACTIVE PROVIDER')).not.toBeInTheDocument();
    expect(screen.queryByText('EXPIRED PROVIDER')).not.toBeInTheDocument();
  });

  it('filters to providers without national IDs or license numbers', async () => {
    render(<UserList />);
    await selectFilter('Unlicensed');

    expect(screen.getByText('UNLICENSED PROVIDER')).toBeVisible();
    expect(screen.queryByText('ACTIVE PROVIDER')).not.toBeInTheDocument();
  });

  it('changes pages through the pagination control', async () => {
    const user = userEvent.setup();
    const paginatedUsers = Array.from({ length: 11 }, (_, index) => ({
      ...users[3],
      uuid: `user-${index + 1}`,
      systemId: `system-${index + 1}`,
      person: {
        ...users[3].person,
        uuid: `person-${index + 1}`,
        display: `Person ${index + 1}`,
      },
    }));
    const paginatedProviders = paginatedUsers.map((user) => ({
      ...providers[3],
      uuid: `provider-${user.uuid}`,
      person: user.person,
    }));
    mockUseUsers.mockReturnValue({
      users: paginatedUsers,
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    });
    mockUseProvider.mockReturnValue({ provider: paginatedProviders, isLoading: false, error: undefined });

    render(<UserList />);

    expect(screen.getByText('PERSON 1')).toBeVisible();
    expect(screen.queryByText('PERSON 11')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next page' }));

    expect(await screen.findByText('PERSON 11')).toBeVisible();
    expect(screen.queryByText('PERSON 1')).not.toBeInTheDocument();
  });
});
