import React, { useEffect, useState } from 'react';
import {
  ResponsiveWrapper,
  Workspace2,
  showSnackbar,
  useLayoutType,
  type Workspace2DefinitionProps,
} from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { Controller, useForm } from 'react-hook-form';
import { Button, ButtonSet, ComboBox, Form, FormGroup, InlineLoading, Stack, TextArea, TextInput } from '@carbon/react';
import { zodResolver } from '@hookform/resolvers/zod';
import classNames from 'classnames';

import styles from './global-property.workspace.scss';
import { type SystemSettings } from '../../../types';
import { saveOrUpdateGlobalProperty } from '../hooks/useGlobalProperty';
import {
  createGlobalPropertyFormSchema,
  openmrsCustomDatatypes,
  type GlobalPropertyFormType,
} from './global-property-form-schema';

type GlobalPropertyWorkspaceProps = {
  systemSetting?: SystemSettings | null;
  mutateGlobalProperty: () => void;
};

const GlobalPropertyWorkspace: React.FC<Workspace2DefinitionProps<GlobalPropertyWorkspaceProps, {}, {}>> = ({
  closeWorkspace,
  workspaceProps: { systemSetting, mutateGlobalProperty },
}) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const isEditMode = Boolean(systemSetting?.uuid);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const {
    handleSubmit,
    control,
    formState: { isSubmitting, isDirty, errors },
  } = useForm<GlobalPropertyFormType>({
    resolver: zodResolver(createGlobalPropertyFormSchema(t)),
    defaultValues: {
      property: systemSetting?.property ?? '',
      description: systemSetting?.description ?? '',
      datatypeClassname: systemSetting?.datatypeClassname ?? '',
      datatypeConfig: systemSetting?.datatypeConfig ?? '',
      preferredHandlerClassname: systemSetting?.preferredHandlerClassname ?? '',
      handlerConfig: systemSetting?.handlerConfig ?? '',
      value: systemSetting?.value ?? '',
    },
  });

  useEffect(() => {
    setHasUnsavedChanges(isDirty);
  }, [isDirty]);

  const onSubmit = async (data: GlobalPropertyFormType) => {
    const payload = {
      property: data.property,
      value: data.value,
      description: data.description,
      datatypeClassname: data.datatypeClassname,
      datatypeConfig: data.datatypeConfig,
      preferredHandlerClassname: data.preferredHandlerClassname,
      handlerConfig: data.handlerConfig,
    };
    try {
      await saveOrUpdateGlobalProperty(payload, systemSetting?.uuid);

      showSnackbar({
        title: t('success', 'Success'),
        kind: 'success',
        subtitle: isEditMode
          ? t('gpUpdated', 'Global property {{property}} was updated successfully.', { property: data.property })
          : t('gpCreated', 'Global property {{property}} was created successfully.', { property: data.property }),
      });
      mutateGlobalProperty();
      closeWorkspace({ discardUnsavedChanges: true });
    } catch (error: any) {
      showSnackbar({
        title: t('error', 'Error'),
        kind: 'error',
        subtitle: error?.message ?? t('gpSaveError', 'Error saving global property'),
      });
    }
  };

  const title = isEditMode
    ? t('editGlobalProperty', 'Edit global property')
    : t('addGlobalProperty', 'Add global property');

  return (
    <Workspace2 title={title} hasUnsavedChanges={hasUnsavedChanges}>
      <Form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.formContainer}>
          <Stack gap={4}>
            <ResponsiveWrapper>
              <FormGroup legendText="">
                <Controller
                  control={control}
                  name="property"
                  render={({ field }) => (
                    <TextInput
                      id="gpProperty"
                      labelText={t('property', 'Property (required)')}
                      placeholder={t('gpPropertyPlaceholder', 'e.g. setting.name')}
                      value={field.value}
                      onChange={field.onChange}
                      invalid={!!errors.property}
                      invalidText={errors.property?.message}
                      disabled={isEditMode}
                    />
                  )}
                />
              </FormGroup>
            </ResponsiveWrapper>

            <ResponsiveWrapper>
              <FormGroup legendText="">
                <Controller
                  control={control}
                  name="value"
                  render={({ field }) => (
                    <TextArea
                      id="gpValue"
                      labelText={t('value', 'Value (required)')}
                      placeholder={t('gpValuePlaceholder', 'Enter value')}
                      value={field.value}
                      onChange={field.onChange}
                      invalid={!!errors.value}
                      invalidText={errors.value?.message}
                      rows={3}
                    />
                  )}
                />
              </FormGroup>
            </ResponsiveWrapper>

            <ResponsiveWrapper>
              <FormGroup legendText="">
                <Controller
                  control={control}
                  name="description"
                  render={({ field }) => (
                    <TextArea
                      id="gpDescription"
                      labelText={t('description', 'Description')}
                      placeholder={t('gpDescriptionPlaceholder', 'Optional description')}
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      rows={2}
                    />
                  )}
                />
              </FormGroup>
            </ResponsiveWrapper>

            <ResponsiveWrapper>
              <FormGroup legendText="">
                <Controller
                  control={control}
                  name="datatypeClassname"
                  render={({ field }) => (
                    <ComboBox
                      id="datatypeClassname"
                      invalidText={errors.datatypeClassname?.message}
                      items={openmrsCustomDatatypes}
                      onChange={function Zye() {}}
                      titleText={t('datatypeClassname', 'Datatype classname')}
                      typeahead
                      placeholder={t('selectDatatypeClassname', 'Select datatype classname')}
                    />
                  )}
                />
              </FormGroup>
            </ResponsiveWrapper>

            <ResponsiveWrapper>
              <FormGroup legendText="">
                <Controller
                  control={control}
                  name="datatypeConfig"
                  render={({ field }) => (
                    <TextInput
                      id="gpDatatypeConfig"
                      labelText={t('datatypeConfig', 'Datatype config')}
                      placeholder={t('gpDatatypeConfigPlaceholder', 'Optional datatype configuration')}
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  )}
                />
              </FormGroup>
            </ResponsiveWrapper>

            <ResponsiveWrapper>
              <FormGroup legendText="">
                <Controller
                  control={control}
                  name="preferredHandlerClassname"
                  render={({ field }) => (
                    <TextInput
                      id="gpPreferredHandlerClassname"
                      labelText={t('preferredHandlerClassname', 'Preferred handler classname')}
                      placeholder={t('gpPreferredHandlerPlaceholder', 'Optional preferred handler classname')}
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  )}
                />
              </FormGroup>
            </ResponsiveWrapper>

            <ResponsiveWrapper>
              <FormGroup legendText="">
                <Controller
                  control={control}
                  name="handlerConfig"
                  render={({ field }) => (
                    <TextInput
                      id="gpHandlerConfig"
                      labelText={t('handlerConfig', 'Handler config')}
                      placeholder={t('gpHandlerConfigPlaceholder', 'Optional handler configuration')}
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  )}
                />
              </FormGroup>
            </ResponsiveWrapper>
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
          <Button className={styles.buttonContainer} disabled={isSubmitting || !isDirty} kind="primary" type="submit">
            {isSubmitting ? (
              <span className={styles.inlineLoading}>
                {t('submitting', 'Submitting...')}
                <InlineLoading status="active" iconDescription="Loading" />
              </span>
            ) : (
              t('saveAndClose', 'Save & close')
            )}
          </Button>
        </ButtonSet>
      </Form>
    </Workspace2>
  );
};

export default GlobalPropertyWorkspace;
