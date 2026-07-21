import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, InlineNotification, Layer, SkeletonText, Tag } from '@carbon/react';
import { CheckmarkFilled, DocumentPdf, Renew, TrashCan, Upload, View } from '@carbon/react/icons';
import classNames from 'classnames';
import { type PreauthQueueItem } from '../../../../../../billing-form/social-health-authority/type';
import { usePreauthDocumentGeneration, type PreauthGenRow } from '../hooks/use-preauth-document-generation';
import styles from '../pre-auth-form.scss';

const ACCEPTED_FILE_TYPES = '.pdf,.png,.jpg,.jpeg';

interface GenerateDocumentsPanelProps {
  item?: PreauthQueueItem;
  documentTypes: ReadonlyArray<string>;
  isStaged: (documentType: string) => boolean;
  onStaged: (documentType: string, file: File) => void;
  onUnstaged: (documentType: string) => void;
}

const GenerateDocumentCard: React.FC<{
  row: PreauthGenRow;
  onGenerate: (documentType: string) => void;
  onPreview: (documentType: string) => void;
  onDiscard: (documentType: string) => void;
  onManualSelect: (documentType: string, file: File) => void;
}> = ({ row, onGenerate, onPreview, onDiscard, onManualSelect }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isGenerating = row.status === 'generating';

  let generateLabel = t('generate', 'Generate');
  if (row.isStaged) {
    generateLabel = t('regenerate', 'Regenerate');
  } else if (row.status === 'failed') {
    generateLabel = t('retry', 'Retry');
  }

  const pickFile = () => fileInputRef.current?.click();
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onManualSelect(row.documentType, file);
    }
    event.target.value = '';
  };

  return (
    <Layer>
      <div className={classNames(styles.genCard, { [styles.genCardStaged]: row.isStaged })}>
        <div className={styles.cardHeader}>
          <div className={styles.genCardTitle}>
            <DocumentPdf size={20} />
            <span className={styles.cardTitle}>{row.label}</span>
          </div>
          {row.isStaged && (
            <Tag type="green" renderIcon={CheckmarkFilled} size="sm">
              {t('readyForSubmission', 'Ready for submission')}
            </Tag>
          )}
        </div>

        {!row.hasEndpoint && !row.isStaged && (
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title={t('noEndpointConfigured', 'Automatic generation unavailable')}
            subtitle={t(
              'noEndpointConfiguredDesc',
              'This document cannot be generated automatically. Upload the file manually to attach it.',
            )}
          />
        )}

        {row.hasEndpoint && row.missingParams.length > 0 && (
          <InlineNotification
            kind="warning"
            lowContrast
            hideCloseButton
            title={t('missingContext', 'Missing context')}
            subtitle={t('missingContextDesc', 'Cannot resolve: {{params}}', {
              params: row.missingParams.map((param) => `{${param}}`).join(', '),
            })}
          />
        )}

        {row.status === 'failed' && row.error && (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            title={t('generateFailed', 'Generation failed')}
            subtitle={row.error}
          />
        )}

        <div className={styles.genActions}>
          {isGenerating ? (
            <InlineLoading description={t('generating', 'Generating…')} />
          ) : (
            <>
              {row.hasEndpoint && (
                <Button
                  kind="tertiary"
                  size="sm"
                  renderIcon={row.isStaged ? Renew : DocumentPdf}
                  disabled={!row.canGenerate}
                  onClick={() => onGenerate(row.documentType)}>
                  {generateLabel}
                </Button>
              )}
              {row.isStaged && (
                <Button kind="ghost" size="sm" renderIcon={View} onClick={() => onPreview(row.documentType)}>
                  {t('previewDocuments', 'Preview documents')}
                </Button>
              )}
              <Button
                kind={!row.hasEndpoint && !row.isStaged ? 'primary' : 'ghost'}
                size="sm"
                renderIcon={Upload}
                onClick={pickFile}>
                {row.isStaged ? t('replaceFile', 'Replace file') : t('uploadManually', 'Upload manually')}
              </Button>
              {row.isStaged && (
                <Button
                  kind="danger--ghost"
                  size="sm"
                  renderIcon={TrashCan}
                  hasIconOnly
                  iconDescription={t('remove', 'Remove')}
                  onClick={() => onDiscard(row.documentType)}
                />
              )}
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES}
          className={styles.hiddenInput}
          onChange={handleFileChange}
        />
      </div>
    </Layer>
  );
};

const GenerateDocumentsPanel: React.FC<GenerateDocumentsPanelProps> = ({
  item,
  documentTypes,
  isStaged,
  onStaged,
  onUnstaged,
}) => {
  const { t } = useTranslation();
  const { isLoading, error, rows, generate, discard, preview, manualSelect } = usePreauthDocumentGeneration({
    item,
    documentTypes,
    isStaged,
    onStaged,
    onUnstaged,
  });

  if (isLoading) {
    return <SkeletonText paragraph lineCount={2} />;
  }

  // No configured endpoints for any applicable type — nothing to generate, keep the UI clean.
  if (error || rows.length === 0) {
    return null;
  }

  return (
    <div className={styles.generateSection}>
      <p className={styles.generateHeading}>{t('generateDocuments', 'Generate documents')}</p>
      <p className={styles.generateHint}>
        {t(
          'generateDocumentsHint',
          'Generate supporting documents from the EMR. They are attached to this preauth and submitted together with the form.',
        )}
      </p>
      {rows.map((row) => (
        <GenerateDocumentCard
          key={row.documentType}
          row={row}
          onGenerate={generate}
          onPreview={preview}
          onDiscard={discard}
          onManualSelect={manualSelect}
        />
      ))}
    </div>
  );
};

export default GenerateDocumentsPanel;
