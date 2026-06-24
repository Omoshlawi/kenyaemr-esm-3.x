import React, { useEffect, useState } from 'react';
import { showSnackbar, useLayoutType, Workspace2, type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import {
  Button,
  ButtonSet,
  FileUploader,
  Form,
  FormGroup,
  InlineLoading,
  InlineNotification,
  RadioButton,
  RadioButtonGroup,
  Stack,
} from '@carbon/react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';

import styles from './upload-logo.workspace.scss';
import { ALLOWED_LOGO_TYPES, MAX_LOGO_SIZE_BYTES, type LogoTarget, uploadLogo } from '../hooks/useLogoUpload';

type UploadLogoWorkspaceProps = {
  mutateGlobalProperty?: () => void;
};

const UploadLogoWorkspace: React.FC<Workspace2DefinitionProps<UploadLogoWorkspaceProps, {}, {}>> = ({
  closeWorkspace,
  workspaceProps,
}) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const mutateGlobalProperty = workspaceProps?.mutateGlobalProperty;

  const [target, setTarget] = useState<LogoTarget>('prescription');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFileChange = (selected: File | null) => {
    setValidationError(null);
    if (!selected) {
      setFile(null);
      return;
    }
    if (!ALLOWED_LOGO_TYPES.includes(selected.type)) {
      setValidationError(t('unsupportedImageType', 'Unsupported file type. Accepted: JPEG, PNG, GIF, BMP or WebP.'));
      setFile(null);
      return;
    }
    if (selected.size > MAX_LOGO_SIZE_BYTES) {
      setValidationError(t('imageTooLarge', 'File exceeds the 2 MB maximum size.'));
      setFile(null);
      return;
    }
    setFile(selected);
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setValidationError(t('selectImageFirst', 'Please select an image to upload.'));
      return;
    }
    setIsSubmitting(true);
    try {
      const { savedPath } = await uploadLogo(file, target);
      const fileName = savedPath?.split(/[\\/]/).pop() ?? file.name;
      showSnackbar({
        title: t('success', 'Success'),
        kind: 'success',
        subtitle: t('logoUploaded', 'Image "{{fileName}}" uploaded successfully', { fileName }),
        timeoutInMs: 5000,
      });
      mutateGlobalProperty?.();
      closeWorkspace({ discardUnsavedChanges: true });
    } catch (error: any) {
      showSnackbar({
        title: t('error', 'Error'),
        kind: 'error',
        subtitle: error?.message ?? t('logoUploadError', 'Error uploading image'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Workspace2 title={t('uploadImage', 'Upload image')} hasUnsavedChanges={Boolean(file)}>
      <Form onSubmit={onSubmit} className={styles.form}>
        <div className={styles.formContainer}>
          <Stack gap={5}>
            <InlineNotification
              kind="info"
              lowContrast
              hideCloseButton
              title={t('logoUploadTitle', 'Printed documents logo')}
              subtitle={t(
                'logoUploadDesc',
                'Upload a logo used in printed documents. JPEG, PNG, GIF, BMP or WebP, up to 2 MB.',
              )}
            />

            <FormGroup legendText={t('logoTarget', 'Logo destination')}>
              <RadioButtonGroup
                name="logo-target"
                legendText=""
                valueSelected={target}
                onChange={(value: string) => setTarget(value as LogoTarget)}
                disabled={isSubmitting}>
                <RadioButton
                  labelText={t('prescriptionLogo', 'Prescription logo')}
                  value="prescription"
                  id="logo-target-prescription"
                />
                <RadioButton labelText={t('receiptLogo', 'Receipt logo')} value="receipt" id="logo-target-receipt" />
              </RadioButtonGroup>
            </FormGroup>

            <FormGroup legendText={t('image', 'Image')}>
              <FileUploader
                labelTitle=""
                labelDescription={t('logoUploaderHint', 'Max file size is 2 MB. Supported: JPEG, PNG, GIF, BMP, WebP.')}
                buttonLabel={t('addFile', 'Add file')}
                buttonKind="tertiary"
                size="md"
                filenameStatus="edit"
                accept={ALLOWED_LOGO_TYPES}
                multiple={false}
                disabled={isSubmitting}
                onChange={(e: { target: HTMLInputElement; addedFiles?: File[] }) => {
                  const selected = e.addedFiles?.[0] ?? e.target?.files?.[0] ?? null;
                  handleFileChange(selected);
                }}
                onDelete={() => handleFileChange(null)}
              />
            </FormGroup>

            {validationError && (
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                title={t('invalidImage', 'Invalid image')}
                subtitle={validationError}
              />
            )}

            {previewUrl && (
              <div className={styles.previewContainer}>
                <span className={styles.previewLabel}>{t('preview', 'Preview')}</span>
                <img src={previewUrl} alt={t('imagePreview', 'Image preview')} className={styles.preview} />
              </div>
            )}
          </Stack>
        </div>

        <ButtonSet
          className={classNames({
            [styles.tablet]: isTablet,
            [styles.desktop]: !isTablet,
          })}>
          <Button className={styles.buttonContainer} kind="secondary" onClick={() => closeWorkspace()}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button className={styles.buttonContainer} disabled={!file || isSubmitting} kind="primary" type="submit">
            {isSubmitting ? (
              <span className={styles.inlineLoading}>
                {t('uploading', 'Uploading...')}
                <InlineLoading status="active" iconDescription="Loading" />
              </span>
            ) : (
              t('upload', 'Upload')
            )}
          </Button>
        </ButtonSet>
      </Form>
    </Workspace2>
  );
};

export default UploadLogoWorkspace;
