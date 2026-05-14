import React, { useEffect, useMemo, useState } from 'react';
import { Button, Column, ComboBox, Form, Grid, Modal, Select, SelectItem, TextArea, TextInput } from '@carbon/react';
import { DocumentAdd, Table as TableIcon } from '@carbon/react/icons';
import { showSnackbar, useConfig, useSession } from '@openmrs/esm-framework';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import styles from '../anaesthetic.scss';
import DiagnosisSearch from './icd11-diagnosis-search.component';
import TimePickerDropdown from './time-picker-dropdown.component';
import {
  type AnaestheticFormValues,
  type AnaestheticRecordRow,
  type DiagnosisOption,
  type ProcedureOption,
  type ProviderOption,
  PROCEDURE_ORDER_TYPE_UUID,
  saveAnaestheticRecord,
  useAnaestheticEncounterDefaults,
  useAnaestheticProcedureOptions,
  useAnaestheticProviderOptions,
  useAnaestheticProviderSearch,
  useAnaestheticRecords,
} from '../resources/anaesthetic-form.resource';

const SIDE_OPTIONS = [
  { value: '', label: 'Select side' },
  { value: 'R', label: 'Right' },
  { value: 'L', label: 'Left' },
  { value: 'B', label: 'Both' },
];

const YES_NO_OPTIONS = [
  { value: '', label: 'Select option' },
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

const INDUCTION_AIRWAY_OPTIONS = [
  { value: '', label: 'Select induction airway' },
  { value: 'ORO/Nasopharyngeal R/L', label: 'ORO/Nasopharyngeal R/L' },
  { value: 'ORO/Nasotraceal Cuff Pack', label: 'ORO/Nasotraceal Cuff Pack' },
  { value: 'Endobronchial R/L', label: 'Endobronchial R/L' },
];

const INDUCTION_TECHNIQUE_OPTIONS = [
  { value: '', label: 'Select technique' },
  { value: 'blind', label: 'Blind' },
  { value: 'underMask', label: 'Under Mask' },
];

const IF_IV_SITE_OPTIONS = [
  { value: '', label: 'Select IV site' },
  { value: 'ARM', label: 'ARM' },
  { value: 'Hand', label: 'Hand' },
  { value: 'Leg', label: 'Leg' },
];

function getRoundedCurrentTime() {
  const now = new Date();
  const roundedDate = new Date(now);
  roundedDate.setSeconds(0, 0);

  return roundedDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

type AnaestheticRecordFormProps = {
  patientUuid: string;
};

const AnaestheticRecordForm: React.FC<AnaestheticRecordFormProps> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const config = useConfig() as any;
  const icd11DataSourceUuid = config?.icd11DataSourceUuid ?? '';
  const session = useSession();
  const [activeView, setActiveView] = useState<'form' | 'table'>('form');
  const [selectedRecord, setSelectedRecord] = useState<AnaestheticRecordRow | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [operationSearchTerm, setOperationSearchTerm] = useState('');
  const [selectedOperation, setSelectedOperation] = useState<ProcedureOption | null>(null);
  const [surgeonSearchTerm, setSurgeonSearchTerm] = useState('');
  const [scrubNurseSearchTerm, setScrubNurseSearchTerm] = useState('');
  const [selectedSurgeonProvider, setSelectedSurgeonProvider] = useState<ProviderOption | null>(null);
  const [selectedScrubNurseProvider, setSelectedScrubNurseProvider] = useState<ProviderOption | null>(null);
  const { providers, isLoading: isLoadingProviders } = useAnaestheticProviderOptions();
  const { providers: searchedSurgeons } = useAnaestheticProviderSearch(surgeonSearchTerm);
  const { providers: searchedScrubNurses } = useAnaestheticProviderSearch(scrubNurseSearchTerm);
  const { procedures, isLoading: isLoadingProcedures } = useAnaestheticProcedureOptions(operationSearchTerm);
  const { records: backendRecords, mutate: mutateBackendRecords } = useAnaestheticRecords(patientUuid);
  const { defaults, isLoading: isLoadingDefaults } = useAnaestheticEncounterDefaults(patientUuid, {
    uuid: session?.currentProvider?.uuid,
    display: session?.user?.person?.display,
  });

  const {
    control,
    getValues,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm<AnaestheticFormValues>({
    defaultValues: {
      encounterDate: '',
      diagnosis: null,
      operation: null,
      anaesthetistProviderUuid: '',
      anaesthetistName: '',
      surgeonProviderUuid: '',
      scrubNurseProviderUuid: '',
      typeOfPremedication: '',
      effect: '',
      timeGiven: '',
      inductionAirway: '',
      blindOrUnderMask: '',
      oroNasopharyngeal: '',
      oroNasotrachealCuffPack: '',
      endobronchial: '',
      blind: '',
      underMask: '',
      ifIv: '',
      armSite: '',
      handSite: '',
      legSite: '',
      anaestheticNotes: '',
    },
  });

  const baseSelectableProviders = useMemo(() => {
    if (providers.length > 0) {
      return providers;
    }

    if (defaults.anaesthetistProviderUuid) {
      return [
        {
          uuid: defaults.anaesthetistProviderUuid,
          display: defaults.anaesthetistName || 'Current provider',
        },
      ];
    }

    return [];
  }, [defaults.anaesthetistName, defaults.anaesthetistProviderUuid, providers]);

  const operationOptions = useMemo(
    () =>
      Array.from(
        new Map(
          [...procedures, ...(selectedOperation ? [selectedOperation] : [])].map((procedure) => [
            procedure.uuid || procedure.display,
            procedure,
          ]),
        ).values(),
      ),
    [procedures, selectedOperation],
  );

  const surgeonOptions = useMemo(
    () =>
      Array.from(
        new Map(
          [
            ...baseSelectableProviders,
            ...searchedSurgeons,
            ...(selectedSurgeonProvider ? [selectedSurgeonProvider] : []),
          ].map((provider) => [provider.uuid, provider]),
        ).values(),
      ),
    [baseSelectableProviders, searchedSurgeons, selectedSurgeonProvider],
  );

  const scrubNurseOptions = useMemo(
    () =>
      Array.from(
        new Map(
          [
            ...baseSelectableProviders,
            ...searchedScrubNurses,
            ...(selectedScrubNurseProvider ? [selectedScrubNurseProvider] : []),
          ].map((provider) => [provider.uuid, provider]),
        ).values(),
      ),
    [baseSelectableProviders, searchedScrubNurses, selectedScrubNurseProvider],
  );

  const providerLookup = useMemo(
    () => new Map([...surgeonOptions, ...scrubNurseOptions].map((provider) => [provider.uuid, provider.display])),
    [surgeonOptions, scrubNurseOptions],
  );

  const existingTimeEntries = useMemo(
    () =>
      backendRecords
        .filter((record) => typeof record.timeGiven === 'string' && /^\d{2}:\d{2}$/.test(record.timeGiven))
        .map((record) => ({
          hour: parseInt(record.timeGiven.split(':')[0], 10),
          time: record.timeGiven,
        })),
    [backendRecords],
  );

  useEffect(() => {
    const currentValues = getValues();

    if (!currentValues.encounterDate && defaults.encounterDate) {
      setValue('encounterDate', defaults.encounterDate, { shouldDirty: false });
    }

    if (!currentValues.diagnosis && defaults.diagnosis) {
      // Convert string diagnosis from defaults to DiagnosisOption
      const diagnosisValue: DiagnosisOption = {
        uuid: '',
        display: defaults.diagnosis,
      };
      setValue('diagnosis', diagnosisValue, { shouldDirty: false });
    }

    if (!currentValues.timeGiven) {
      setValue('timeGiven', getRoundedCurrentTime(), { shouldDirty: false });
    }

    if (!currentValues.anaesthetistProviderUuid && defaults.anaesthetistProviderUuid) {
      setValue('anaesthetistProviderUuid', defaults.anaesthetistProviderUuid, { shouldDirty: false });
    }

    if (!currentValues.anaesthetistName && defaults.anaesthetistName) {
      setValue('anaesthetistName', defaults.anaesthetistName, { shouldDirty: false });
    }
  }, [
    defaults.anaesthetistName,
    defaults.anaesthetistProviderUuid,
    defaults.diagnosis,
    defaults.encounterDate,
    getValues,
    setValue,
  ]);

  const onSubmit = async (values: AnaestheticFormValues) => {
    const blindOrUnderMask = values.blindOrUnderMask;
    const ifIvSite = values.ifIv;
    const submissionValues = {
      ...values,
      diagnosis: values.diagnosis,
      operation: values.operation
        ? {
            ...values.operation,
            uuid: PROCEDURE_ORDER_TYPE_UUID,
          }
        : null,
      blind: blindOrUnderMask === 'blind' ? 'yes' : '',
      underMask: blindOrUnderMask === 'underMask' ? 'yes' : '',
      ifIv: ifIvSite,
      armSite: '',
      handSite: '',
      legSite: '',
      surgeonName: providerLookup.get(values.surgeonProviderUuid) || '',
      scrubNurseName: providerLookup.get(values.scrubNurseProviderUuid) || '',
    } as unknown as AnaestheticFormValues;

    setIsSaving(true);

    try {
      const result = await saveAnaestheticRecord(
        patientUuid,
        submissionValues,
        session?.sessionLocation?.uuid,
        session?.currentProvider?.uuid,
      );

      if (result.success) {
        await mutateBackendRecords();
        reset();
        setActiveView('table');
        showSnackbar({
          title: t('anaestheticSaved', 'Anaesthetic form saved'),
          subtitle: result.message,
          kind: 'success',
          isLowContrast: true,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      showSnackbar({
        title: t('anaestheticSaveFailed', 'Save failed'),
        subtitle:
          error instanceof Error
            ? error.message
            : t('failedToSaveAnaestheticRecord', 'Failed to save anaesthetic record'),
        kind: 'error',
        isLowContrast: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className={styles.anaestheticFormSection}>
      <div className={styles.anaestheticFormContainer}>
        <div className={styles.anaestheticFormHeader}>
          <div>
            <h3 className={styles.anaestheticFormTitle}>{t('anaestheticRecord', 'Anaesthetic record')}</h3>
            <p className={styles.anaestheticFormSubtitle}>
              {t(
                'anaestheticRecordSubtitle',
                'Capture the theatre and anaesthetic details used to contextualize the charts below.',
              )}
            </p>
          </div>
          <div className={styles.anaestheticFormHeaderActions}>
            <div className={styles.anaestheticViewSwitcher}>
              <Button
                kind={activeView === 'form' ? 'primary' : 'secondary'}
                size="sm"
                hasIconOnly
                iconDescription={t('formView', 'Form View')}
                onClick={() => setActiveView('form')}
                className={styles.anaestheticViewButton}>
                <DocumentAdd />
              </Button>
              <Button
                kind={activeView === 'table' ? 'primary' : 'secondary'}
                size="sm"
                hasIconOnly
                iconDescription={t('tableView', 'Table View')}
                onClick={() => setActiveView('table')}
                className={styles.anaestheticViewButton}>
                <TableIcon />
              </Button>
            </div>
          </div>
        </div>

        {activeView === 'form' && (
          <Form onSubmit={handleSubmit(onSubmit)}>
            <Grid className={styles.anaestheticFormGrid}>
              <Column lg={4} md={4} sm={4}>
                <Controller
                  name="encounterDate"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      id="anaesthetic-encounter-date"
                      type="date"
                      labelText={t('encounterDate', 'Encounter Date')}
                      {...field}
                    />
                  )}
                />
              </Column>
              <Column lg={12} md={4} sm={4}>
                <Controller
                  name="diagnosis"
                  control={control}
                  rules={{ required: t('diagnosisRequired', 'Diagnosis is required') }}
                  render={({ field, fieldState }) => (
                    <DiagnosisSearch
                      id="anaesthetic-diagnosis"
                      labelText={t('diagnosis', 'Diagnosis (ICD 11)')}
                      value={field.value}
                      config={{
                        dataSourceUuid: icd11DataSourceUuid,
                        minChars: 3,
                      }}
                      placeholder={t(
                        'selectOrSearchDiagnosis',
                        'Select from list or type at least 3 letters to search ICD-11 diagnosis',
                      )}
                      onChange={field.onChange}
                      invalid={!!fieldState.error}
                      invalidText={fieldState.error?.message}
                    />
                  )}
                />
              </Column>

              <Column lg={6} md={4} sm={4}>
                <Controller
                  name="operation"
                  control={control}
                  render={({ field }) => (
                    <>
                      <ComboBox
                        id="anaesthetic-operation"
                        titleText={t('operation', 'Operation')}
                        items={operationOptions}
                        itemToString={(item) => item?.display ?? ''}
                        selectedItem={
                          operationOptions.find((procedure) => procedure.display === field.value?.display) ||
                          (selectedOperation?.display === field.value?.display ? selectedOperation : null)
                        }
                        placeholder={
                          isLoadingProcedures
                            ? t('loadingProcedures', 'Loading procedures...')
                            : operationOptions.length > 0
                            ? t('selectOrSearchOperation', 'Select from list or type to search more operations')
                            : t('noProceduresFound', 'No procedures found')
                        }
                        onChange={({ selectedItem }) => {
                          const selected = (selectedItem as ProcedureOption) || null;
                          const withUuid = selected ? { ...selected, uuid: PROCEDURE_ORDER_TYPE_UUID } : null;
                          field.onChange(withUuid);
                          setSelectedOperation(withUuid);
                        }}
                        onInputChange={(value) => setOperationSearchTerm(value || '')}
                        onBlur={field.onBlur}
                        disabled={isLoadingProcedures}
                      />
                    </>
                  )}
                />
              </Column>
              <Column lg={5} md={4} sm={4}>
                <Controller
                  name="anaesthetistName"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      id="anaesthetic-anaesthetist"
                      labelText={t('anaesthetist', 'Anaesthetist')}
                      readOnly
                      {...field}
                    />
                  )}
                />
              </Column>
              <Column lg={5} md={4} sm={4}>
                <Controller
                  name="surgeonProviderUuid"
                  control={control}
                  render={({ field }) => (
                    <ComboBox
                      id="anaesthetic-surgeon"
                      titleText={t('surgeon', 'Surgeon')}
                      items={surgeonOptions}
                      itemToString={(item) => item?.display ?? ''}
                      selectedItem={
                        surgeonOptions.find((provider) => provider.uuid === field.value) ||
                        (selectedSurgeonProvider?.uuid === field.value ? selectedSurgeonProvider : null)
                      }
                      placeholder={
                        isLoadingProviders
                          ? t('loadingProviders', 'Loading providers...')
                          : surgeonOptions.length > 0
                          ? t('searchSelectSurgeon', 'Search and select surgeon')
                          : t('searchProviderByName', 'Type at least 3 letters to search provider')
                      }
                      onChange={({ selectedItem }) => {
                        field.onChange(selectedItem?.uuid ?? '');
                        setSelectedSurgeonProvider((selectedItem as ProviderOption) || null);
                      }}
                      onInputChange={(value) => setSurgeonSearchTerm(value || '')}
                      onBlur={field.onBlur}
                      disabled={isLoadingProviders && surgeonOptions.length === 0}
                    />
                  )}
                />
              </Column>
              <Column lg={5} md={4} sm={4}>
                <Controller
                  name="scrubNurseProviderUuid"
                  control={control}
                  render={({ field }) => (
                    <ComboBox
                      id="anaesthetic-scrub-nurse"
                      titleText={t('scrubNurse', 'Scrub Nurse')}
                      items={scrubNurseOptions}
                      itemToString={(item) => item?.display ?? ''}
                      selectedItem={
                        scrubNurseOptions.find((provider) => provider.uuid === field.value) ||
                        (selectedScrubNurseProvider?.uuid === field.value ? selectedScrubNurseProvider : null)
                      }
                      placeholder={
                        isLoadingProviders
                          ? t('loadingProviders', 'Loading providers...')
                          : scrubNurseOptions.length > 0
                          ? t('searchSelectScrubNurse', 'Search and select scrub nurse')
                          : t('searchProviderByName', 'Type at least 3 letters to search provider')
                      }
                      onChange={({ selectedItem }) => {
                        field.onChange(selectedItem?.uuid ?? '');
                        setSelectedScrubNurseProvider((selectedItem as ProviderOption) || null);
                      }}
                      onInputChange={(value) => setScrubNurseSearchTerm(value || '')}
                      onBlur={field.onBlur}
                      disabled={isLoadingProviders && scrubNurseOptions.length === 0}
                    />
                  )}
                />
              </Column>

              <Column lg={4} md={4} sm={4}>
                <Controller
                  name="typeOfPremedication"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      id="anaesthetic-premedication"
                      labelText={t('typeOfPremedication', 'Type of premedication')}
                      {...field}
                    />
                  )}
                />
              </Column>
              <Column lg={4} md={4} sm={4}>
                <Controller
                  name="effect"
                  control={control}
                  render={({ field }) => (
                    <TextInput id="anaesthetic-effect" labelText={t('effect', 'Effect')} {...field} />
                  )}
                />
              </Column>
              <Column lg={4} md={4} sm={4}>
                <Controller
                  name="timeGiven"
                  control={control}
                  rules={{ required: t('timeGivenRequired', 'Time given is required') }}
                  render={({ field, fieldState }) => (
                    <TimePickerDropdown
                      id="anaesthetic-time-given"
                      labelText={t('timeGiven', 'Time given')}
                      value={field.value || ''}
                      onChange={field.onChange}
                      invalid={!!fieldState.error}
                      invalidText={fieldState.error?.message}
                      existingTimeEntries={existingTimeEntries}
                    />
                  )}
                />
              </Column>
              <Column lg={4} md={4} sm={4}>
                <Controller
                  name="inductionAirway"
                  control={control}
                  render={({ field }) => (
                    <Select
                      id="anaesthetic-induction-airway"
                      labelText={t('inductionAirway', 'Induction (Airway)')}
                      {...field}>
                      {INDUCTION_AIRWAY_OPTIONS.map((option) => (
                        <SelectItem key={option.value || 'empty'} value={option.value} text={option.label} />
                      ))}
                    </Select>
                  )}
                />
              </Column>

              <Column lg={4} md={4} sm={4}>
                <Controller
                  name="blindOrUnderMask"
                  control={control}
                  render={({ field }) => (
                    <Select
                      id="anaesthetic-blind-under-mask"
                      labelText={t('blindOrUnderMask', 'Blind / Under Mask')}
                      {...field}>
                      {INDUCTION_TECHNIQUE_OPTIONS.map((option) => (
                        <SelectItem key={option.value || 'empty'} value={option.value} text={option.label} />
                      ))}
                    </Select>
                  )}
                />
              </Column>
              <Column lg={4} md={4} sm={4}>
                <Controller
                  name="ifIv"
                  control={control}
                  render={({ field }) => (
                    <Select id="anaesthetic-if-iv" labelText={t('ifIv', 'If IV')} {...field}>
                      {IF_IV_SITE_OPTIONS.map((option) => (
                        <SelectItem key={option.value || 'empty'} value={option.value} text={option.label} />
                      ))}
                    </Select>
                  )}
                />
              </Column>

              <Column lg={16} md={8} sm={4}>
                <Controller
                  name="anaestheticNotes"
                  control={control}
                  render={({ field }) => (
                    <TextArea
                      id="anaesthetic-notes"
                      labelText={t('anaestheticNotes', 'Anaesthetic notes')}
                      rows={4}
                      {...field}
                    />
                  )}
                />
              </Column>
            </Grid>

            <div className={styles.anaestheticFormActions}>
              <p className={styles.anaestheticFormHint}>
                {(isLoadingDefaults || isLoadingProviders || isLoadingProcedures) &&
                  t('anaestheticLoadingDefaults', 'Loading encounter context, providers and procedures...')}
              </p>
              <Button type="submit" kind="primary" disabled={isSaving || isSubmitting}>
                {isSaving ? t('saving', 'Saving...') : t('saveAnaestheticRecord', 'Save anaesthetic record')}
              </Button>
            </div>
          </Form>
        )}

        {activeView === 'table' && (
          <div className={styles.anaestheticRecordsSection}>
            <div className={styles.anaestheticRecordsToolbar}>
              <h4 className={styles.anaestheticRecordsTitle}>
                {t('savedAnaestheticRecords', 'Saved anaesthetic records')}
              </h4>
              <p className={styles.anaestheticRecordsMeta}>
                {t('savedRecordCount', '{{count}} saved record(s)', {
                  count: backendRecords.length,
                })}
              </p>
            </div>

            <div className={styles.anaestheticRecordsTableWrapper}>
              {backendRecords.length > 0 ? (
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>{t('date', 'Date')}</th>
                      <th>{t('timeGiven', 'Time')}</th>
                      <th>{t('diagnosis', 'Diagnosis')}</th>
                      <th>{t('anaesthetist', 'Anaesthetist')}</th>
                      <th>{t('actions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backendRecords.map((record) => (
                      <tr key={record.id}>
                        <td>{record.encounterDate || '-'}</td>
                        <td>{record.timeGiven || '-'}</td>
                        <td>{record.diagnosis || '-'}</td>
                        <td>{record.anaesthetist || '-'}</td>
                        <td className={styles.anaestheticRecordActions}>
                          <Button kind="ghost" size="sm" onClick={() => setSelectedRecord(record)}>
                            {t('view', 'View')}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className={styles.anaestheticRecordsEmpty}>
                  {t('noSavedAnaestheticRecords', 'No saved anaesthetic records found')}
                </p>
              )}
            </div>
          </div>
        )}

        {selectedRecord && (
          <Modal
            open
            modalHeading={t('anaestheticRecordDetail', 'Anaesthetic record detail')}
            passiveModal
            onRequestClose={() => setSelectedRecord(null)}
            size="lg">
            <div className={styles.anaestheticDetailGrid}>
              <DetailItem label={t('encounterDate', 'Encounter Date')} value={selectedRecord.encounterDate} />
              <DetailItem label={t('timeGiven', 'Time given')} value={selectedRecord.timeGiven} />
              <DetailItem label={t('diagnosis', 'Diagnosis (ICD 11)')} value={selectedRecord.diagnosis} />
              <DetailItem label={t('operation', 'Operation')} value={selectedRecord.operation} />
              <DetailItem label={t('anaesthetist', 'Anaesthetist')} value={selectedRecord.anaesthetist} />
              <DetailItem label={t('surgeon', 'Surgeon')} value={selectedRecord.surgeon} />
              <DetailItem label={t('scrubNurse', 'Scrub Nurse')} value={selectedRecord.scrubNurse} />
              <DetailItem
                label={t('typeOfPremedication', 'Type of premedication')}
                value={selectedRecord.typeOfPremedication}
              />
              <DetailItem label={t('effect', 'Effect')} value={selectedRecord.effect} />
              <DetailItem label={t('inductionAirway', 'Induction (Airway)')} value={selectedRecord.inductionAirway} />
              <DetailItem label={t('blindOrUnderMask', 'Blind / Under Mask')} value={selectedRecord.blindOrUnderMask} />
              <DetailItem label={t('ifIv', 'If IV')} value={selectedRecord.ifIv} />
              <DetailItem
                label={t('anaestheticNotes', 'Anaesthetic notes')}
                value={selectedRecord.anaestheticNotes}
                fullWidth
              />
            </div>
          </Modal>
        )}
      </div>
    </section>
  );
};

function DetailItem({ label, value, fullWidth }: { label: string; value?: string; fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? styles.anaestheticDetailItemFull : styles.anaestheticDetailItem}>
      <span className={styles.anaestheticDetailLabel}>{label}</span>
      <span className={styles.anaestheticDetailValue}>{value || '-'}</span>
    </div>
  );
}

export default AnaestheticRecordForm;
