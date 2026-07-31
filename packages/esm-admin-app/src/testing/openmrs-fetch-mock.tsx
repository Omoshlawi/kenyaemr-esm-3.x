import React from 'react';
import { render } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { vi, type Mock } from 'vitest';
import { openmrsFetch as frameworkOpenmrsFetch } from '@openmrs/esm-framework';
import dayjs from 'dayjs';

import Root from '../root.component';
import { configSchema } from '../config-schema';

const configDefaults = {
  licenseNumberUuid: configSchema.licenseNumberUuid._default,
  licenseExpiryDateUuid: configSchema.licenseExpiryDateUuid._default,
  providerNationalIdUuid: configSchema.providerNationalIdUuid._default,
};

export type FetchRoute = {
  match: string | RegExp;
  /** Resolved value for the fetch (a FetchResponse-like object, usually `{ data: <body> }`), or a function of (url, init) returning one. */
  response?: unknown;
  error?: unknown;
};

/**
 * Installs one URL-dispatching implementation on BOTH openmrsFetch instances in the
 * test module graph: the framework mock's spy (used by the app's own hooks) and the
 * partially mocked `@openmrs/esm-api` spy (used by the real framework hooks such as
 * useFhirFetchAll/useOpenmrsPagination that run inside the official mock).
 * The api-side mock is passed in because `vi.mock('@openmrs/esm-api', ...)` is hoisted
 * and must live in the test file itself.
 * First matching route wins; unmatched URLs reject loudly so fixture gaps surface fast.
 */
export function installFetchDispatcher(apiFetchMock: Mock, routes: Array<FetchRoute>) {
  const dispatch = (url: string, init?: unknown) => {
    const route = routes.find((r) => (typeof r.match === 'string' ? url.includes(r.match) : r.match.test(url)));
    if (!route) {
      return Promise.reject(new Error(`Unstubbed request: ${url}`));
    }
    if (route.error !== undefined) {
      return Promise.reject(route.error);
    }
    try {
      const value = typeof route.response === 'function' ? (route.response as Function)(url, init) : route.response;
      return Promise.resolve(value);
    } catch (err) {
      return Promise.reject(err);
    }
  };
  vi.mocked(frameworkOpenmrsFetch).mockImplementation(dispatch as never);
  apiFetchMock.mockImplementation(dispatch as never);
}

/** All [url, init] tuples fetched so far, regardless of which openmrsFetch instance served them. */
export function allFetchCalls(apiFetchMock: Mock): Array<[string, unknown]> {
  return [...vi.mocked(frameworkOpenmrsFetch).mock.calls, ...apiFetchMock.mock.calls] as Array<[string, unknown]>;
}

export function allFetchUrls(apiFetchMock: Mock): Array<string> {
  return allFetchCalls(apiFetchMock).map(([url]) => url);
}

/** pushState under Root's BrowserRouter basename, then render Root with a fresh SWR cache. */
export function renderAdminApp(route: string) {
  window.history.pushState({}, '', `/openmrs/spa/admin${route}`);
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <Root />
    </SWRConfig>,
  );
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

export const usersFixture = [
  {
    uuid: 'user-1',
    display: 'Alice Wanjiku',
    username: 'awanjiku',
    systemId: 'admin-1',
    person: { uuid: 'person-1', display: 'Alice Wanjiku', gender: 'F' },
    roles: [{ uuid: 'role-inv', display: 'Inventory Manager', description: 'Inventory' }],
  },
  {
    uuid: 'user-2',
    display: 'Bob Otieno',
    username: 'botieno',
    systemId: 'clerk-2',
    person: { uuid: 'person-2', display: 'Bob Otieno', gender: 'M' },
    roles: [{ uuid: 'role-prov', display: 'Provider', description: 'Provider' }],
  },
  {
    uuid: 'user-3',
    display: 'Carol Akinyi',
    username: 'cakinyi',
    systemId: 'nurse-3',
    person: { uuid: 'person-3', display: 'Carol Akinyi', gender: 'F' },
    roles: [],
  },
];

export const providersFixture = [
  {
    uuid: 'provider-1',
    display: 'Alice Wanjiku',
    person: { uuid: 'person-1', display: 'Alice Wanjiku', gender: 'F' },
    attributes: [
      {
        uuid: 'attr-1a',
        attributeType: { uuid: configDefaults.licenseNumberUuid, display: 'License number' },
        value: 'A123',
      },
      {
        uuid: 'attr-1b',
        attributeType: { uuid: configDefaults.licenseExpiryDateUuid, display: 'License expiry' },
        value: dayjs().add(30, 'day').toISOString(),
      },
      {
        uuid: 'attr-1c',
        attributeType: { uuid: configDefaults.providerNationalIdUuid, display: 'National ID' },
        value: '12345678',
      },
    ],
  },
  {
    uuid: 'provider-2',
    display: 'Bob Otieno',
    person: { uuid: 'person-2', display: 'Bob Otieno', gender: 'M' },
    attributes: [
      {
        uuid: 'attr-2a',
        attributeType: { uuid: configDefaults.licenseNumberUuid, display: 'License number' },
        value: 'B456',
      },
      {
        uuid: 'attr-2b',
        attributeType: { uuid: configDefaults.licenseExpiryDateUuid, display: 'License expiry' },
        value: dayjs().subtract(10, 'day').toISOString(),
      },
    ],
  },
  {
    uuid: 'provider-3',
    display: 'Carol Akinyi',
    person: { uuid: 'person-3', display: 'Carol Akinyi', gender: 'F' },
    attributes: [],
  },
];

export const roleConfigSettingFixture = {
  results: [
    {
      uuid: 'role-config-1',
      property: 'kenyaemr.userRole.config',
      value: JSON.stringify([{ category: 'Core Inventory Roles', roles: ['Inventory Manager'] }]),
    },
  ],
};

export const locationTagsFixture = {
  results: [
    { uuid: 'tag-1', display: 'Facility', name: 'Facility', description: 'A facility' },
    { uuid: 'tag-2', display: 'Clinic', name: 'Clinic', description: 'A clinic' },
  ],
};

export const fhirLocationBundleFixture = {
  resourceType: 'Bundle',
  total: 2,
  entry: [
    {
      resource: {
        id: 'loc-1',
        name: 'Mbagathi Hospital',
        description: 'Main referral facility',
        meta: { tag: [{ system: 'http://fhir.openmrs.org/ext/location-tag', code: 'Facility' }] },
      },
    },
    {
      resource: {
        id: 'loc-2',
        name: 'Kibera Clinic',
        description: 'Satellite clinic',
        meta: { tag: [{ system: 'http://fhir.openmrs.org/ext/location-tag', code: 'Clinic' }] },
      },
    },
  ],
  link: [],
};

export const facilityRegistryFixture = {
  official_name: 'Mbagathi County Hospital',
  registration_number: 'REG-001',
  fr_code: 'FR-12345',
  fid_code: 'FID-999',
  keph_level: 'Level 4',
  facility_type: 'Hospital',
  facility_ownership: 'Ministry of Health',
  is_hub: true,
  license_number: 'LIC-777',
  regulatory_body: 'KMPDC',
  license_status: 'ACTIVE',
  license_start_date: '2026-01-01',
  license_end_date: '2026-12-31',
  regulatory_operational_status: 'OPERATIONAL',
  sha_operational_status: 'ACTIVE',
  sha_contract_status: 'CONTRACTED',
  bed_occupancy: { totalBeds: 120 },
  address: {
    country: 'Kenya',
    county: 'Nairobi',
    sub_county: 'Dagoretti',
    town: 'Nairobi',
    physical_location: 'Mbagathi Way',
    postal_address: 'P.O. Box 1',
  },
  facility_phone_number: '+254700000000',
  facility_email: 'info@mbagathi.go.ke',
  last_synced_at: '2026-07-01T08:00:00.000Z',
};

export const etlLogFixture = [
  {
    script_name: 'sp_update_etl_tables',
    start_time: '2026-07-01T08:00:00',
    stop_time: '2026-07-01T08:05:00',
    status: 'Success',
  },
];

export const globalPropertiesFixture = [
  { uuid: 'gp-1', property: 'setting.one', value: 'value1', description: 'First setting' },
  { uuid: 'gp-2', property: 'setting.two', value: 'value2', description: 'Second setting' },
];

/** Happy-path routes for every endpoint the routed pages hit. Prepend overrides per test. */
export function defaultRoutes(): Array<FetchRoute> {
  return [
    { match: '/ws/rest/v1/user?v=', response: { data: { results: usersFixture } } },
    { match: '/ws/rest/v1/provider?v=', response: { data: { results: providersFixture } } },
    { match: 'systemsetting?q=kenyaemr.userRole.config', response: { data: roleConfigSettingFixture } },
    { match: '/ws/rest/v1/locationtag?v=', response: { data: locationTagsFixture } },
    { match: /fhir2\/R4\/Location/, response: { data: fhirLocationBundleFixture } },
    { match: 'facility-registry/sync', response: { data: facilityRegistryFixture } },
    { match: 'virtualclaims/facility-registry', response: { data: facilityRegistryFixture } },
    { match: /kemrchart\//, response: { data: { data: etlLogFixture } } },
    {
      match: 'systemsetting?v=default',
      response: { data: { results: globalPropertiesFixture, links: [], totalCount: globalPropertiesFixture.length } },
    },
  ];
}
