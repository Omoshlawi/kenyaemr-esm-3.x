import React, { useCallback, useMemo, useState } from 'react';
import { showSnackbar, useLayoutType, Workspace2, type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import {
  Button,
  ButtonSet,
  FileUploader,
  Form,
  FormGroup,
  InlineLoading,
  InlineNotification,
  Layer,
  Select,
  SelectItem,
  Tag,
  TextInput,
} from '@carbon/react';
import { CheckmarkFilled, TrashCan } from '@carbon/react/icons';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';

import styles from './claim-attachments.scss';
import { ClaimAttachmentsFormData, claimAttachmentsSchema } from './claim-attachements-schema';
import { UploadAttachmentItem } from '../../../claims-management/table/virtual-claim-preauth/type';
import { extractUpstreamError } from '../../../claims-management/table/virtual-claim-preauth/utils';
import { uploadClaimAttachmentsBatch } from './claim-attachments-resource';

type ClaimAttachmentsWorkspaceProps = {
  consentToken: string;
  interventionCode: string;
  interventionName: string;
  applicableDocumentTypes: ReadonlyArray<string>;
  alreadyUploadedTypes: ReadonlyArray<string>;
  mutate: () => void;
  preselectedDocumentType?: string;
  replacementNotice?: { documentType: string; filename?: string };
};

type RowStatus = 'pending' | 'uploading' | 'succeeded' | 'already_sent' | 'failed';

type RowResult = {
  status: RowStatus;
  error?: string;
  attachmentUuid?: string;
  retrievalId?: string;
  url?: string;
};

const RequiredLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span>
    {children}
    <span className={styles.required} aria-hidden="true">
      *
    </span>
  </span>
);

const ClaimAttachmentsWorkspace: React.FC<Workspace2DefinitionProps<ClaimAttachmentsWorkspaceProps, {}, {}>> = ({
  workspaceProps,
  closeWorkspace,
}) => {
  const { consentToken, interventionCode, interventionName, applicableDocumentTypes, alreadyUploadedTypes, mutate } =
    workspaceProps ?? ({} as ClaimAttachmentsWorkspaceProps);
  const { preselectedDocumentType, replacementNotice } = workspaceProps ?? ({} as ClaimAttachmentsWorkspaceProps);

  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';

  const availableDocumentTypes = useMemo(() => {
    const blocked = new Set((alreadyUploadedTypes ?? []).map((d) => d));
    return (applicableDocumentTypes ?? []).filter((d) => !blocked.has(d));
  }, [applicableDocumentTypes, alreadyUploadedTypes]);

  const {
    control,
    handleSubmit,
    register,
    setValue,
    getValues,
    formState: { errors, isDirty },
  } = useForm<ClaimAttachmentsFormData>({
    resolver: zodResolver(claimAttachmentsSchema),
    defaultValues: {
      attachments: [
        {
          document_title: '',
          document_type: availableDocumentTypes[0] ?? '',
          file: null as unknown as File,
        },
      ],
    },
  });

  const {
    fields: attachmentFields,
    append: appendAttachment,
    remove: removeAttachment,
  } = useFieldArray({ control, name: 'attachments' });
  const [rowResults, setRowResults] = useState<Map<string, RowResult>>(new Map());
  const watchedAttachments = useWatch({ control, name: 'attachments' });

  const getAvailableTypesForRow = useCallback(
    (rowIdx: number) => {
      const usedByOthers = new Set<string>();
      (watchedAttachments ?? []).forEach((row, idx) => {
        if (idx !== rowIdx && row?.document_type) {
          usedByOthers.add(row.document_type);
        }
      });
      return availableDocumentTypes.filter((d) => !usedByOthers.has(d));
    },
    [watchedAttachments, availableDocumentTypes],
  );

  React.useEffect(() => {
    if (!preselectedDocumentType) {
      return;
    }
    const tid = setTimeout(() => {
      const current = getValues('attachments.0.document_type');
      if (!current) {
        setValue('attachments.0.document_type', preselectedDocumentType);
      }
    }, 0);
    return () => clearTimeout(tid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedDocumentType, getValues, setValue]);

  const pendingRowsCount = useMemo(() => {
    return attachmentFields.filter((f) => {
      const status = rowResults.get(f.id)?.status;
      return !status || status === 'pending' || status === 'failed';
    }).length;
  }, [attachmentFields, rowResults]);

  const succeededCount = useMemo(() => {
    return attachmentFields.filter((f) => {
      const s = rowResults.get(f.id)?.status;
      return s === 'succeeded' || s === 'already_sent';
    }).length;
  }, [attachmentFields, rowResults]);

  const failedCount = useMemo(() => {
    return attachmentFields.filter((f) => rowResults.get(f.id)?.status === 'failed').length;
  }, [attachmentFields, rowResults]);

  const allDone = pendingRowsCount === 0 && attachmentFields.length > 0;
  const hasAnySucceeded = succeededCount > 0;
  const hasAnyFailed = failedCount > 0;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitButtonLabel = allDone
    ? t('close', 'Close')
    : hasAnySucceeded || hasAnyFailed
    ? t('retryFailedCount', 'Retry {{count}} failed', { count: pendingRowsCount })
    : t('uploadNAttachments', 'Upload {{count}} attachments', { count: pendingRowsCount });

  const handleRemoveRow = useCallback(
    (idx: number) => {
      const fieldId = attachmentFields[idx]?.id;
      const status = fieldId ? rowResults.get(fieldId)?.status : undefined;
      if (status === 'succeeded' || status === 'already_sent') {
        const ok = window.confirm(
          t(
            'removeUploadedConfirm',
            'This attachment is already on the claim. Removing it from this form does NOT delete it from the claim. Continue?',
          ),
        );
        if (!ok) {
          return;
        }
      }

      if (fieldId) {
        setRowResults((prev) => {
          const next = new Map(prev);
          next.delete(fieldId);
          return next;
        });
      }
      removeAttachment(idx);
    },
    [attachmentFields, removeAttachment, rowResults, t],
  );

  const handleAddRow = useCallback(() => {
    const usedTypes = new Set((getValues('attachments') ?? []).map((a) => a.document_type).filter(Boolean));
    const firstFree = availableDocumentTypes.find((d) => !usedTypes.has(d)) ?? '';
    appendAttachment({
      document_title: '',
      document_type: firstFree,
      file: null as unknown as File,
    });
  }, [appendAttachment, availableDocumentTypes, getValues]);

  if (!workspaceProps) {
    return null;
  }

  const onSubmit = async (data: ClaimAttachmentsFormData) => {
    if (allDone) {
      closeWorkspace();
      return;
    }

    const rowsToUpload = data.attachments
      .map((att, idx) => ({ att, idx, fieldId: attachmentFields[idx].id }))
      .filter(({ fieldId }) => {
        const status = rowResults.get(fieldId)?.status;
        return !status || status === 'pending' || status === 'failed';
      });

    if (rowsToUpload.length === 0) {
      closeWorkspace();
      return;
    }

    setIsSubmitting(true);

    setRowResults((prev) => {
      const next = new Map(prev);
      rowsToUpload.forEach(({ fieldId }) => {
        next.set(fieldId, { status: 'uploading' });
      });
      return next;
    });

    const items: Array<UploadAttachmentItem> = rowsToUpload.map(({ att }) => ({
      interventionCode,
      documentType: att.document_type,
      documentTitle: att.document_title || undefined,
      file: att.file,
    }));

    const result = await uploadClaimAttachmentsBatch(consentToken, items, t);
    setRowResults((prev) => {
      const next = new Map(prev);

      if (result.response) {
        result.response.results.forEach((r, resultIdx) => {
          const { fieldId } = rowsToUpload[resultIdx];
          if (!fieldId) {
            return;
          }

          if (r.success && r.already_sent) {
            next.set(fieldId, {
              status: 'already_sent',
              attachmentUuid: r.attachment_uuid,
              retrievalId: r.retrieval_id,
              url: r.url,
            });
          } else if (r.success) {
            next.set(fieldId, {
              status: 'succeeded',
              attachmentUuid: r.attachment_uuid,
              retrievalId: r.retrieval_id,
              url: r.url,
            });
          } else {
            const fallback = r.error ?? t('uploadFailed', 'Upload failed');
            const errMsg = r.upstream_error
              ? extractUpstreamError({ error: r.error, upstream_error: r.upstream_error } as any, fallback)
              : fallback;
            next.set(fieldId, { status: 'failed', error: errMsg });
          }
        });
      } else {
        rowsToUpload.forEach(({ fieldId }) => {
          next.set(fieldId, {
            status: 'failed',
            error: result.error ?? t('uploadFailed', 'Upload failed'),
          });
        });
      }
      return next;
    });

    setIsSubmitting(false);
    const finalResults = result.response
      ? rowsToUpload.every((_, i) => {
          const r = result.response!.results[i];
          return r?.success === true;
        })
      : false;

    if (finalResults) {
      showSnackbar({
        title: t('attachmentsUploaded', 'Attachments uploaded'),
        subtitle: t('attachmentsUploadedDesc', '{{count}} attachments saved to the claim', {
          count: rowsToUpload.length,
        }),
        kind: 'success',
        isLowContrast: true,
      });
      mutate();
      setTimeout(() => closeWorkspace(), 1500);
    } else {
      showSnackbar({
        title: t('attachmentsPartial', 'Some attachments failed'),
        subtitle: t('attachmentsPartialDesc', 'Review the errors below and resubmit'),
        kind: 'warning',
        isLowContrast: true,
      });
      mutate();
    }
  };

  const cardClassFor = (status: RowStatus | undefined) => {
    return classNames(styles.itemCard, {
      [styles.itemCardSucceeded]: status === 'succeeded',
      [styles.itemCardAlreadySent]: status === 'already_sent',
      [styles.itemCardFailed]: status === 'failed',
      [styles.itemCardUploading]: status === 'uploading',
    });
  };

  if (availableDocumentTypes.length === 0) {
    return (
      <Workspace2 hasUnsavedChanges={false} title={t('uploadAttachments', 'Upload attachments')}>
        <div className={styles.emptyState}>
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title={t('allDocsUploaded', 'All required documents uploaded')}
            subtitle={t(
              'allDocsUploadedDesc',
              'All applicable document types for {{intervention}} have already been uploaded for this claim.',
              { intervention: interventionName },
            )}
          />
          <Button kind="primary" onClick={() => closeWorkspace()}>
            {t('close', 'Close')}
          </Button>
        </div>
      </Workspace2>
    );
  }

  return (
    <Workspace2
      hasUnsavedChanges={isDirty && !allDone}
      title={t('uploadAttachmentsForIntervention', 'Upload attachments')}>
      <Form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.claimBanner}>
          <div className={styles.bannerItem}>
            <span className={styles.bannerLabel}>{t('ivName', 'Intervention name')}</span>
            <span className={styles.bannerValue}>{interventionName}</span>
          </div>
          <div className={styles.bannerItem}>
            <span className={styles.bannerLabel}>{t('ivCode', 'Intervention code')}</span>
            <span className={styles.bannerValue}>{interventionCode}</span>
          </div>
        </div>
        <div className={styles.formContainer}>
          {(hasAnySucceeded || hasAnyFailed) && (
            <InlineNotification
              kind={hasAnyFailed ? 'warning' : 'success'}
              lowContrast
              hideCloseButton
              title={hasAnyFailed ? t('partialUpload', 'Partial upload') : t('uploadSuccess', 'Upload successful')}
              subtitle={
                hasAnyFailed
                  ? t('partialUploadDesc', '{{succeeded}} succeeded, {{failed}} failed — fix and resubmit', {
                      succeeded: succeededCount,
                      failed: failedCount,
                    })
                  : t('uploadSuccessDesc', '{{count}} attachments uploaded', {
                      count: succeededCount,
                    })
              }
              className={styles.statusBanner}
            />
          )}

          <FormGroup legendText={<RequiredLabel>{t('attachments', 'Attachments')}</RequiredLabel>}>
            {attachmentFields.map((field, idx) => {
              const result = rowResults.get(field.id);
              const status = result?.status;
              const isLocked = status === 'succeeded' || status === 'already_sent';
              const isUploading = status === 'uploading';
              const isFailed = status === 'failed';
              const availableForThisRow = getAvailableTypesForRow(idx);

              return (
                <Layer key={field.id}>
                  <div className={cardClassFor(status)}>
                    {isLocked && (
                      <div className={styles.rowStatusHeader}>
                        <Tag type={status === 'already_sent' ? 'blue' : 'green'} renderIcon={CheckmarkFilled} size="md">
                          {status === 'already_sent'
                            ? t('alreadyOnClaim', 'Already on claim')
                            : t('uploaded', 'Uploaded')}
                        </Tag>
                        {result?.url && (
                          <a href={result.url} target="_blank" rel="noopener noreferrer" className={styles.viewLink}>
                            {t('view', 'View')} ↗
                          </a>
                        )}
                      </div>
                    )}

                    {isUploading && (
                      <div className={styles.rowStatusHeader}>
                        <InlineLoading description={t('uploading', 'Uploading...')} />
                      </div>
                    )}

                    {isFailed && result?.error && (
                      <InlineNotification
                        kind="error"
                        lowContrast
                        hideCloseButton
                        title={t('uploadFailed', 'Upload failed')}
                        subtitle={result.error}
                        className={styles.rowError}
                      />
                    )}

                    <div className={styles.twoCol}>
                      <Controller
                        name={`attachments.${idx}.document_type`}
                        control={control}
                        render={({ field }) => (
                          <Select
                            {...field}
                            id={`att-type-${idx}`}
                            disabled={isLocked || isUploading}
                            labelText={<RequiredLabel>{t('documentType', 'Document type')}</RequiredLabel>}
                            invalid={!!errors.attachments?.[idx]?.document_type}
                            invalidText={errors.attachments?.[idx]?.document_type?.message}>
                            <SelectItem value="" text={t('selectDocumentType', 'Select document type')} />
                            {availableForThisRow.map((d) => (
                              <SelectItem key={d} value={d} text={d.replace(/_/g, ' ')} />
                            ))}
                            {field.value && !availableForThisRow.includes(field.value) && (
                              <SelectItem key={field.value} value={field.value} text={field.value.replace(/_/g, ' ')} />
                            )}
                          </Select>
                        )}
                      />
                      <TextInput
                        id={`att-title-${idx}`}
                        labelText={t('documentTitle', 'Document title')}
                        disabled={isLocked || isUploading}
                        {...register(`attachments.${idx}.document_title`)}
                      />
                    </div>

                    <Controller
                      name={`attachments.${idx}.file`}
                      control={control}
                      render={({ field }) => (
                        <>
                          <p className={styles.uploaderLabel}>
                            <RequiredLabel>{t('uploadFile', 'Upload file')}</RequiredLabel>
                          </p>
                          {isLocked && field.value ? (
                            <div className={styles.lockedFileDisplay}>
                              <span className={styles.lockedFileIcon}>📎</span>
                              <span className={styles.lockedFilename}>{field.value.name}</span>
                              <span className={styles.lockedFileSize}>{Math.round(field.value.size / 1024)} KB</span>
                            </div>
                          ) : (
                            <FileUploader
                              labelTitle=""
                              labelDescription={t('uploadFileDesc', 'PDF or image (PDF, JPG, PNG, HEIC) — max 10MB')}
                              buttonLabel={t('addFile', 'Add file')}
                              buttonKind="tertiary"
                              size="md"
                              filenameStatus="edit"
                              accept={['application/pdf', 'image/*']}
                              multiple={false}
                              disabled={isUploading}
                              onChange={(e: { target: HTMLInputElement; addedFiles?: File[] }) => {
                                const file = e.addedFiles?.[0] ?? e.target?.files?.[0] ?? null;
                                field.onChange(file);
                              }}
                              onDelete={() => field.onChange(null)}
                            />
                          )}
                          {errors.attachments?.[idx]?.file && (
                            <p className={styles.fieldError}>{errors.attachments[idx]?.file?.message}</p>
                          )}
                        </>
                      )}
                    />

                    <div className={styles.addBtnContainer}>
                      {idx === attachmentFields.length - 1 && (
                        <Button
                          kind="tertiary"
                          size="sm"
                          className={styles.addBtn}
                          disabled={
                            attachmentFields.length >= 20 ||
                            availableDocumentTypes.length <= succeededCount + failedCount + pendingRowsCount
                          }
                          onClick={handleAddRow}>
                          {t('addAttachment', '+ Add attachment')}
                        </Button>
                      )}
                      {attachmentFields.length > 1 && (
                        <Button
                          kind="danger--tertiary"
                          size="sm"
                          className={styles.removeBtn}
                          renderIcon={TrashCan}
                          iconDescription={t('remove', 'Remove')}
                          hasIconOnly
                          disabled={isUploading}
                          onClick={() => handleRemoveRow(idx)}
                        />
                      )}
                    </div>
                  </div>
                </Layer>
              );
            })}
            {errors.attachments?.root && <p className={styles.fieldError}>{errors.attachments.root.message}</p>}
          </FormGroup>
        </div>

        <ButtonSet className={classNames({ [styles.tablet]: isTablet, [styles.desktop]: !isTablet })}>
          <Button className={styles.button} kind="secondary" onClick={() => closeWorkspace()}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button
            className={styles.button}
            disabled={isSubmitting || (!isDirty && !allDone && !hasAnyFailed)}
            kind={allDone ? 'primary' : 'primary'}
            type="submit">
            {isSubmitting ? (
              <InlineLoading className={styles.spinner} description={t('uploading', 'Uploading') + '...'} />
            ) : (
              <span>{submitButtonLabel}</span>
            )}
          </Button>
        </ButtonSet>
      </Form>
    </Workspace2>
  );
};

export default ClaimAttachmentsWorkspace;
