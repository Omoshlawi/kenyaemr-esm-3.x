import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import classNames from 'classnames';
import { FormGroup, InlineNotification, Select, SelectItem, Tag } from '@carbon/react';
import { type PreauthQueueItem } from '../../../../../../billing-form/social-health-authority/type';
import RequiredLabel from '../components/required-label.component';
import GenerateDocumentsPanel from '../components/generate-documents-panel.component';
import { usePreauthDocuments } from '../hooks/use-preauth-documents';
import { type PreauthFormData } from '../pre-auth-schema';
import { DOCUMENT_TYPES } from '../../constants';
import styles from '../pre-auth-form.scss';

interface AttachmentsSectionProps {
  item?: PreauthQueueItem;
}

const humanize = (documentType: string) => documentType.replaceAll('_', ' ');

const AttachmentsSection: React.FC<AttachmentsSectionProps> = ({ item }) => {
  const { t } = useTranslation();
  const {
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext<PreauthFormData>();
  const { append: appendAttachment, remove: removeAttachment } = useFieldArray({
    control,
    name: 'attachments',
  });

  const { requiredPreauthDocs, availableDocumentTypes, isUsingFallbackDocs, hasAnyDocsAccepted } =
    usePreauthDocuments(item);

  const attachmentsValue = useWatch({ control, name: 'attachments' });
  const stagedTypes = useMemo(
    () => new Set((attachmentsValue ?? []).filter((a) => a?.source === 'generated').map((a) => a.document_type)),
    [attachmentsValue],
  );

  // Document types the user has picked to generate when SHA specifies no required docs.
  const [chosenTypes, setChosenTypes] = useState<Array<string>>([]);
  const [selectedDocType, setSelectedDocType] = useState('');

  const stageGenerated = useCallback(
    (documentType: string, file: File) => {
      const current = getValues('attachments') ?? [];
      const idx = current.findIndex((a) => a.document_type === documentType && a.source === 'generated');
      if (idx >= 0) {
        setValue(`attachments.${idx}.file`, file, { shouldValidate: true, shouldDirty: true });
        setValue(`attachments.${idx}.document_title`, file.name);
      } else {
        appendAttachment({ document_type: documentType, document_title: file.name, file, source: 'generated' });
      }
    },
    [getValues, setValue, appendAttachment],
  );

  const unstageGenerated = useCallback(
    (documentType: string) => {
      const current = getValues('attachments') ?? [];
      const idx = current.findIndex((a) => a.document_type === documentType && a.source === 'generated');
      if (idx >= 0) {
        removeAttachment(idx);
      }
    },
    [getValues, removeAttachment],
  );

  const isStaged = useCallback((documentType: string) => stagedTypes.has(documentType), [stagedTypes]);

  const pickedGeneratableTypes = useMemo(
    () => Array.from(new Set([...chosenTypes, ...stagedTypes])),
    [chosenTypes, stagedTypes],
  );

  const pickerOptions = useMemo(
    () => availableDocumentTypes.filter((d) => !pickedGeneratableTypes.includes(d)),
    [availableDocumentTypes, pickedGeneratableTypes],
  );

  const addChosenType = useCallback((documentType: string) => {
    if (!documentType) {
      return;
    }
    setChosenTypes((prev) => (prev.includes(documentType) ? prev : [...prev, documentType]));
    setSelectedDocType('');
  }, []);

  return (
    <div className={styles.twoCol}>
      {hasAnyDocsAccepted ? (
        <FormGroup
          legendText={
            requiredPreauthDocs.length > 0 ? (
              <RequiredLabel>{t('attachments', 'Attachments')}</RequiredLabel>
            ) : (
              t('attachmentsOptional', 'Supporting documents (optional)')
            )
          }>
          {requiredPreauthDocs.length > 0 ? (
            <>
              <div className={styles.requiredDocsHint}>
                {requiredPreauthDocs.map((dt) => (
                  <Tag key={dt} type="red" size="sm">
                    {humanize(dt)}
                  </Tag>
                ))}
              </div>
              <GenerateDocumentsPanel
                item={item}
                documentTypes={requiredPreauthDocs}
                additionalDocumentTypes={DOCUMENT_TYPES}
                isStaged={isStaged}
                onStaged={stageGenerated}
                onUnstaged={unstageGenerated}
              />
            </>
          ) : (
            <>
              {isUsingFallbackDocs && (
                <div className={classNames(styles.inlineNotification, styles.noDocsRequired)}>
                  <InlineNotification
                    kind="info"
                    lowContrast
                    hideCloseButton
                    title={t('noSpecificDocsTitle', 'No document types specified')}
                    subtitle={t(
                      'noSpecificDocsSubtitle',
                      'SHA has not specified document types for this preauth. Choose a document below to generate and attach it.',
                    )}
                  />
                </div>
              )}
              <Select
                className={styles.selectDocuments}
                id="doc-type-picker"
                labelText={t('selectDocumentToGenerate', 'Select a document to generate')}
                value={selectedDocType}
                onChange={(e) => addChosenType(e.target.value)}>
                <SelectItem value="" text={t('selectDocumentType', 'Select document type')} />
                {pickerOptions.map((d) => (
                  <SelectItem key={d} value={d} text={humanize(d)} />
                ))}
              </Select>
              <GenerateDocumentsPanel
                item={item}
                documentTypes={pickedGeneratableTypes}
                isStaged={isStaged}
                onStaged={stageGenerated}
                onUnstaged={unstageGenerated}
              />
            </>
          )}
          {errors.attachments?.root && <p className={styles.fieldError}>{errors.attachments.root.message}</p>}
        </FormGroup>
      ) : (
        <div className={classNames(styles.inlineNotification, styles.noDocsRequired)}>
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title={t('noDocsRequired', 'No documents required')}
            subtitle={t(
              'noDocsRequiredSubtitle',
              'SHA has not specified any supporting documents for this preauth type.',
            )}
          />
        </div>
      )}
    </div>
  );
};

export default AttachmentsSection;
