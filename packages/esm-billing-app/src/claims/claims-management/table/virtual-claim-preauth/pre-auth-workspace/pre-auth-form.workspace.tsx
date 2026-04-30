import {
  Button,
  ButtonSet,
  FileUploader,
  Form,
  FormGroup,
  InlineLoading,
  InlineNotification,
  Layer,
  RadioButton,
  RadioButtonGroup,
  Select,
  SelectItem,
  Stack,
  Tag,
  TextArea,
  TextInput,
} from '@carbon/react';
import {
  openmrsFetch,
  restBaseUrl,
  showSnackbar,
  useLayoutType,
  Workspace2,
  type Workspace2DefinitionProps,
} from '@openmrs/esm-framework';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TrashCan } from '@carbon/react/icons';
import styles from './pre-auth-form.scss';
import { type PreauthQueueItem } from '../../../../../billing-form/social-health-authority/type';
import ServiceDateTimeField from './service-datetime.component';
import { getDefaultValues, getSchemaForType, type PreauthFormData, type PreauthType } from './pre-auth-schema';
import DiagnosisSearch from './diagnosis-component/diagnosis-component';
import ProviderSearch from './provider-search-component/provider-search-component';
import { type ProviderResult } from '../type';
import { handleMutate } from '../../../../../billable-services/utils';
import {
  buildPreauthFormData,
  getPreauthFieldError,
  preauthField,
  asStringField,
  extractUpstreamError,
  extractFetchError,
} from '../utils';
import {
  ANAESTHESIA_TYPES,
  FREQUENCY_OPTIONS,
  CARCINOMA_STAGES,
  METASTASES_OPTIONS,
  TREATMENT_SETTINGS,
  LENS_PRESCRIPTIONS,
  DOCUMENT_TYPES,
  virtualClaimBaseUrl,
} from '../constants';
import { formatCurrency } from '../../../../../helpers/currency';

const RequiredLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span>
    {children}
    <span className={styles.required} aria-hidden="true">
      *
    </span>
  </span>
);

interface PreauthFormProps {
  item: PreauthQueueItem;
  isResubmit?: boolean;
  isElective?: boolean;
  mutate?: () => void;
  workspaceTitle?: string;
}

interface SubmitErrorResponse {
  success?: boolean;
  error?: string;
}

const PreauthForm: React.FC<Workspace2DefinitionProps<PreauthFormProps, object, object>> = ({
  closeWorkspace,
  workspaceProps,
}) => {
  const closeWorkspaceWithSavedChanges = () => closeWorkspace({ discardUnsavedChanges: true });
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const { item, isResubmit = false, isElective = false, mutate } = workspaceProps ?? {};
  const preauthType = (item?.preauth_type ?? 'NORMAL') as PreauthType;
  const workspaceTitle = workspaceProps?.workspaceTitle ?? t('preauthForm', 'Pre-authorization Form');

  const [submitError, setSubmitError] = useState<string | null>(null);

  const schema = getSchemaForType(preauthType);
  const existingItemForDefaults =
    isResubmit && item
      ? {
          requested_on: item.requested_on ?? undefined,
          responded_on: item.responded_on ?? undefined,
        }
      : undefined;
  const methods = useForm<PreauthFormData>({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues(preauthType, isElective, existingItemForDefaults) as PreauthFormData,
  });

  const {
    control,
    handleSubmit,
    register,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = methods;

  const {
    fields: doctorFields,
    append: appendDoctor,
    remove: removeDoctor,
  } = useFieldArray({ control, name: 'doctors' });
  const {
    fields: diagnosisFields,
    append: appendDiagnosis,
    remove: removeDiagnosis,
  } = useFieldArray({ control, name: 'diagnoses' });
  const {
    fields: attachmentFields,
    append: appendAttachment,
    remove: removeAttachment,
  } = useFieldArray({ control, name: 'attachments' });

  const onSubmit = async (data: PreauthFormData) => {
    if (!item) {
      return;
    }
    setSubmitError(null);
    try {
      const formData = buildPreauthFormData(data, item, isElective);
      const response = await openmrsFetch<SubmitErrorResponse>(`${restBaseUrl}/virtualclaims/preauth/files`, {
        method: 'POST',
        body: formData,
      });

      if (response?.data?.success === false) {
        throw new Error(response.data.error ?? t('submitFailed', 'Submission failed'));
      }

      showSnackbar({
        title: isResubmit ? t('preauthResubmitted', 'Preauth resubmitted') : t('preauthSubmitted', 'Preauth submitted'),
        subtitle: isElective
          ? t(
              'electivePreauthSubmittedSubtitle',
              'Elective preauth submitted to SHA for review. Status will update in the Scheduled tab.',
            )
          : t('preauthSubmittedSubtitle', 'Preauth submitted to SHA for review.'),
        kind: 'success',
      });

      handleMutate(`${virtualClaimBaseUrl}/preauth-queue`);
      mutate?.();
      closeWorkspaceWithSavedChanges();
    } catch (err: unknown) {
      const message = extractFetchError(err, t('submitFailed', 'Submission failed. Please try again.'));
      setSubmitError(message);
    }
  };

  return (
    <Workspace2 title={workspaceTitle} hasUnsavedChanges={isDirty}>
      <Form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
        <div className={styles.claimBanner}>
          <div className={styles.bannerItem}>
            <span className={styles.bannerLabel}>{t('authCode', 'Auth code')}</span>
            <span className={styles.bannerValue}>{item?.authorization_code}</span>
          </div>
          <div className={styles.bannerItem}>
            <span className={styles.bannerLabel}>{t('intervention', 'Intervention')}</span>
            <span className={styles.bannerValue}>
              {item?.intervention_code} — {item?.intervention_name}
            </span>
          </div>
          <div className={styles.bannerItem}>
            <span className={styles.bannerLabel}>{t('type', 'Type')}</span>
            <span className={styles.bannerValue}>
              {isElective ? (
                <Tag type="cyan" size="sm">
                  {t('elective', 'Elective')}
                </Tag>
              ) : (
                item?.preauth_type
              )}
            </span>
          </div>
          <div className={styles.bannerItem}>
            <span className={styles.bannerLabel}>{t('tariff', 'Tariff')}</span>
            <span className={styles.bannerValue}>{formatCurrency(Number(item?.tariff))}</span>
          </div>
          {isResubmit && (
            <div className={styles.bannerItem}>
              <Tag type="warm-gray" size="sm">
                {t('resubmission', 'Resubmission')}
              </Tag>
            </div>
          )}
        </div>

        {isResubmit && item?.response_note && (
          <div className={classNames(styles.inlineNotification, styles.resubmissionNote)}>
            <InlineNotification
              kind="warning"
              lowContrast
              title={t('rejectionReason', 'Previous rejection reason')}
              subtitle={item.response_note}
            />
          </div>
        )}

        {isElective && (
          <div className={classNames(styles.inlineNotification, styles.electiveGuidance)}>
            <InlineNotification
              kind="info"
              lowContrast
              title={t('electivePreauthGuidance', 'Elective pre-authorization')}
              subtitle={t(
                'electivePreauthGuidanceSubtitle',
                'This preauth is for a scheduled elective procedure. SHA will review and notify you via email. The status will update in the Scheduled tab.',
              )}
            />
          </div>
        )}

        {submitError && (
          <div className={classNames(styles.inlineNotification, styles.submitError)}>
            <InlineNotification kind="error" lowContrast title={submitError} />
          </div>
        )}

        <div className={styles.twoCol}>
          <ServiceDateTimeField
            control={control}
            errors={errors}
            dateField={{
              name: 'service_start',
              label: <RequiredLabel>{t('serviceStart', 'Service start')}</RequiredLabel>,
            }}
            timeField={{ name: 'service_start_time', label: t('startTime', 'Start time') }}
            timeFormatField={{ name: 'service_start_time_format', label: t('startTimeFormat', 'AM/PM') }}
          />
          <ServiceDateTimeField
            control={control}
            errors={errors}
            dateField={{ name: 'service_end', label: <RequiredLabel>{t('serviceEnd', 'Service end')}</RequiredLabel> }}
            timeField={{ name: 'service_end_time', label: t('endTime', 'End time') }}
            timeFormatField={{ name: 'service_end_time_format', label: t('endTimeFormat', 'AM/PM') }}
          />
        </div>

        <div className={styles.twoCol}>
          <Controller
            name="clinical_indications"
            control={control}
            render={({ field }) => (
              <TextArea
                {...field}
                id="clinical-indications"
                labelText={t('clinicalIndications', 'Clinical indications')}
                placeholder={t('clinicalIndicationsHint', 'Describe clinical reasons...')}
                rows={3}
              />
            )}
          />
        </div>

        <div className={styles.twoCol}>
          <Controller
            name="provider_notification_email"
            control={control}
            render={({ field }) => (
              <TextInput
                {...field}
                id="provider-email"
                type="email"
                labelText={<RequiredLabel>{t('providerEmail', 'Provider notification email')}</RequiredLabel>}
                invalid={!!errors.provider_notification_email}
                invalidText={errors.provider_notification_email?.message}
              />
            )}
          />
        </div>

        <div className={styles.twoCol}>
          <FormGroup legendText={<RequiredLabel>{t('doctors', 'Doctors')}</RequiredLabel>}>
            {doctorFields.map((field, idx) => (
              <Layer key={field.id}>
                <div className={styles.itemCard}>
                  <ProviderSearch
                    idx={idx}
                    selectedDisplay={methods.watch(`doctors.${idx}.person.display`) ?? ''}
                    selectedLicenseNumber={methods.watch(`doctors.${idx}.identification_number`) ?? ''}
                    selectedRegulationBody={methods.watch(`doctors.${idx}.regulation_body`) ?? ''}
                    onSelect={(provider: ProviderResult) => {
                      setValue(`doctors.${idx}.person.display`, provider.person?.display);
                      setValue(`doctors.${idx}.identification_number`, provider.licenseNumber ?? '');
                      setValue(`doctors.${idx}.identification_type`, 'registration_number');
                      setValue(`doctors.${idx}.regulation_body`, provider.licenseBody ?? '');
                    }}
                    onLicenseNumberChange={(val) => setValue(`doctors.${idx}.identification_number`, val)}
                    onRegulationBodyChange={(val) => setValue(`doctors.${idx}.regulation_body`, val)}
                    invalid={!!errors.doctors?.[idx]?.identification_number}
                    invalidText={errors.doctors?.[idx]?.identification_number?.message}
                  />
                  <div className={styles.addBtnContainer}>
                    <Button
                      kind="tertiary"
                      size="sm"
                      className={styles.addBtn}
                      onClick={() =>
                        appendDoctor({
                          identification_number: '',
                          identification_type: 'registration_number',
                          regulation_body: 'KMPDC',
                          is_primary: false,
                        })
                      }>
                      {t('addDoctor', '+ Add doctor')}
                    </Button>
                    {idx > 0 && (
                      <Button
                        kind="danger"
                        size="sm"
                        renderIcon={TrashCan}
                        iconDescription={t('remove', 'Remove')}
                        hasIconOnly
                        className={styles.removeBtn}
                        onClick={() => removeDoctor(idx)}
                      />
                    )}
                  </div>
                </div>
              </Layer>
            ))}
            {errors.doctors?.root && <p className={styles.fieldError}>{errors.doctors.root.message}</p>}
          </FormGroup>
        </div>

        <div className={styles.twoCol}>
          <FormGroup legendText={<RequiredLabel>{t('diagnoses', 'Diagnoses')}</RequiredLabel>}>
            {diagnosisFields.map((field, idx) => (
              <React.Fragment key={field.id}>
                <div className={styles.diagRow}>
                  <Controller
                    name={`diagnoses.${idx}.icd_code`}
                    control={control}
                    render={({ field: f }) => (
                      <DiagnosisSearch
                        id={`diag-${idx}`}
                        value={f.value}
                        display={methods.getValues(`diagnoses.${idx}.display`) ?? ''}
                        onChange={(icdCode, displayName) => {
                          f.onChange(icdCode);
                          setValue(`diagnoses.${idx}.display`, displayName);
                        }}
                        invalid={!!errors.diagnoses?.[idx]?.icd_code}
                        invalidText={errors.diagnoses?.[idx]?.icd_code?.message}
                      />
                    )}
                  />
                </div>
                <div className={styles.addBtnContainer}>
                  <Button
                    kind="tertiary"
                    size="sm"
                    onClick={() => appendDiagnosis({ icd_code: '' })}
                    className={styles.addBtn}>
                    {t('addDiagnosis', '+ Add diagnosis')}
                  </Button>
                  {idx > 0 && (
                    <Button
                      kind="danger"
                      size="sm"
                      renderIcon={TrashCan}
                      iconDescription={t('remove', 'Remove')}
                      hasIconOnly
                      onClick={() => removeDiagnosis(idx)}
                      className={styles.removeBtn}
                    />
                  )}
                </div>
              </React.Fragment>
            ))}
            {errors.diagnoses?.root && <p className={styles.fieldError}>{errors.diagnoses.root.message}</p>}
          </FormGroup>
        </div>

        {preauthType === 'SURGICAL' && (
          <div className={styles.twoCol}>
            <FormGroup legendText={t('surgicalDetails', 'Surgical details')}>
              <Stack gap={4}>
                {(
                  [
                    'chief_complaint',
                    'vital_signs',
                    'history_of_present_illness',
                    'physical_examination',
                    'investigation_report_details',
                  ] as const
                ).map((f) => (
                  <Controller
                    key={f}
                    name={preauthField(f)}
                    control={control}
                    render={({ field: fld }) => (
                      <TextArea {...asStringField(fld)} id={f} labelText={t(f, f.replace(/_/g, ' '))} rows={2} />
                    )}
                  />
                ))}
                <Controller
                  name={preauthField('type_of_anaesthesia')}
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...asStringField(field)}
                      id="anaesthesia"
                      labelText={<RequiredLabel>{t('typeOfAnaesthesia', 'Type of anaesthesia')}</RequiredLabel>}
                      invalid={!!getPreauthFieldError(errors, 'type_of_anaesthesia')}
                      invalidText={getPreauthFieldError(errors, 'type_of_anaesthesia')}>
                      {ANAESTHESIA_TYPES.map((a) => (
                        <SelectItem key={a} value={a} text={a} />
                      ))}
                    </Select>
                  )}
                />
                <ServiceDateTimeField
                  control={control}
                  errors={errors}
                  dateField={{ name: 'surgery_date', label: t('surgeryDate', 'Surgery date') }}
                  timeField={{ name: 'surgery_date_time', label: t('surgeryTime', 'Surgery time') }}
                  timeFormatField={{ name: 'surgery_date_time_format', label: t('surgeryTimeFormat', 'AM/PM') }}
                />
              </Stack>
            </FormGroup>
          </div>
        )}

        {preauthType === 'RENAL' && (
          <div className={styles.twoCol}>
            <FormGroup legendText={t('renalDetails', 'Renal details')}>
              <Stack gap={4}>
                <Controller
                  name={preauthField('number_of_sessions_required')}
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      {...asStringField(field)}
                      id="sessions"
                      type="number"
                      labelText={<RequiredLabel>{t('numberOfSessions', 'Number of sessions')}</RequiredLabel>}
                      invalid={!!getPreauthFieldError(errors, 'number_of_sessions_required')}
                      invalidText={getPreauthFieldError(errors, 'number_of_sessions_required')}
                    />
                  )}
                />
                <Controller
                  name={preauthField('cost_per_session')}
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      {...asStringField(field)}
                      id="cost-session"
                      type="number"
                      labelText={<RequiredLabel>{t('costPerSession', 'Cost per session (KES)')}</RequiredLabel>}
                      invalid={!!getPreauthFieldError(errors, 'cost_per_session')}
                      invalidText={getPreauthFieldError(errors, 'cost_per_session')}
                    />
                  )}
                />
                <Controller
                  name={preauthField('frequency_of_sessions')}
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...asStringField(field)}
                      id="frequency"
                      labelText={t('frequencyOfSessions', 'Frequency of sessions')}>
                      {FREQUENCY_OPTIONS.map((f) => (
                        <SelectItem key={f} value={f} text={f.replace(/_/g, ' ')} />
                      ))}
                    </Select>
                  )}
                />
                <ServiceDateTimeField
                  control={control}
                  errors={errors}
                  dateField={{ name: 'renal_date', label: t('renalDate', 'Renal date') }}
                  timeField={{ name: 'renal_date_time', label: t('renalTime', 'Renal time') }}
                  timeFormatField={{ name: 'renal_date_time_format', label: t('renalTimeFormat', 'AM/PM') }}
                />
                <Controller
                  name={preauthField('is_co_insured')}
                  control={control}
                  render={({ field }) => (
                    <RadioButtonGroup
                      legendText={t('isCoInsured', 'Co-insured')}
                      name={`co-insured-${field.name}`}
                      valueSelected={field.value === true ? 'yes' : field.value === false ? 'no' : ''}
                      onChange={(value) => field.onChange(value === 'yes')}>
                      <RadioButton id="co-insured-yes" labelText={t('yes', 'Yes')} value="yes" />
                      <RadioButton id="co-insured-no" labelText={t('no', 'No')} value="no" />
                    </RadioButtonGroup>
                  )}
                />
              </Stack>
            </FormGroup>
          </div>
        )}

        {preauthType === 'ONCOLOGY' && (
          <div className={styles.twoCol}>
            <FormGroup legendText={t('oncologyDetails', 'Oncology details')}>
              <Stack gap={4}>
                <Controller
                  name={preauthField('carcinoma_staging')}
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...asStringField(field)}
                      id="staging"
                      labelText={t('carcinomaStaging', 'Carcinoma staging')}>
                      {CARCINOMA_STAGES.map((s) => (
                        <SelectItem key={s} value={s} text={s.replace(/_/g, ' ')} />
                      ))}
                    </Select>
                  )}
                />
                <Controller
                  name={preauthField('comorbidity')}
                  control={control}
                  render={({ field }) => (
                    <TextArea
                      {...asStringField(field)}
                      id="comorbidity"
                      labelText={t('comorbidity', 'Comorbidity')}
                      rows={2}
                    />
                  )}
                />
                <Controller
                  name={preauthField<PreauthFormData>('metastases')}
                  control={control}
                  render={({ field }) => {
                    const value = (field.value as Array<string> | undefined) ?? [];
                    return (
                      <FormGroup legendText={<RequiredLabel>{t('metastases', 'Metastases')}</RequiredLabel>}>
                        <div className={styles.checkboxGroup}>
                          {METASTASES_OPTIONS.map((m) => (
                            <label key={m} className={styles.checkboxLabel}>
                              <input
                                type="checkbox"
                                checked={value.includes(m)}
                                onChange={(e) => {
                                  field.onChange(e.target.checked ? [...value, m] : value.filter((x) => x !== m));
                                }}
                              />
                              {m}
                            </label>
                          ))}
                        </div>
                        {getPreauthFieldError(errors, 'metastases') && (
                          <p className={styles.fieldError}>{getPreauthFieldError(errors, 'metastases')}</p>
                        )}
                      </FormGroup>
                    );
                  }}
                />
                <Controller
                  name={preauthField('treatment_setting')}
                  control={control}
                  render={({ field }) => {
                    const value = (field.value as Array<string> | undefined) ?? [];
                    return (
                      <FormGroup
                        legendText={<RequiredLabel>{t('treatmentSetting', 'Treatment setting')}</RequiredLabel>}>
                        <div className={styles.checkboxGroup}>
                          {TREATMENT_SETTINGS.map((ts) => (
                            <label key={ts} className={styles.checkboxLabel}>
                              <input
                                type="checkbox"
                                checked={value.includes(ts)}
                                onChange={(e) => {
                                  field.onChange(e.target.checked ? [...value, ts] : value.filter((x) => x !== ts));
                                }}
                              />
                              {ts.replace(/_/g, ' ')}
                            </label>
                          ))}
                        </div>
                        {getPreauthFieldError(errors, 'treatment_setting') && (
                          <p className={styles.fieldError}>{getPreauthFieldError(errors, 'treatment_setting')}</p>
                        )}
                      </FormGroup>
                    );
                  }}
                />
                <div className={styles.twoCol}>
                  <Controller
                    name={preauthField('number_of_sessions_required')}
                    control={control}
                    render={({ field }) => (
                      <TextInput
                        {...asStringField(field)}
                        id="onco-sessions"
                        type="number"
                        labelText={<RequiredLabel>{t('numberOfSessions', 'Number of sessions')}</RequiredLabel>}
                        invalid={!!getPreauthFieldError(errors, 'number_of_sessions_required')}
                        invalidText={getPreauthFieldError(errors, 'number_of_sessions_required')}
                      />
                    )}
                  />
                  <Controller
                    name={preauthField('cost_per_session')}
                    control={control}
                    render={({ field }) => (
                      <TextInput
                        {...asStringField(field)}
                        id="onco-cost"
                        type="number"
                        labelText={<RequiredLabel>{t('costPerSession', 'Cost per session (KES)')}</RequiredLabel>}
                        invalid={!!getPreauthFieldError(errors, 'cost_per_session')}
                        invalidText={getPreauthFieldError(errors, 'cost_per_session')}
                      />
                    )}
                  />
                </div>
                <Controller
                  name={preauthField('is_co_insured')}
                  control={control}
                  render={({ field }) => (
                    <RadioButtonGroup
                      legendText={t('isCoInsured', 'Co-insured')}
                      name={`onco-co-insured-${field.name}`}
                      valueSelected={field.value === true ? 'yes' : field.value === false ? 'no' : ''}
                      onChange={(value) => field.onChange(value === 'yes')}>
                      <RadioButton id="onco-co-insured-yes" labelText={t('yes', 'Yes')} value="yes" />
                      <RadioButton id="onco-co-insured-no" labelText={t('no', 'No')} value="no" />
                    </RadioButtonGroup>
                  )}
                />
              </Stack>
            </FormGroup>
          </div>
        )}

        {preauthType === 'OPTICAL' && (
          <div className={styles.twoCol}>
            <FormGroup legendText={t('opticalDetails', 'Optical details')}>
              <Stack gap={4}>
                <Controller
                  name={preauthField('necessity_of_service')}
                  control={control}
                  render={({ field }) => (
                    <TextArea
                      {...asStringField(field)}
                      id="necessity"
                      labelText={t('necessityOfService', 'Necessity of service')}
                      rows={2}
                    />
                  )}
                />
                <Controller
                  name={preauthField('lens_prescription')}
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...asStringField(field)}
                      id="lens-prescription"
                      labelText={t('lensPrescription', 'Lens prescription')}>
                      {LENS_PRESCRIPTIONS.map((l) => (
                        <SelectItem key={l} value={l} text={l.replace(/_/g, ' ')} />
                      ))}
                    </Select>
                  )}
                />
                <div className={styles.threeCol}>
                  {(['lens_amount', 'eye_examination_amount', 'frame_amount'] as const).map((f) => (
                    <Controller
                      key={f}
                      name={preauthField(f)}
                      control={control}
                      render={({ field }) => (
                        <TextInput
                          {...asStringField(field)}
                          id={f}
                          type="number"
                          labelText={t(f, f.replace(/_/g, ' ') + ' (KES)')}
                        />
                      )}
                    />
                  ))}
                </div>
                <Controller
                  name={preauthField('new_or_replacement')}
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...asStringField(field)}
                      id="new-replacement"
                      labelText={t('newOrReplacement', 'New or replacement')}>
                      <SelectItem value="NEW" text="New" />
                      <SelectItem value="REPLACEMENT" text="Replacement" />
                    </Select>
                  )}
                />
              </Stack>
            </FormGroup>
          </div>
        )}

        <div className={styles.twoCol}>
          <FormGroup legendText={<RequiredLabel>{t('attachments', 'Attachments')}</RequiredLabel>}>
            {attachmentFields.map((field, idx) => (
              <Layer key={field.id}>
                <div className={styles.itemCard}>
                  <div className={styles.twoCol}>
                    <Controller
                      name={`attachments.${idx}.document_type`}
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          id={`att-type-${idx}`}
                          labelText={<RequiredLabel>{t('documentType', 'Document type')}</RequiredLabel>}
                          invalid={!!errors.attachments?.[idx]?.document_type}
                          invalidText={errors.attachments?.[idx]?.document_type?.message}>
                          {DOCUMENT_TYPES.map((d) => (
                            <SelectItem key={d} value={d} text={d.replace(/_/g, ' ')} />
                          ))}
                        </Select>
                      )}
                    />
                    <TextInput
                      id={`att-title-${idx}`}
                      labelText={t('documentTitle', 'Document title')}
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
                        <FileUploader
                          labelTitle=""
                          labelDescription={t('uploadFileDesc', 'PDF, PNG, JPG — max 10MB')}
                          buttonLabel={t('addFile', 'Add file')}
                          buttonKind="tertiary"
                          size="md"
                          filenameStatus="edit"
                          accept={['.pdf', '.png', '.jpg', '.jpeg']}
                          multiple={false}
                          onChange={(e) => field.onChange(e.target.files?.[0] ?? null)}
                        />
                        {errors.attachments?.[idx]?.file && (
                          <p className={styles.fieldError}>{errors.attachments[idx].file?.message}</p>
                        )}
                      </>
                    )}
                  />
                </div>
                <div className={styles.addBtnContainer}>
                  {idx === attachmentFields.length - 1 && (
                    <Button
                      kind="tertiary"
                      size="sm"
                      className={styles.addBtn}
                      onClick={() =>
                        appendAttachment({
                          document_title: '',
                          document_type: 'LAB_ORDER',
                          file: null as unknown as File,
                        })
                      }>
                      {t('addAttachment', '+ Add attachment')}
                    </Button>
                  )}
                  {idx > 0 && (
                    <Button
                      kind="danger"
                      size="sm"
                      className={styles.removeBtn}
                      renderIcon={TrashCan}
                      iconDescription={t('remove', 'Remove')}
                      hasIconOnly
                      onClick={() => removeAttachment(idx)}
                    />
                  )}
                </div>
              </Layer>
            ))}
            {errors.attachments?.root && <p className={styles.fieldError}>{errors.attachments.root.message}</p>}
          </FormGroup>
        </div>

        <ButtonSet className={classNames({ [styles.tablet]: isTablet, [styles.desktop]: !isTablet })}>
          <Button className={styles.button} kind="secondary" onClick={() => closeWorkspace()}>
            {t('discard', 'Discard')}
          </Button>
          <Button className={styles.button} disabled={isSubmitting} kind="primary" type="submit">
            {isSubmitting ? (
              <InlineLoading description={t('submitting', 'Submitting...') + '...'} role="progressbar" />
            ) : isResubmit ? (
              t('resubmitPreauth', 'Resubmit preauth')
            ) : (
              t('submitPreauth', 'Submit preauth')
            )}
          </Button>
        </ButtonSet>
      </Form>
    </Workspace2>
  );
};

export default PreauthForm;
