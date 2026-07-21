import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  downloadClaimDocument,
  resolveEndpointTemplate,
} from '../../../../../claims-wrap/claim-workspaces/claim-document-generator/claim-document-generator-resource';
import { useClaimDocumentEndpoints } from '../../../../../claims-wrap/claim-workspaces/claim-document-generator/use-claim-document-endpoints';
import { type PreauthQueueItem } from '../../../../../../billing-form/social-health-authority/type';

export type PreauthGenStatus = 'idle' | 'generating' | 'failed';

export type PreauthGenRow = {
  documentType: string;
  label: string;
  hasEndpoint: boolean;
  missingParams: Array<string>;
  canGenerate: boolean;
  status: PreauthGenStatus;
  error?: string;
  isStaged: boolean;
};

type UsePreauthDocumentGenerationArgs = {
  item?: PreauthQueueItem;
  /** Document types offered for generation (typically the preauth's applicable/available types). */
  documentTypes: ReadonlyArray<string>;
  /** Whether a generated file for this type is already staged in the form. */
  isStaged: (documentType: string) => boolean;
  /** Persist the generated File into the form's attachments array. */
  onStaged: (documentType: string, file: File) => void;
  /** Remove a previously staged generated file from the form. */
  onUnstaged: (documentType: string) => void;
};

const humanize = (documentType: string) => documentType.replaceAll('_', ' ');

/**
 * Generates claim documents from configured EMR endpoints and stages them for the
 * final preauth submission WITHOUT uploading. The downloaded blob is wrapped as a
 * File and handed to the caller (via onStaged) so it rides along in the multipart
 * body when the whole preauth form is submitted.
 */
export function usePreauthDocumentGeneration({
  item,
  documentTypes,
  isStaged,
  onStaged,
  onUnstaged,
}: UsePreauthDocumentGenerationArgs) {
  const { t } = useTranslation();
  const { endpoints, isLoading, error } = useClaimDocumentEndpoints();

  const [statuses, setStatuses] = useState<Record<string, { status: PreauthGenStatus; error?: string }>>({});
  const abortControllers = useRef<Record<string, AbortController>>({});
  const objectUrls = useRef<Record<string, string>>({});

  const params = useMemo<Record<string, string | undefined>>(
    () => ({
      patientUuid: item?.patient?.uuid,
      visitUuid: item?.visit?.uuid,
      consentToken: item?.authorization_code,
      authorizationCode: item?.authorization_code,
      interventionCode: item?.intervention_code,
    }),
    [item?.patient?.uuid, item?.visit?.uuid, item?.authorization_code, item?.intervention_code],
  );

  useEffect(() => {
    const urls = objectUrls.current;
    const controllers = abortControllers.current;
    return () => {
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
      Object.values(controllers).forEach((controller) => controller.abort());
    };
  }, []);

  const generate = useCallback(
    async (documentType: string) => {
      const template = endpoints[documentType];
      if (!template) {
        return;
      }
      const resolved = resolveEndpointTemplate(template, params);
      if (resolved.missing.length > 0) {
        return;
      }

      const controller = new AbortController();
      abortControllers.current[documentType] = controller;
      setStatuses((prev) => ({ ...prev, [documentType]: { status: 'generating' } }));

      const {
        ok,
        document,
        error: genError,
      } = await downloadClaimDocument(resolved.url, documentType, t, controller.signal);
      delete abortControllers.current[documentType];

      if (!ok || !document) {
        setStatuses((prev) => ({ ...prev, [documentType]: { status: 'failed', error: genError } }));
        return;
      }

      const file = new File([document.blob], document.filename, { type: document.mimeType });
      const previousUrl = objectUrls.current[documentType];
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }
      objectUrls.current[documentType] = URL.createObjectURL(document.blob);
      setStatuses((prev) => ({ ...prev, [documentType]: { status: 'idle' } }));
      onStaged(documentType, file);
    },
    [endpoints, params, onStaged, t],
  );

  const discard = useCallback(
    (documentType: string) => {
      const url = objectUrls.current[documentType];
      if (url) {
        URL.revokeObjectURL(url);
        delete objectUrls.current[documentType];
      }
      setStatuses((prev) => ({ ...prev, [documentType]: { status: 'idle' } }));
      onUnstaged(documentType);
    },
    [onUnstaged],
  );

  const preview = useCallback((documentType: string) => {
    const url = objectUrls.current[documentType];
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  // Manual fallback: stage a user-picked file for a document type we cannot (or failed to) generate.
  const manualSelect = useCallback(
    (documentType: string, file: File) => {
      const previousUrl = objectUrls.current[documentType];
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }
      objectUrls.current[documentType] = URL.createObjectURL(file);
      setStatuses((prev) => ({ ...prev, [documentType]: { status: 'idle' } }));
      onStaged(documentType, file);
    },
    [onStaged],
  );

  const rows = useMemo<Array<PreauthGenRow>>(() => {
    return [...new Set(documentTypes)].map((documentType) => {
      const template = endpoints[documentType];
      const hasEndpoint = Boolean(template);
      const missingParams = template ? resolveEndpointTemplate(template, params).missing : [];
      const state = statuses[documentType] ?? { status: 'idle' as PreauthGenStatus };
      return {
        documentType,
        label: humanize(documentType),
        hasEndpoint,
        missingParams,
        canGenerate: hasEndpoint && missingParams.length === 0 && state.status !== 'generating',
        status: state.status,
        error: state.error,
        isStaged: isStaged(documentType),
      };
    });
  }, [documentTypes, endpoints, params, statuses, isStaged]);

  return { isLoading, error, rows, generate, discard, preview, manualSelect };
}
