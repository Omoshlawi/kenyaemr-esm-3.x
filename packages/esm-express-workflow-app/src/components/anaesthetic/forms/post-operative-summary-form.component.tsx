import React from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, useForm } from 'react-hook-form';
import { Column, Grid, Modal, NumberInput, TextArea, TextInput } from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';
import styles from '../anaesthetic-data-form.scss';

export type PostOperativeSummaryFormData = {
  position: string;
  estimatedBloodLoss: number | string;
  resultsOfOperation: string;
  postOperativeManagement: string;
};

type PostOperativeSummaryFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PostOperativeSummaryFormData) => Promise<void> | void;
  isSaving?: boolean;
};

const PostOperativeSummaryForm: React.FC<PostOperativeSummaryFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSaving = false,
}) => {
  const { t } = useTranslation();
  const { control, handleSubmit, reset } = useForm<PostOperativeSummaryFormData>({
    defaultValues: {
      position: '',
      estimatedBloodLoss: '',
      resultsOfOperation: '',
      postOperativeManagement: '',
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFormSubmit = async (data: PostOperativeSummaryFormData) => {
    try {
      await onSubmit(data);

      showSnackbar({
        title: t('postOperativeSummarySaved', 'Post Operative Summary saved'),
        subtitle: t('postOperativeSummarySavedToBackend', 'Post Operative Summary has been saved to backend'),
        kind: 'success',
        isLowContrast: true,
      });

      reset();
      onClose();
    } catch (error) {
      showSnackbar({
        title: t('postOperativeSummarySaveFailed', 'Failed to save Post Operative Summary'),
        subtitle:
          error instanceof Error
            ? error.message
            : t('failedToSavePostOperativeSummary', 'Failed to save post operative summary data'),
        kind: 'error',
        isLowContrast: true,
      });
    }
  };

  return (
    <Modal
      open={isOpen}
      onRequestClose={handleClose}
      modalHeading={t('postOperativeSummary', 'Post Operative Summary')}
      primaryButtonText={isSaving ? t('saving', 'Saving...') : t('save', 'Save')}
      primaryButtonDisabled={isSaving}
      secondaryButtonText={t('cancel', 'Cancel')}
      onRequestSubmit={handleSubmit(handleFormSubmit)}
      onSecondarySubmit={handleClose}
      size="md">
      <div className={styles.modalContent}>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <Controller
              name="position"
              control={control}
              rules={{ required: t('positionRequired', 'Position is required') }}
              render={({ field, fieldState }) => (
                <TextInput
                  id="post-operative-position"
                  labelText={t('position', 'Position')}
                  placeholder={t('enterPosition', 'Enter position')}
                  value={field.value}
                  onChange={field.onChange}
                  invalid={!!fieldState.error}
                  invalidText={fieldState.error?.message}
                />
              )}
            />
          </Column>

          <Column sm={4} md={8} lg={16}>
            <Controller
              name="estimatedBloodLoss"
              control={control}
              rules={{
                required: t('estimatedBloodLossRequired', 'Estimated blood loss is required'),
                validate: (value) =>
                  value === '' || Number(value) < 0
                    ? t('estimatedBloodLossInvalid', 'Estimated blood loss must be 0 or greater')
                    : true,
              }}
              render={({ field, fieldState }) => (
                <NumberInput
                  id="estimated-blood-loss"
                  label={t('estimatedBloodLoss', 'Estimated Blood Loss (ML)')}
                  min={0}
                  value={field.value === '' ? '' : Number(field.value)}
                  onChange={(event, { value }) => field.onChange(value === '' ? '' : Number(value))}
                  invalid={!!fieldState.error}
                  invalidText={fieldState.error?.message}
                />
              )}
            />
          </Column>

          <Column sm={4} md={8} lg={16}>
            <Controller
              name="resultsOfOperation"
              control={control}
              rules={{ required: t('resultsOfOperationRequired', 'Results of operation are required') }}
              render={({ field, fieldState }) => (
                <TextArea
                  id="results-of-operation"
                  labelText={t('resultsOfOperation', 'Results of Operation')}
                  placeholder={t('enterResultsOfOperation', 'Enter results of operation')}
                  rows={4}
                  value={field.value}
                  onChange={field.onChange}
                  invalid={!!fieldState.error}
                  invalidText={fieldState.error?.message}
                />
              )}
            />
          </Column>

          <Column sm={4} md={8} lg={16}>
            <Controller
              name="postOperativeManagement"
              control={control}
              rules={{ required: t('postOperativeManagementRequired', 'Post-operative management is required') }}
              render={({ field, fieldState }) => (
                <TextArea
                  id="post-operative-management"
                  labelText={t('postOperativeManagement', 'Post-Operative management')}
                  placeholder={t('enterPostOperativeManagement', 'Enter post-operative management')}
                  rows={4}
                  value={field.value}
                  onChange={field.onChange}
                  invalid={!!fieldState.error}
                  invalidText={fieldState.error?.message}
                />
              )}
            />
          </Column>
        </Grid>
      </div>
    </Modal>
  );
};

export default PostOperativeSummaryForm;
