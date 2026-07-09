import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { showSnackbar, useLayoutType, Workspace2, type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import {
  Button,
  ButtonSet,
  Form,
  FormGroup,
  InlineLoading,
  InlineNotification,
  Layer,
  Select,
  SelectItem,
  Tag,
} from '@carbon/react';
import { CheckmarkFilled, TrashCan } from '@carbon/react/icons';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';

import styles from './claim-doctors.scss';
import { type ClaimDoctorsFormData, claimDoctorsSchema } from './claim-doctors-schema';
import { addDoctorToClaim, useIdentificationTypes } from './claim-doctors-resource';
import { ProviderResult } from '../../../claims-management/table/virtual-claim-preauth/type';
import ProviderSearch from '../../../claims-management/table/virtual-claim-preauth/pre-auth-workspace/provider-search-component/provider-search-component';

type ClaimDoctorsWorkspaceProps = {
  consentToken: string;
  claimAuthorizationCode: string;
  mutate: () => void;
};

type RowStatus = 'pending' | 'uploading' | 'succeeded' | 'failed';

type RowResult = {
  status: RowStatus;
  error?: string;
  doctorName?: string;
  mirrorUuid?: string;
};

const RequiredLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span>
    {children}
    <span className={styles.required} aria-hidden="true">
      *
    </span>
  </span>
);

// Only registration_number and National ID map to a value we already hold on the
// provider record — Alien ID / Refugee ID have no matching provider attribute, so
// they fall back to manual entry.
const getIdentifierValue = (type: string, provider: Pick<ProviderResult, 'licenseNumber' | 'nationalId'>): string => {
  if (type === 'National ID') {
    return provider.nationalId ?? '';
  }
  if (type === 'registration_number') {
    return provider.licenseNumber ?? '';
  }
  return '';
};

const ClaimDoctorsWorkspace: React.FC<Workspace2DefinitionProps<ClaimDoctorsWorkspaceProps, {}, {}>> = ({
  workspaceProps,
  closeWorkspace,
}) => {
  const consentToken = workspaceProps?.consentToken ?? '';
  const claimAuthorizationCode = workspaceProps?.claimAuthorizationCode ?? '';
  const mutate = workspaceProps?.mutate ?? (() => undefined);
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const { types: identificationTypes, isLoading: isLoadingTypes } = useIdentificationTypes();

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isDirty },
  } = useForm<ClaimDoctorsFormData>({
    resolver: zodResolver(claimDoctorsSchema),
    defaultValues: {
      doctors: [
        {
          provider_display: '',
          identification_number: '',
          identification_type: '',
          regulation_body: '',
        },
      ],
    },
  });

  const {
    fields: doctorFields,
    append: appendDoctor,
    remove: removeDoctor,
  } = useFieldArray({ control, name: 'doctors' });

  useEffect(() => {
    if (!identificationTypes.length) {
      return;
    }
    const current = getValues('doctors.0.identification_type');
    if (!current) {
      setValue('doctors.0.identification_type', identificationTypes[0].code);
    }
  }, [identificationTypes, getValues, setValue]);

  const [rowResults, setRowResults] = useState<Map<string, RowResult>>(new Map());
  const [selectedProviders, setSelectedProviders] = useState<Map<string, ProviderResult>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pendingRowsCount = useMemo(() => {
    return doctorFields.filter((f) => {
      const status = rowResults.get(f.id)?.status;
      return !status || status === 'pending' || status === 'failed';
    }).length;
  }, [doctorFields, rowResults]);

  const succeededCount = useMemo(() => {
    return doctorFields.filter((f) => rowResults.get(f.id)?.status === 'succeeded').length;
  }, [doctorFields, rowResults]);

  const failedCount = useMemo(() => {
    return doctorFields.filter((f) => rowResults.get(f.id)?.status === 'failed').length;
  }, [doctorFields, rowResults]);

  const allDone = pendingRowsCount === 0 && doctorFields.length > 0;
  const hasAnySucceeded = succeededCount > 0;
  const hasAnyFailed = failedCount > 0;

  const submitButtonLabel = allDone
    ? t('close', 'Close')
    : hasAnySucceeded || hasAnyFailed
    ? t('retryFailedCount', 'Retry {{count}} failed', { count: pendingRowsCount })
    : doctorFields.length === 1
    ? t('addDoctor', 'Add doctor')
    : t('addNDoctors', 'Add {{count}} doctors', { count: pendingRowsCount });

  const handleRemoveRow = useCallback(
    (idx: number) => {
      const fieldId = doctorFields[idx]?.id;
      if (fieldId) {
        setRowResults((prev) => {
          const next = new Map(prev);
          next.delete(fieldId);
          return next;
        });
        setSelectedProviders((prev) => {
          const next = new Map(prev);
          next.delete(fieldId);
          return next;
        });
      }
      removeDoctor(idx);
    },
    [doctorFields, removeDoctor],
  );

  const handleAddRow = useCallback(() => {
    appendDoctor({
      provider_display: '',
      identification_number: '',
      identification_type: identificationTypes[0]?.code ?? '',
      regulation_body: '',
    });
  }, [appendDoctor, identificationTypes]);

  const handleProviderSelect = useCallback(
    (idx: number, provider: ProviderResult) => {
      const fieldId = doctorFields[idx]?.id;
      if (fieldId) {
        setSelectedProviders((prev) => {
          const next = new Map(prev);
          next.set(fieldId, provider);
          return next;
        });
      }

      // Nursing Council doesn't issue a registration number SHA will accept here —
      // nurses must be identified by National ID instead. Every other regulator
      // (Clinical Officers Council, KMPDC, Pharmacy and Poisons Board, ...) keeps
      // the registration number default.
      const isNurse = (provider.licenseBody ?? '').toLowerCase().includes('nursing council');
      const defaultType = isNurse ? 'National ID' : 'registration_number';

      setValue(`doctors.${idx}.provider_display`, provider.person?.display ?? '', {
        shouldDirty: true,
      });
      setValue(`doctors.${idx}.identification_type`, defaultType, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue(`doctors.${idx}.identification_number`, getIdentifierValue(defaultType, provider), {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue(`doctors.${idx}.regulation_body`, provider.licenseBody ?? '', {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [setValue, doctorFields],
  );

  const handleIdentificationTypeChange = useCallback(
    (idx: number, newType: string) => {
      setValue(`doctors.${idx}.identification_type`, newType, { shouldDirty: true, shouldValidate: true });

      const fieldId = doctorFields[idx]?.id;
      const provider = fieldId ? selectedProviders.get(fieldId) : undefined;
      if (provider) {
        setValue(`doctors.${idx}.identification_number`, getIdentifierValue(newType, provider), {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    },
    [setValue, doctorFields, selectedProviders],
  );

  const onSubmit = async (data: ClaimDoctorsFormData) => {
    if (allDone) {
      closeWorkspace({ discardUnsavedChanges: true });
      return;
    }

    const rowsToSubmit = data.doctors
      .map((row, idx) => ({ row, idx, fieldId: doctorFields[idx].id }))
      .filter(({ fieldId }) => {
        const status = rowResults.get(fieldId)?.status;
        return !status || status === 'pending' || status === 'failed';
      });

    if (rowsToSubmit.length === 0) {
      closeWorkspace({ discardUnsavedChanges: true });
      return;
    }

    setIsSubmitting(true);

    setRowResults((prev) => {
      const next = new Map(prev);
      rowsToSubmit.forEach(({ fieldId }) => {
        next.set(fieldId, { status: 'uploading' });
      });
      return next;
    });

    let allSucceeded = true;
    for (const { row, fieldId } of rowsToSubmit) {
      const result = await addDoctorToClaim(
        consentToken,
        {
          identificationNumber: row.identification_number,
          identificationType: row.identification_type,
          regulationBody: row.regulation_body,
        },
        t,
      );

      setRowResults((prev) => {
        const next = new Map(prev);
        if (result.ok) {
          next.set(fieldId, {
            status: 'succeeded',
            doctorName: result.doctorName,
            mirrorUuid: result.mirrorUuid,
          });
        } else {
          allSucceeded = false;
          next.set(fieldId, {
            status: 'failed',
            error: result.error ?? t('addDoctorFailed', 'Add doctor failed'),
          });
        }
        return next;
      });
    }

    setIsSubmitting(false);

    if (allSucceeded) {
      showSnackbar({
        title: t('doctorsAdded', 'Doctors added'),
        subtitle: t('doctorsAddedDesc', '{{count}} doctors added to claim {{code}}', {
          count: rowsToSubmit.length,
          code: claimAuthorizationCode,
        }),
        kind: 'success',
        isLowContrast: true,
      });
      mutate();
      setTimeout(() => closeWorkspace({ discardUnsavedChanges: true }), 1500);
    } else {
      showSnackbar({
        title: t('doctorsPartial', 'Some doctors failed'),
        subtitle: t('doctorsPartialDesc', 'Review the errors below and resubmit'),
        kind: 'warning',
        isLowContrast: true,
      });
      mutate();
    }
  };

  const cardClassFor = (status: RowStatus | undefined) => {
    return classNames(styles.itemCard, {
      [styles.itemCardSucceeded]: status === 'succeeded',
      [styles.itemCardFailed]: status === 'failed',
      [styles.itemCardUploading]: status === 'uploading',
    });
  };

  return (
    <Workspace2 hasUnsavedChanges={isDirty && !allDone} title={t('addDoctorsToClaim', 'Add doctors to claim')}>
      <Form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.claimBanner}>
          <div className={styles.bannerItem}>
            <span className={styles.bannerLabel}>{t('claimCode', 'Claim code')}</span>
            <span className={styles.bannerValue}>{claimAuthorizationCode}</span>
          </div>
        </div>
        <div className={styles.formContainer}>
          {(hasAnySucceeded || hasAnyFailed) && (
            <InlineNotification
              kind={hasAnyFailed ? 'warning' : 'success'}
              lowContrast
              hideCloseButton
              title={hasAnyFailed ? t('partialAdd', 'Partial success') : t('addSuccess', 'Doctors added')}
              subtitle={
                hasAnyFailed
                  ? t('partialAddDesc', '{{succeeded}} succeeded, {{failed}} failed — fix and resubmit', {
                      succeeded: succeededCount,
                      failed: failedCount,
                    })
                  : t('addSuccessDesc', '{{count}} doctors added', { count: succeededCount })
              }
              className={styles.statusBanner}
            />
          )}

          <FormGroup legendText={<RequiredLabel>{t('doctors', 'Doctors')}</RequiredLabel>}>
            {doctorFields.map((field, idx) => {
              const result = rowResults.get(field.id);
              const status = result?.status;
              const isLocked = status === 'succeeded';
              const isUploading = status === 'uploading';
              const isFailed = status === 'failed';
              const currentValues = getValues(`doctors.${idx}`);
              const identifierLabel = identificationTypes.find(
                (idType) => idType.code === currentValues?.identification_type,
              )?.label;

              return (
                <Layer key={field.id}>
                  <div className={cardClassFor(status)}>
                    {isLocked && (
                      <div className={styles.rowStatusHeader}>
                        <Tag type="green" renderIcon={CheckmarkFilled} size="md">
                          {t('added', 'Added')}
                        </Tag>
                        {result?.doctorName && <span className={styles.addedDoctorName}>{result.doctorName}</span>}
                      </div>
                    )}

                    {isUploading && (
                      <div className={styles.rowStatusHeader}>
                        <InlineLoading description={t('adding', 'Adding...')} />
                      </div>
                    )}

                    {isFailed && result?.error && (
                      <InlineNotification
                        kind="error"
                        lowContrast
                        hideCloseButton
                        title={t('addDoctorFailed', 'Add doctor failed')}
                        subtitle={result.error}
                        className={styles.rowError}
                      />
                    )}

                    {!isLocked && (
                      <ProviderSearch
                        idx={idx}
                        selectedDisplay={currentValues?.provider_display ?? ''}
                        selectedLicenseNumber={currentValues?.identification_number ?? ''}
                        selectedRegulationBody={currentValues?.regulation_body ?? ''}
                        identifierLabel={identifierLabel}
                        onSelect={(provider) => handleProviderSelect(idx, provider)}
                        onLicenseNumberChange={(v) =>
                          setValue(`doctors.${idx}.identification_number`, v, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                        onRegulationBodyChange={(v) =>
                          setValue(`doctors.${idx}.regulation_body`, v, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                        invalid={
                          !!errors.doctors?.[idx]?.identification_number || !!errors.doctors?.[idx]?.regulation_body
                        }
                        invalidText={
                          errors.doctors?.[idx]?.identification_number?.message ??
                          errors.doctors?.[idx]?.regulation_body?.message
                        }
                      />
                    )}

                    {isLocked && (
                      <div className={styles.lockedDoctorRow}>
                        <span className={styles.lockedLabel}>{t('license', 'License')}:</span>
                        <code>{currentValues?.identification_number}</code>
                        <span className={styles.lockedLabel}>{t('body', 'Body')}:</span>
                        <code>{currentValues?.regulation_body}</code>
                      </div>
                    )}

                    <div className={styles.idTypeRow}>
                      <Controller
                        name={`doctors.${idx}.identification_type`}
                        control={control}
                        render={({ field }) => (
                          <Select
                            {...field}
                            onChange={(e) => handleIdentificationTypeChange(idx, e.target.value)}
                            id={`id-type-${idx}`}
                            disabled={isLocked || isUploading || isLoadingTypes}
                            labelText={<RequiredLabel>{t('identificationType', 'Identification type')}</RequiredLabel>}
                            invalid={!!errors.doctors?.[idx]?.identification_type}
                            invalidText={errors.doctors?.[idx]?.identification_type?.message}>
                            {isLoadingTypes ? (
                              <SelectItem value="" text={t('loadingTypes', 'Loading...')} />
                            ) : (
                              identificationTypes.map((idType) => (
                                <SelectItem key={idType.code} value={idType.code} text={idType.label} />
                              ))
                            )}
                          </Select>
                        )}
                      />
                    </div>

                    <div className={styles.addBtnContainer}>
                      {idx === doctorFields.length - 1 && doctorFields.length < 10 && (
                        <Button kind="tertiary" size="sm" className={styles.addBtn} onClick={handleAddRow}>
                          {t('addDoctorRow', '+ Add another doctor')}
                        </Button>
                      )}
                      {doctorFields.length > 1 && (
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
            {errors.doctors?.root && <p className={styles.fieldError}>{errors.doctors.root.message}</p>}
          </FormGroup>
        </div>

        <ButtonSet className={classNames({ [styles.tablet]: isTablet, [styles.desktop]: !isTablet })}>
          <Button
            className={styles.button}
            kind="secondary"
            onClick={() => closeWorkspace({ discardUnsavedChanges: true })}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button
            className={styles.button}
            disabled={isSubmitting || (!isDirty && !allDone && !hasAnyFailed)}
            kind="primary"
            type="submit">
            {isSubmitting ? (
              <InlineLoading className={styles.spinner} description={t('adding', 'Adding') + '...'} />
            ) : (
              <span>{submitButtonLabel}</span>
            )}
          </Button>
        </ButtonSet>
      </Form>
    </Workspace2>
  );
};

export default ClaimDoctorsWorkspace;
