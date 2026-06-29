import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, InlineNotification, Layer, ProgressBar, SkeletonText, Tag } from '@carbon/react';
import { CheckmarkFilled, DocumentPdf, Renew, TrashCan, Upload, View } from '@carbon/react/icons';
import classNames from 'classnames';

import styles from './claim-document-generator.scss';
import {
  useClaimDocumentGenerator,
  type ClaimDocumentActions,
  type DocumentRow,
  type UseClaimDocumentGeneratorArgs,
} from './use-claim-document-generator';
import { type GeneratedDocument } from './claim-document-generator-resource';

export type ClaimDocumentGeneratorProps = UseClaimDocumentGeneratorArgs;

const isPreviewableImage = (mimeType?: string) =>
  typeof mimeType === 'string' && mimeType.toLowerCase().startsWith('image/');
const isPreviewablePdf = (mimeType?: string) => typeof mimeType === 'string' && mimeType.toLowerCase().includes('pdf');

const DocumentPreview: React.FC<{ documentType: string; document: GeneratedDocument; objectUrl: string }> = ({
  documentType,
  document,
  objectUrl,
}) => {
  const { t } = useTranslation();

  if (isPreviewablePdf(document.mimeType)) {
    return <iframe title={`${documentType}-preview`} src={objectUrl} className={styles.previewFrame} />;
  }

  if (isPreviewableImage(document.mimeType)) {
    return <img alt={`${documentType} preview`} src={objectUrl} className={styles.previewImage} />;
  }

  return (
    <div className={styles.previewFallback}>
      <span className={styles.fileName}>{document.filename}</span>
      <a href={objectUrl} target="_blank" rel="noopener noreferrer" className={styles.viewLink}>
        {t('openInNewTab', 'Open in new tab')} ↗
      </a>
    </div>
  );
};

const DocumentCardActions: React.FC<{ row: DocumentRow; actions: ClaimDocumentActions }> = ({ row, actions }) => {
  const { t } = useTranslation();
  const { documentType } = row;

  if (row.isBusy) {
    return (
      <>
        <InlineLoading
          description={
            row.status === 'generating' ? t('generating', 'Generating…') : t('uploadingProgress', 'Uploading')
          }
        />
        <Button kind="ghost" size="sm" onClick={() => actions.cancel(documentType)}>
          {t('cancel', 'Cancel')}
        </Button>
      </>
    );
  }

  if (row.status === 'ready' && row.document) {
    return (
      <>
        <Button kind="primary" size="sm" renderIcon={Upload} onClick={() => actions.upload(documentType)}>
          {t('upload', 'Upload')}
        </Button>
        <Button kind="tertiary" size="sm" renderIcon={View} onClick={() => actions.preview(documentType)}>
          {t('preview', 'Preview')}
        </Button>
        <Button kind="ghost" size="sm" renderIcon={Renew} onClick={() => actions.generate(documentType)}>
          {t('regenerate', 'Regenerate')}
        </Button>
        <Button
          kind="danger--ghost"
          size="sm"
          renderIcon={TrashCan}
          hasIconOnly
          iconDescription={t('discard', 'Discard')}
          onClick={() => actions.discard(documentType)}
        />
      </>
    );
  }

  return (
    <Button
      kind="tertiary"
      size="sm"
      renderIcon={DocumentPdf}
      disabled={!row.canGenerate}
      onClick={() => actions.generate(documentType)}>
      {row.status === 'failed' ? t('retry', 'Retry') : t('generate', 'Generate')}
    </Button>
  );
};

const DocumentCard: React.FC<{ row: DocumentRow; actions: ClaimDocumentActions }> = ({ row, actions }) => {
  const { t } = useTranslation();

  return (
    <Layer>
      <div
        className={classNames(styles.card, {
          [styles.cardUploaded]: row.isLocked,
          [styles.cardFailed]: row.status === 'failed',
        })}>
        <div className={styles.cardHeader}>
          <div className={styles.titleGroup}>
            <DocumentPdf size={20} className={styles.docIcon} />
            <span className={styles.cardTitle}>{row.label}</span>
          </div>
          {row.isLocked && (
            <Tag type="green" renderIcon={CheckmarkFilled} size="md">
              {t('uploaded', 'Uploaded')}
            </Tag>
          )}
        </div>

        {!row.hasEndpoint && (
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title={t('noEndpointConfigured', 'No endpoint configured')}
            subtitle={t('noEndpointConfiguredDesc', 'No EMR endpoint is configured for this document type.')}
            className={styles.rowNotification}
          />
        )}

        {row.hasEndpoint && row.missingParams.length > 0 && row.status === 'idle' && (
          <InlineNotification
            kind="warning"
            lowContrast
            hideCloseButton
            title={t('missingParams', 'Missing context')}
            subtitle={t('missingParamsDesc', 'Cannot resolve: {{params}}', {
              params: row.missingParams.map((param) => `{${param}}`).join(', '),
            })}
            className={styles.rowNotification}
          />
        )}

        {row.status === 'failed' && row.error && (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            title={t('actionFailed', 'Something went wrong')}
            subtitle={row.error}
            className={styles.rowNotification}
          />
        )}

        {row.status === 'ready' && row.document && row.objectUrl && (
          <div className={styles.preview}>
            <DocumentPreview documentType={row.documentType} document={row.document} objectUrl={row.objectUrl} />
          </div>
        )}

        {row.status === 'uploading' && (
          <ProgressBar
            size="small"
            label={t('uploadingProgress', 'Uploading')}
            helperText={`${row.progress}%`}
            value={row.progress}
            max={100}
            className={styles.progress}
          />
        )}

        {row.isLocked && row.uploadedUrl && (
          <a href={row.uploadedUrl} target="_blank" rel="noopener noreferrer" className={styles.viewLink}>
            {t('viewOnClaim', 'View on claim')} ↗
          </a>
        )}

        {!row.isLocked && (
          <div className={styles.actions}>
            <DocumentCardActions row={row} actions={actions} />
          </div>
        )}
      </div>
    </Layer>
  );
};

const ClaimDocumentGenerator: React.FC<ClaimDocumentGeneratorProps> = (props) => {
  const { t } = useTranslation();
  const { isLoading, error, rows, actions } = useClaimDocumentGenerator(props);

  if (isLoading) {
    return <SkeletonText paragraph lineCount={3} className={styles.skeleton} />;
  }

  if (error) {
    return (
      <InlineNotification
        kind="error"
        lowContrast
        hideCloseButton
        title={t('documentEndpointsError', 'Could not load document endpoints')}
        subtitle={error.message}
      />
    );
  }

  return (
    <div className={styles.container}>
      {rows.map((row) => (
        <DocumentCard key={row.documentType} row={row} actions={actions} />
      ))}
    </div>
  );
};

export default ClaimDocumentGenerator;
