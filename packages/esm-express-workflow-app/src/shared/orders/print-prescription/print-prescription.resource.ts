import { restBaseUrl } from '@openmrs/esm-framework';
import { useEffect, useMemo, useState } from 'react';

export function usePrescriptionPdf(medicationRequestUuids: string[]) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const uuidParam = useMemo(() => medicationRequestUuids.join(','), [medicationRequestUuids]);

  useEffect(() => {
    if (!uuidParam) {
      return;
    }

    let objectUrl: string | null = null;
    setIsLoading(true);
    setPdfUrl(null);
    setError(null);

    const url = `/openmrs${restBaseUrl}/palladiumemr/prescription?medicationRequestUuid=${uuidParam}`;

    fetch(url, { credentials: 'include', headers: { Accept: 'application/pdf' } })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`${response.status} ${response.statusText}`);
        }
        return response.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        setPdfUrl(objectUrl);
      })
      .catch((err) => setError(err instanceof Error ? err : new Error(String(err))))
      .finally(() => setIsLoading(false));

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [uuidParam]);

  return { pdfUrl, isLoading, error };
}
