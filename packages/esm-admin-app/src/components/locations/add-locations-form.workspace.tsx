import { Button, ButtonSet, FilterableMultiSelect, Form, Stack, TextArea, TextInput } from '@carbon/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { DefaultWorkspaceProps, getCoreTranslation, showSnackbar } from '@openmrs/esm-framework';
import React from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { saveLocation, useLocationTags } from './locations-table.resource';
import { extractErrorMessagesFromResponse, handleMutate } from './stock-locations.resource';
import { type LocationData } from './types';
import styles from './location-form.scss';

const LocationAdministrationSchema = z.object({
  name: z.string().max(255).nonempty(),
  description: z.string().optional(),
  tags: z.string().array(),
});
interface LocationFormProps extends DefaultWorkspaceProps {}
type LocationFormData = z.infer<typeof LocationAdministrationSchema>;
const LocationAddForm: React.FC<LocationFormProps> = ({ closeWorkspace }) => {
  const { t } = useTranslation();
  const headerTitle = t('addLocation', 'Create new Location');
  // Location tag types
  const { locationTagList } = useLocationTags();

  const { handleSubmit, control, formState } = useForm<LocationFormData>({
    mode: 'all',
    resolver: zodResolver(LocationAdministrationSchema),
    defaultValues: {
      name: '',
      tags: [],
    },
  });

  const onSubmit: SubmitHandler<LocationFormData> = async (formData) => {
    try {
      await saveLocation({ locationPayload: formData });
      handleMutate('/Location?_summary=data');
      closeWorkspace();
      showSnackbar({
        title: t('success', 'Success'),
        kind: 'success',
        isLowContrast: true,
        subtitle: t('locationCreatedSuccessfully', 'Location {{locationName}} was created successfully.', {
          locationName: formData.name,
        }),
      });
    } catch (error) {
      const errorMessages = extractErrorMessagesFromResponse(error);
      showSnackbar({
        title: t('errorCreatingForm', 'Error creating location'),
        kind: 'error',
        isLowContrast: true,
        subtitle: errorMessages.join(', '),
      });
    }
  };

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <Stack gap={4} className={styles.grid}>
        <Controller
          name="name"
          control={control}
          rules={{ required: true }}
          render={({ field, fieldState }) => (
            <>
              <TextInput
                {...field}
                id="location"
                labelText={t('locationName', 'Location Name')}
                placeholder={t('locationPlaceholder', 'Enter location name')}
                invalidText={fieldState.error?.message}
                invalid={Boolean(fieldState.error?.message)}
              />
            </>
          )}
        />
        <Controller
          name="tags"
          control={control}
          render={({ field, fieldState }) => (
            <FilterableMultiSelect
              id="tag"
              titleText={t('selectTags', 'Select tag(s)')}
              items={locationTagList?.map((tag) => tag.uuid) ?? []}
              selectedItems={field.value ?? []}
              onChange={({ selectedItems }) => field.onChange(selectedItems)}
              itemToString={(item) => locationTagList?.find((t) => t.uuid === item)?.display ?? ''}
              selectionFeedback="top-after-reopen"
              placeholder={t('searchTags', 'Search tags...')}
              invalidText={fieldState.error?.message}
              invalid={Boolean(fieldState.error?.message)}
            />
          )}
        />
        <Controller
          name="description"
          control={control}
          rules={{ required: true }}
          render={({ field, fieldState }) => (
            <>
              <TextArea
                id="location"
                labelText={t('description', 'Description')}
                placeholder={t('descriptionPlaceholder', 'Enter description') + '...'}
                invalidText={fieldState.error?.message}
                {...field}
                invalid={Boolean(fieldState.error?.message)}
              />
            </>
          )}
        />
      </Stack>
      <ButtonSet className={styles.buttonSet}>
        <Button className={styles.button} kind="secondary" onClick={() => closeWorkspace()}>
          {t('discard', 'Discard')}
        </Button>
        <Button className={styles.button} kind="primary" type="submit" disabled={formState.isSubmitting}>
          {t('submit', 'Submit')}
        </Button>
      </ButtonSet>
    </Form>
  );
};
export default LocationAddForm;
