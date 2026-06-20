import { FetchResponse, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import {
  BatchAttachmentsResponse,
  ClaimAttachmentsResponse,
  UploadAttachmentItem,
} from '../../../claims-management/table/virtual-claim-preauth/type';
import useSWR from 'swr';
import { extractFetchError, extractUpstreamError } from '../../../claims-management/table/virtual-claim-preauth/utils';
import { TFunction } from 'i18next';
export const uploadClaimAttachmentsBatch = async (
  consentToken: string,
  items: Array<UploadAttachmentItem>,
  t: TFunction,
): Promise<{ ok: boolean; error?: string; response?: BatchAttachmentsResponse }> => {
  if (!consentToken) {
    return { ok: false, error: t('noConsentToken', 'No consent token provided') };
  }
  if (!items || items.length === 0) {
    return { ok: false, error: t('noAttachmentsToUpload', 'No attachments to upload') };
  }

  const metadata = items.map((item) => ({
    intervention_code: item.interventionCode,
    document_type: item.documentType,
    ...(item.documentTitle ? { document_title: item.documentTitle } : {}),
  }));

  const formData = new FormData();
  formData.append('consent_token', consentToken);
  formData.append('attachments_metadata', JSON.stringify(metadata));
  items.forEach((item) => {
    formData.append('attachments_files', item.file, item.file.name);
  });

  try {
    const response = await openmrsFetch(`${restBaseUrl}/virtualclaims/billing/attachments/batch`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      return {
        ok: false,
        error: t('batchAttachmentsHttpError', 'Attachment upload failed (HTTP {{status}})', {
          status: response.status,
        }),
      };
    }

    const data = response.data as BatchAttachmentsResponse;
    const settled = (data.succeeded ?? 0) + (data.skipped ?? 0);
    if (settled === data.total) {
      return { ok: true, response: data };
    }

    const failure = (data.results ?? []).find((r) => r.success === false);
    if (failure) {
      const failureMsg = extractUpstreamError(
        {
          error: failure.error,
          upstream_error: failure.upstream_error,
        } as any,
        t('batchAttachmentsPartialFailure', '{{failed}} of {{total}} attachments failed', {
          failed: data.failed,
          total: data.total,
        }),
      );
      return { ok: false, error: failureMsg, response: data };
    }

    return {
      ok: false,
      error: t('batchAttachmentsPartialFailure', '{{failed}} of {{total}} attachments failed', {
        failed: data.failed,
        total: data.total,
      }),
      response: data,
    };
  } catch (err) {
    const networkFallback =
      err instanceof Error ? err.message : typeof err === 'string' ? err : t('unknownError', 'Unknown error');
    return {
      ok: false,
      error: extractFetchError(
        err,
        t('batchAttachmentsNetworkError', 'Could not upload attachments: {{message}}', {
          message: networkFallback,
        }),
      ),
    };
  }
};

export const useClaimAttachments = (consentToken: string | null) => {
  const url = consentToken
    ? `${restBaseUrl}/virtualclaims/billing/attachments?consent_token=${encodeURIComponent(consentToken)}`
    : null;
  const { data, error, isLoading, mutate } = useSWR<FetchResponse<ClaimAttachmentsResponse>>(url, openmrsFetch);
  return {
    interventions: data?.data?.interventions ?? [],
    total: data?.data?.total ?? 0,
    isLoading,
    error,
    mutate,
  };
};
