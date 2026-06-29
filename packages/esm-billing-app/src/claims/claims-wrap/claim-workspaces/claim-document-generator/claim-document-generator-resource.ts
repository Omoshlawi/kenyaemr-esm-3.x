import { restBaseUrl } from '@openmrs/esm-framework';
import { TFunction } from 'i18next';
import {
  BatchAttachmentResult,
  BatchAttachmentsResponse,
} from '../../../claims-management/table/virtual-claim-preauth/type';
import { extractFetchError, extractUpstreamError } from '../../../claims-management/table/virtual-claim-preauth/utils';

const PLACEHOLDER_PATTERN = /\{(\w+)\}/g;

/**
 * Replace `{param}` tokens in an endpoint template with runtime values. Returns the
 * resolved url plus the list of tokens that had no value supplied so the caller can
 * block generation until the required context is available.
 */
export function resolveEndpointTemplate(
  template: string,
  params: Record<string, string | undefined>,
): { url: string; missing: Array<string> } {
  const missing: Array<string> = [];
  const url = template.replace(PLACEHOLDER_PATTERN, (_match, key: string) => {
    const value = params[key];
    if (value == null || value === '') {
      missing.push(key);
      return `{${key}}`;
    }
    return encodeURIComponent(value);
  });
  return { url, missing };
}

const FILENAME_FROM_DISPOSITION = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i;

function parseFilename(contentDisposition: string | null): string | undefined {
  if (!contentDisposition) {
    return undefined;
  }
  const match = FILENAME_FROM_DISPOSITION.exec(contentDisposition);
  if (!match?.[1]) {
    return undefined;
  }
  try {
    return decodeURIComponent(match[1].trim());
  } catch {
    return match[1].trim();
  }
}

function extensionForMime(mimeType: string): string {
  if (mimeType.includes('pdf')) {
    return 'pdf';
  }
  if (mimeType.includes('png')) {
    return 'png';
  }
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
    return 'jpg';
  }
  return 'bin';
}

/** Types the server may send for any binary, where the real format must be detected from the content. */
const GENERIC_MIME_TYPES = new Set(['', 'application/octet-stream', 'application/download', 'binary/octet-stream']);

function mimeFromExtension(filename: string): string | undefined {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    default:
      return undefined;
  }
}

/** Sniff the real MIME type from the leading magic bytes — endpoints often mislabel files as octet-stream. */
async function sniffMimeType(blob: Blob): Promise<string | undefined> {
  const header = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  const startsWith = (signature: Array<number>) => signature.every((byte, index) => header[index] === byte);

  if (startsWith([0x25, 0x50, 0x44, 0x46])) {
    return 'application/pdf';
  }
  if (startsWith([0x89, 0x50, 0x4e, 0x47])) {
    return 'image/png';
  }
  if (startsWith([0xff, 0xd8, 0xff])) {
    return 'image/jpeg';
  }
  if (startsWith([0x47, 0x49, 0x46, 0x38])) {
    return 'image/gif';
  }
  return undefined;
}

export type GeneratedDocument = {
  blob: Blob;
  mimeType: string;
  filename: string;
};

/**
 * Download (or trigger generation of) a document from an EMR endpoint. Same-origin
 * OpenMRS request, so the session cookie is sent via credentials. Returns the raw
 * blob plus metadata used to preview and later upload it.
 */
export async function downloadClaimDocument(
  url: string,
  documentType: string,
  t: TFunction,
  signal?: AbortSignal,
): Promise<{ ok: boolean; document?: GeneratedDocument; error?: string }> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        error: t('documentGenerateHttpError', 'Could not generate document (HTTP {{status}})', {
          status: response.status,
        }),
      };
    }

    const blob = await response.blob();
    const headerType = (response.headers.get('Content-Type') ?? '').split(';')[0].trim();
    const dispositionName = parseFilename(response.headers.get('Content-Disposition'));

    // Servers frequently mislabel generated documents (e.g. kenyaemr serves PDF receipts as `.dms`
    // attachments), so trust the file's magic bytes first, then any specific server/extension type,
    // and finally default to PDF — the format most claim endpoints return.
    const sniffed = await sniffMimeType(blob);
    const serverType = GENERIC_MIME_TYPES.has(headerType) ? undefined : headerType;
    const extensionType = dispositionName ? mimeFromExtension(dispositionName) : undefined;
    const mimeType = sniffed ?? serverType ?? extensionType ?? 'application/pdf';

    const filename = dispositionName ?? `${documentType.toLowerCase()}.${extensionForMime(mimeType)}`;
    // Re-wrap with the resolved type so object URLs preview inline instead of forcing a download.
    const typedBlob = blob.type === mimeType ? blob : new Blob([blob], { type: mimeType });

    return { ok: true, document: { blob: typedBlob, mimeType, filename } };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, error: t('documentGenerateCancelled', 'Document generation cancelled') };
    }
    return {
      ok: false,
      error: extractFetchError(err, t('documentGenerateError', 'Could not generate document. Please try again.')),
    };
  }
}

export type UploadResult = {
  ok: boolean;
  error?: string;
  result?: BatchAttachmentResult;
  response?: BatchAttachmentsResponse;
};

export type UploadGeneratedDocumentParams = {
  consentToken: string;
  interventionCode: string;
  documentType: string;
  documentTitle?: string;
  document: GeneratedDocument;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
  t: TFunction;
};

/**
 * Upload a generated document to the claim attachments batch endpoint using
 * XMLHttpRequest so upload progress can be reported (the fetch-based openmrsFetch
 * exposes no progress events). Reuses the same payload shape as the manual upload.
 */
export function uploadGeneratedDocument({
  consentToken,
  interventionCode,
  documentType,
  documentTitle,
  document,
  onProgress,
  signal,
  t,
}: UploadGeneratedDocumentParams): Promise<UploadResult> {
  return new Promise((resolve) => {
    if (!consentToken) {
      resolve({ ok: false, error: t('noConsentToken', 'No consent token provided') });
      return;
    }

    const metadata = [
      {
        intervention_code: interventionCode,
        document_type: documentType,
        ...(documentTitle ? { document_title: documentTitle } : {}),
      },
    ];

    const formData = new FormData();
    formData.append('consent_token', consentToken);
    formData.append('attachments_metadata', JSON.stringify(metadata));
    formData.append('attachments_files', document.blob, document.filename);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${window.openmrsBase}${restBaseUrl}/virtualclaims/billing/attachments/batch`);
    xhr.withCredentials = true;
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

    if (signal) {
      if (signal.aborted) {
        resolve({ ok: false, error: t('uploadCancelled', 'Upload cancelled') });
        return;
      }
      signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as BatchAttachmentsResponse;
          const result = data.results?.[0];
          if (result?.success) {
            onProgress?.(100);
            resolve({ ok: true, result, response: data });
          } else {
            const fallback = result?.error ?? t('uploadFailed', 'Upload failed');
            resolve({
              ok: false,
              error: result?.upstream_error
                ? extractUpstreamError({ error: result?.error, upstream_error: result.upstream_error }, fallback)
                : fallback,
              result,
              response: data,
            });
          }
        } catch {
          resolve({ ok: false, error: t('uploadParseError', 'Upload succeeded but the response was unreadable') });
        }
      } else {
        resolve({
          ok: false,
          error: t('uploadHttpError', 'Upload failed (HTTP {{status}})', { status: xhr.status }),
        });
      }
    };

    xhr.onerror = () => resolve({ ok: false, error: t('uploadNetworkError', 'Network error during upload') });
    xhr.onabort = () => resolve({ ok: false, error: t('uploadCancelled', 'Upload cancelled') });

    xhr.send(formData);
  });
}
