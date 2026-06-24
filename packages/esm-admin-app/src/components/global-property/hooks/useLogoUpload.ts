import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

export const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
export const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export type LogoTarget = 'prescription' | 'receipt';

export type UploadLogoResponse = {
  savedPath: string;
  message: string;
};

export async function uploadLogo(file: File, target: LogoTarget = 'prescription'): Promise<UploadLogoResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await openmrsFetch(`${restBaseUrl}/palladiumemr/logo?target=${target}`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error ?? errorData?.error?.message ?? 'Failed to upload image');
  }

  return response.json();
}
