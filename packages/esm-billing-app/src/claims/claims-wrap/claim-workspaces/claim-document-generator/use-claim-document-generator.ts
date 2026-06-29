import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { showSnackbar } from '@openmrs/esm-framework';

import { useClaimDocumentEndpoints } from './use-claim-document-endpoints';
import {
  downloadClaimDocument,
  resolveEndpointTemplate,
  uploadGeneratedDocument,
  type GeneratedDocument,
} from './claim-document-generator-resource';
import { retireClaimAttachment } from '../attachements/claim-attachments-resource';
import { BatchAttachmentResult } from '../../../claims-management/table/virtual-claim-preauth/type';

export type RowStatus = 'idle' | 'generating' | 'ready' | 'uploading' | 'uploaded' | 'failed';

type RowState = {
  status: RowStatus;
  document?: GeneratedDocument;
  objectUrl?: string;
  progress: number;
  error?: string;
  uploadedUrl?: string;
  isReplacing?: boolean;
  isManual?: boolean;
  attachmentUuid?: string;
};

export type DocumentRow = RowState & {
  documentType: string;
  label: string;
  hasEndpoint: boolean;
  isLocked: boolean;
  isBusy: boolean;
  canGenerate: boolean;
  canManualUpload: boolean;
  missingParams: Array<string>;
};

export type ClaimDocumentActions = {
  generate: (documentType: string) => void;
  upload: (documentType: string) => void;
  cancel: (documentType: string) => void;
  discard: (documentType: string) => void;
  preview: (documentType: string) => void;
  replace: (documentType: string) => void;
  manualSelect: (documentType: string, file: File) => void;
};

export type UseClaimDocumentGeneratorArgs = {
  consentToken: string;
  interventionCode: string;
  documentTypes: ReadonlyArray<string>;
  params: Record<string, string | undefined>;
  alreadyUploadedTypes?: ReadonlyArray<string>;
  /** Maps an already-uploaded document type to its attachment uuid so a replacement can retire it first. */
  uploadedAttachmentUuids?: Record<string, string>;
  onUploaded?: (documentType: string, result: BatchAttachmentResult) => void;
  mutate?: () => void;
};

const initialRow: RowState = { status: 'idle', progress: 0 };

export const humanizeDocumentType = (documentType: string) => documentType.replaceAll('_', ' ');

export function useClaimDocumentGenerator({
  consentToken,
  interventionCode,
  documentTypes,
  params,
  alreadyUploadedTypes,
  uploadedAttachmentUuids,
  onUploaded,
  mutate,
}: UseClaimDocumentGeneratorArgs): {
  isLoading: boolean;
  error?: Error;
  rows: Array<DocumentRow>;
  actions: ClaimDocumentActions;
} {
  const { t } = useTranslation();
  const { endpoints, isLoading, error } = useClaimDocumentEndpoints();

  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  const rowStatesRef = useRef(rowStates);
  rowStatesRef.current = rowStates;

  const abortControllers = useRef<Record<string, AbortController>>({});
  const objectUrls = useRef<Array<string>>([]);

  const lockedTypes = useMemo(() => new Set(alreadyUploadedTypes ?? []), [alreadyUploadedTypes]);

  useEffect(() => {
    const urls = objectUrls.current;
    const controllers = abortControllers.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      Object.values(controllers).forEach((controller) => controller.abort());
    };
  }, []);

  const setRow = useCallback((documentType: string, patch: Partial<RowState>) => {
    setRowStates((prev) => ({ ...prev, [documentType]: { ...initialRow, ...prev[documentType], ...patch } }));
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
      setRow(documentType, { status: 'generating', error: undefined, progress: 0 });

      const {
        ok,
        document,
        error: genError,
      } = await downloadClaimDocument(resolved.url, documentType, t, controller.signal);
      delete abortControllers.current[documentType];

      if (!ok || !document) {
        setRow(documentType, { status: 'failed', error: genError });
        return;
      }

      const objectUrl = URL.createObjectURL(document.blob);
      objectUrls.current.push(objectUrl);
      setRow(documentType, { status: 'ready', document, objectUrl, error: undefined });
    },
    [endpoints, params, setRow, t],
  );

  const upload = useCallback(
    async (documentType: string) => {
      const currentRow = rowStatesRef.current[documentType];
      const document = currentRow?.document;
      if (!document) {
        return;
      }

      const controller = new AbortController();
      abortControllers.current[documentType] = controller;
      setRow(documentType, { status: 'uploading', progress: 0, error: undefined });
      const existingUuid = currentRow?.attachmentUuid ?? uploadedAttachmentUuids?.[documentType];
      if (currentRow?.isReplacing && existingUuid) {
        const retire = await retireClaimAttachment({
          consentToken,
          attachmentUuid: existingUuid,
          interventionCode,
          t,
        });
        if (!retire.ok) {
          delete abortControllers.current[documentType];
          setRow(documentType, { status: 'failed', progress: 0, error: retire.error });
          return;
        }
      }

      const result = await uploadGeneratedDocument({
        consentToken,
        interventionCode,
        documentType,
        document,
        signal: controller.signal,
        onProgress: (percent) => setRow(documentType, { status: 'uploading', progress: percent }),
        t,
      });
      delete abortControllers.current[documentType];

      if (!result.ok) {
        setRow(documentType, { status: 'failed', progress: 0, error: result.error });
        return;
      }

      setRow(documentType, {
        status: 'uploaded',
        progress: 100,
        uploadedUrl: result.result?.url,
        attachmentUuid: result.result?.attachment_uuid,
        isReplacing: false,
      });
      showSnackbar({
        title: t('documentUploaded', 'Document uploaded'),
        subtitle: t('documentUploadedDesc', '{{type}} was attached to the claim', {
          type: humanizeDocumentType(documentType),
        }),
        kind: 'success',
        isLowContrast: true,
      });
      if (result.result) {
        onUploaded?.(documentType, result.result);
      }
      mutate?.();
    },
    [consentToken, interventionCode, uploadedAttachmentUuids, onUploaded, mutate, setRow, t],
  );

  const cancel = useCallback((documentType: string) => {
    abortControllers.current[documentType]?.abort();
  }, []);

  const discard = useCallback((documentType: string) => {
    setRowStates((prev) => {
      const row = prev[documentType];
      if (row?.objectUrl) {
        URL.revokeObjectURL(row.objectUrl);
        objectUrls.current = objectUrls.current.filter((url) => url !== row.objectUrl);
      }
      return { ...prev, [documentType]: initialRow };
    });
  }, []);

  const preview = useCallback((documentType: string) => {
    const objectUrl = rowStatesRef.current[documentType]?.objectUrl;
    if (objectUrl) {
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
    }
  }, []);

  const replace = useCallback((documentType: string) => {
    setRowStates((prev) => {
      const row = prev[documentType];
      if (row?.objectUrl) {
        URL.revokeObjectURL(row.objectUrl);
        objectUrls.current = objectUrls.current.filter((url) => url !== row.objectUrl);
      }
      return { ...prev, [documentType]: { ...initialRow, isReplacing: true, attachmentUuid: row?.attachmentUuid } };
    });
  }, []);

  const manualSelect = useCallback(
    (documentType: string, file: File) => {
      const mimeType = file.type || 'application/octet-stream';
      const document: GeneratedDocument = { blob: file, mimeType, filename: file.name };
      const objectUrl = URL.createObjectURL(file);
      objectUrls.current.push(objectUrl);
      setRow(documentType, { status: 'ready', document, objectUrl, error: undefined, isManual: true });
    },
    [setRow],
  );

  const rows = useMemo<Array<DocumentRow>>(() => {
    return [...new Set(documentTypes)].map((documentType) => {
      const state = rowStates[documentType] ?? initialRow;
      const template = endpoints[documentType];
      const missingParams = template ? resolveEndpointTemplate(template, params).missing : [];
      const isBusy = state.status === 'generating' || state.status === 'uploading';
      const canGenerate = Boolean(template) && missingParams.length === 0;
      return {
        ...state,
        documentType,
        label: humanizeDocumentType(documentType),
        hasEndpoint: Boolean(template),
        isLocked: (lockedTypes.has(documentType) || state.status === 'uploaded') && !state.isReplacing,
        isBusy,
        canGenerate,
        canManualUpload:
          !isBusy &&
          state.status !== 'ready' &&
          (!canGenerate || state.status === 'failed' || Boolean(state.isReplacing)),
        missingParams,
      };
    });
  }, [documentTypes, rowStates, endpoints, params, lockedTypes]);

  const actions = useMemo<ClaimDocumentActions>(
    () => ({ generate, upload, cancel, discard, preview, replace, manualSelect }),
    [generate, upload, cancel, discard, preview, replace, manualSelect],
  );

  return { isLoading, error, rows, actions };
}
