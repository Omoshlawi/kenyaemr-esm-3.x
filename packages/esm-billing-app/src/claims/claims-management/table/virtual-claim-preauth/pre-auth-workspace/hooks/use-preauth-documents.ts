import { useMemo } from 'react';
import { type PreauthQueueItem } from '../../../../../../billing-form/social-health-authority/type';
import { DOCUMENT_TYPES } from '../../constants';

export interface PreauthDocuments {
  requiredPreauthDocs: string[];
  optionalPreauthDocs: string[];
  availableDocumentTypes: string[];
  isUsingFallbackDocs: boolean;
  hasAnyDocsAccepted: boolean;
}

export function usePreauthDocuments(item?: PreauthQueueItem): PreauthDocuments {
  const requiredPreauthDocs = useMemo(
    () => Array.from(new Set(item?.required_preauth_document_types ?? [])),
    [item?.required_preauth_document_types],
  );
  const optionalPreauthDocs = useMemo(
    () => Array.from(new Set(item?.optional_preauth_document_types ?? [])),
    [item?.optional_preauth_document_types],
  );
  const acceptedDocumentTypes = useMemo(
    () => Array.from(new Set([...requiredPreauthDocs, ...optionalPreauthDocs])),
    [requiredPreauthDocs, optionalPreauthDocs],
  );
  const isUsingFallbackDocs = acceptedDocumentTypes.length === 0;
  const availableDocumentTypes = useMemo(
    () => (isUsingFallbackDocs ? [...DOCUMENT_TYPES] : acceptedDocumentTypes),
    [isUsingFallbackDocs, acceptedDocumentTypes],
  );
  const hasAnyDocsAccepted = availableDocumentTypes.length > 0;

  return {
    requiredPreauthDocs,
    optionalPreauthDocs,
    availableDocumentTypes,
    isUsingFallbackDocs,
    hasAnyDocsAccepted,
  };
}
