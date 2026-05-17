import { openmrsFetch, restBaseUrl, useOpenmrsPagination } from '@openmrs/esm-framework';

import { type SystemSettings } from '../../../types';

export type GlobalPropertyPayload = {
  property: string;
  value: string;
  description?: string | null;
  datatypeClassname?: string | null;
  datatypeConfig?: string | null;
  preferredHandlerClassname?: string | null;
  handlerConfig?: string | null;
};

export async function saveOrUpdateGlobalProperty(payload: GlobalPropertyPayload, uuid?: string): Promise<void> {
  const url = uuid ? `${restBaseUrl}/systemsetting/${uuid}` : `${restBaseUrl}/systemsetting`;
  const body: Record<string, unknown> = {
    property: payload.property,
    value: payload.value,
  };
  if (payload.description) {
    body.description = payload.description;
  }
  if (payload.datatypeClassname) {
    body.datatypeClassname = payload.datatypeClassname;
  }
  if (payload.datatypeConfig) {
    body.datatypeConfig = payload.datatypeConfig;
  }
  if (payload.preferredHandlerClassname) {
    body.preferredHandlerClassname = payload.preferredHandlerClassname;
  }
  if (payload.handlerConfig != null) {
    body.handlerConfig = payload.handlerConfig;
  }

  const response = await openmrsFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message ?? 'Failed to save global property');
  }
}

export async function deleteGlobalProperty(uuid: string): Promise<void> {
  const response = await openmrsFetch(`${restBaseUrl}/systemsetting/${uuid}?purge=true`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message ?? 'Failed to delete global property');
  }
}

export function useGlobalProperties(pageSize: number = 10, searchTerm?: string) {
  const searchQuery = searchTerm ? `&q=${encodeURIComponent(searchTerm)}` : '';
  const baseUrl = `${restBaseUrl}/systemsetting?v=default`;
  const url = searchTerm ? `${baseUrl}${searchQuery}` : baseUrl;
  return useOpenmrsPagination<SystemSettings>(url, pageSize);
}
