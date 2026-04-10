import React, { useCallback, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useSWRConfig } from 'swr';
import {
  Button,
  ButtonSet,
  ContentSwitcher,
  Form,
  FormGroup,
  InlineLoading,
  InlineNotification,
  RadioButton,
  RadioButtonGroup,
  Row,
  Stack,
  Switch,
} from '@carbon/react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Extension,
  ExtensionSlot,
  OpenmrsFetchError,
  saveVisit,
  showSnackbar,
  updateVisit,
  useConfig,
  useConnectivity,
  useEmrConfiguration,
  useLayoutType,
  useVisit,
  Workspace2,
  type AssignedExtension,
  type NewVisitPayload,
  type Visit,
  type Workspace2DefinitionProps,
} from '@openmrs/esm-framework';
import {
  createOfflineVisitForPatient,
  invalidateCurrentVisit,
  invalidateVisitAndEncounterData,
  useActivePatientEnrollment,
} from '@openmrs/esm-patient-common-lib';
import { MemoizedRecommendedVisitType } from './recommended-visit-type.component';
import {
  convertToDate,
  createVisitAttribute,
  deleteVisitAttribute,
  extractErrorMessagesFromResponse,
  updateVisitAttribute,
  useAllowOverlappingVisits,
  useConditionalVisitTypes,
  useEarliestAllowedVisitStartDate,
  useVisitFormCallbacks,
  useVisitFormSchemaAndDefaultValues,
  visitStatuses,
  type ErrorObject,
  type VisitFormCallbacks,
  type VisitFormData,
} from './visit-form.resource';
import { useVisitAttributeTypes } from '../hooks/useVisitAttributeType';
import BaseVisitType from './base-visit-type.component';
import LocationSelector from './location-selector.component';
import VisitDateTimeSection from './visit-date-time.component';
import styles from './visit-form.scss';
import { ExpressWorkflowConfig } from '../../../../config-schema';

interface VisitAttribute {
  attributeType: string;
  value: string;
}

export interface ExtraVisitInfo {
  handleCreateExtraVisitInfo?: () => void | Promise<void>;
  attributes?: Array<VisitAttribute>;
}

export interface ExportedVisitFormProps {
  openedFrom: string;
  showPatientHeader?: boolean;
  onVisitStarted?: (visit: Visit) => void;
  patient: fhir.Patient;
  patientUuid: string;
  visitContext: Visit | null;
}

interface VisitAttributeResource {
  attributeType: { uuid: string; display: string };
  uuid: string;
  value: unknown;
}

const ExportedVisitForm: React.FC<Workspace2DefinitionProps<ExportedVisitFormProps, {}, {}>> = ({
  closeWorkspace,
  workspaceProps,
}) => {
  const {
    openedFrom = '',
    showPatientHeader = false,
    onVisitStarted,
    patient,
    patientUuid = '',
    visitContext: visitToEdit = null,
  } = workspaceProps ?? {};

  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const isOnline = useConnectivity();
  const config = useConfig<ExpressWorkflowConfig>();
  const { emrConfiguration } = useEmrConfiguration();
  const [visitTypeContentSwitcherIndex, setVisitTypeContentSwitcherIndex] = useState(
    config?.showRecommendedVisitTypeTab ? 0 : 1,
  );
  const visitHeaderSlotState = useMemo(() => ({ patientUuid, patient }), [patientUuid, patient]);
  const { activePatientEnrollment, isLoading } = useActivePatientEnrollment(patientUuid);
  const { activeVisit, isLoading: isLoadingVisit } = useVisit(patientUuid);
  const { allowOverlappingVisits, isLoading: isLoadingOverlapSetting } = useAllowOverlappingVisits();
  const { mutate: globalMutate } = useSWRConfig();
  const allVisitTypes = useConditionalVisitTypes();
  const { earliestAllowedStartDate, isLoading: isLoadingBirthdateCheck } =
    useEarliestAllowedVisitStartDate(patientUuid);

  const [errorFetchingResources, setErrorFetchingResources] = useState<{
    blockSavingForm: boolean;
  } | null>(null);

  const setErrorFetchingResourcesAdapter = useCallback((action: React.SetStateAction<{ blockSavingForm: boolean }>) => {
    setErrorFetchingResources((prev) => {
      const prevNonNull = prev ?? { blockSavingForm: false };
      return typeof action === 'function' ? action(prevNonNull) : action;
    });
  }, []) as React.Dispatch<React.SetStateAction<{ blockSavingForm: boolean }>>;

  const { visitAttributeTypes } = useVisitAttributeTypes();
  const [visitFormCallbacks, setVisitFormCallbacks] = useVisitFormCallbacks();
  const [extraVisitInfo, setExtraVisitInfo] = useState<ExtraVisitInfo | null>(null);

  const { visitFormSchema, defaultValues, firstEncounterDateTime, lastEncounterDateTime } =
    useVisitFormSchemaAndDefaultValues(visitToEdit ?? undefined, earliestAllowedStartDate);

  const methods = useForm<VisitFormData>({
    mode: 'all',
    resolver: zodResolver(visitFormSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    control,
    getValues,
    formState: { errors, isDirty, isSubmitting },
    reset,
  } = methods;

  const visitStatus = useWatch({ control, name: 'visitStatus' });
  const hasActiveVisitConflict = !visitToEdit && visitStatus !== 'past' && !!activeVisit && !allowOverlappingVisits;

  useEffect(() => {
    reset(defaultValues, {
      keepDirty: true,
      keepDirtyValues: true,
      keepErrors: true,
      keepTouched: true,
    });
  }, [defaultValues, reset]);

  const getErrorDescription = useCallback(
    (error: unknown) => {
      if (OpenmrsFetchError && error instanceof OpenmrsFetchError) {
        return typeof error.responseBody === 'string'
          ? error.responseBody
          : extractErrorMessagesFromResponse(error.responseBody as ErrorObject, t);
      }
      return (error as Error)?.message;
    },
    [t],
  );

  const handleVisitAttributes = useCallback(
    (visitAttributes: { [p: string]: string }, visitUuid: string) => {
      const existingVisitAttributeTypes =
        visitToEdit?.attributes?.map((attribute) => attribute.attributeType.uuid) || [];
      const promises: Array<Promise<unknown>> = [];

      for (const [attributeType, value] of Object.entries(visitAttributes)) {
        if (attributeType && existingVisitAttributeTypes.includes(attributeType)) {
          const attributeToEdit = (visitToEdit?.attributes as Array<VisitAttributeResource> | undefined)?.find(
            (attr) => attr.attributeType.uuid === attributeType,
          );
          if (attributeToEdit) {
            const isSameValue =
              typeof attributeToEdit.value === 'object' &&
              attributeToEdit.value !== null &&
              'uuid' in (attributeToEdit.value as object)
                ? (attributeToEdit.value as { uuid: string }).uuid === value
                : attributeToEdit.value === value;
            if (isSameValue) {
              continue;
            }
            if (value) {
              promises.push(
                updateVisitAttribute(visitUuid, attributeToEdit.uuid, value).catch((error) => {
                  showSnackbar({
                    title: t('errorUpdatingVisitAttribute', 'Error updating the {{attributeName}} visit attribute', {
                      attributeName: attributeToEdit.attributeType.display,
                    }),
                    kind: 'error',
                    isLowContrast: false,
                    subtitle: getErrorDescription(error),
                  });
                  return Promise.reject(error);
                }),
              );
            } else {
              promises.push(
                deleteVisitAttribute(visitUuid, attributeToEdit.uuid).catch((error) => {
                  showSnackbar({
                    title: t('errorDeletingVisitAttribute', 'Error deleting the {{attributeName}} visit attribute', {
                      attributeName: attributeToEdit.attributeType.display,
                    }),
                    kind: 'error',
                    isLowContrast: false,
                    subtitle: getErrorDescription(error),
                  });
                  return Promise.reject(error);
                }),
              );
            }
          }
        } else {
          if (value) {
            promises.push(
              createVisitAttribute(visitUuid, attributeType, value).catch((error) => {
                showSnackbar({
                  title: t('errorCreatingVisitAttribute', 'Error creating the {{attributeName}} visit attribute', {
                    attributeName: visitAttributeTypes?.find((type) => type.uuid === attributeType)?.display,
                  }),
                  kind: 'error',
                  isLowContrast: false,
                  subtitle: getErrorDescription(error),
                });
                return Promise.reject(error);
              }),
            );
          }
        }
      }
      return Promise.all(promises);
    },
    [getErrorDescription, visitToEdit, t, visitAttributeTypes],
  );

  const onSubmit = useCallback(
    async (data: VisitFormData) => {
      const {
        visitStatus,
        visitStartTimeFormat,
        visitStartDate,
        visitLocation,
        visitStartTime,
        visitType,
        visitAttributes,
        visitStopDate,
        visitStopTime,
        visitStopTimeFormat,
      } = data;

      const { handleCreateExtraVisitInfo, attributes: extraAttributes } = extraVisitInfo ?? {};
      const hasStartTime = ['ongoing', 'past'].includes(visitStatus);
      const hasStopTime = 'past' === visitStatus;
      const startDatetime = convertToDate(visitStartDate, visitStartTime, visitStartTimeFormat);
      const stopDatetime = convertToDate(visitStopDate, visitStopTime, visitStopTimeFormat);

      const formAttributes = !visitToEdit
        ? Object.entries(visitAttributes)
            .filter(([, value]) => value)
            .map(([attributeType, value]) => ({ attributeType, value }))
        : [];

      const formAttributeTypes = new Set(formAttributes.map((attr) => attr.attributeType));
      const deduplicatedExtraAttributes = (extraAttributes ?? []).filter(
        (attr: VisitAttribute) => attr?.attributeType && !formAttributeTypes.has(attr.attributeType),
      );
      const inlineAttributes = !visitToEdit
        ? [...formAttributes, ...deduplicatedExtraAttributes].filter(
            (attr: VisitAttribute) => attr?.attributeType?.length > 0 && attr?.value?.length > 0,
          )
        : [];

      const locationUuid = visitLocation?.uuid ?? '';
      const payload: NewVisitPayload = {
        visitType,
        location: locationUuid,
        startDatetime: (hasStartTime ? startDatetime : null) as Date,
        stopDatetime: (hasStopTime ? stopDatetime : null) as Date,
        ...(!visitToEdit && { patient: patientUuid }),
        ...(inlineAttributes.length > 0 && { attributes: inlineAttributes }),
      };

      const abortController = new AbortController();
      if (isOnline) {
        const visitRequest = visitToEdit?.uuid
          ? updateVisit(visitToEdit.uuid, payload, abortController)
          : saveVisit(payload, abortController);

        await visitRequest
          .then((response) => {
            showSnackbar({
              isLowContrast: true,
              kind: 'success',
              subtitle: !visitToEdit
                ? t('visitStartedSuccessfully', '{{visit}} started successfully', {
                    visit: response?.data?.visitType?.display ?? t('visit', 'Visit'),
                  })
                : t('visitDetailsUpdatedSuccessfully', '{{visit}} updated successfully', {
                    visit: response?.data?.visitType?.display ?? t('pastVisit', 'Past visit'),
                  }),
              title: !visitToEdit
                ? t('visitStarted', 'Visit started')
                : t('visitDetailsUpdated', 'Visit details updated'),
            });
            return response;
          })
          .catch((error) => {
            showSnackbar({
              title: !visitToEdit
                ? t('startVisitError', 'Error starting visit')
                : t('errorUpdatingVisitDetails', 'Error updating visit details'),
              kind: 'error',
              isLowContrast: false,
              subtitle: getErrorDescription(error),
            });
            return Promise.reject(error);
          })
          .then(async (response) => {
            const visit = response.data;
            invalidateVisitAndEncounterData(globalMutate as any, patientUuid);
            invalidateCurrentVisit(globalMutate as any, patientUuid);

            const visitAttributesRequest = visitToEdit
              ? handleVisitAttributes(visitAttributes, response.data.uuid).then((visitAttributesResponses) => {
                  if (visitAttributesResponses.length > 0) {
                    showSnackbar({
                      isLowContrast: true,
                      kind: 'success',
                      title: t(
                        'additionalVisitInformationUpdatedSuccessfully',
                        'Additional visit information updated successfully',
                      ),
                    });
                  }
                })
              : Promise.resolve();

            const onVisitCreatedOrUpdatedRequests = [...visitFormCallbacks.values()].map((callbacks) =>
              callbacks.onVisitCreatedOrUpdated(visit),
            );

            await Promise.all([visitAttributesRequest, ...onVisitCreatedOrUpdatedRequests]);
            await handleCreateExtraVisitInfo?.();
            await closeWorkspace({ discardUnsavedChanges: true });
            onVisitStarted?.(visit);
          })
          .catch(() => {});
      } else {
        await createOfflineVisitForPatient(
          patientUuid,
          locationUuid,
          config.offlineVisitTypeUuid,
          payload.startDatetime,
        ).then(
          async (visit) => {
            invalidateVisitAndEncounterData(globalMutate as any, patientUuid);
            invalidateCurrentVisit(globalMutate as any, patientUuid);
            showSnackbar({
              isLowContrast: true,
              kind: 'success',
              subtitle: t('visitStartedSuccessfully', '{{visit}} started successfully', {
                visit: t('offlineVisit', 'Offline Visit'),
              }),
              title: t('visitStarted', 'Visit started'),
            });
            await closeWorkspace({ discardUnsavedChanges: true });
            onVisitStarted?.(visit);
          },
          (error: Error) => {
            showSnackbar({
              title: t('startVisitError', 'Error starting visit'),
              kind: 'error',
              isLowContrast: false,
              subtitle: error?.message,
            });
          },
        );
      }
    },
    [
      closeWorkspace,
      config.offlineVisitTypeUuid,
      extraVisitInfo,
      getErrorDescription,
      globalMutate,
      handleVisitAttributes,
      isOnline,
      onVisitStarted,
      patientUuid,
      t,
      visitFormCallbacks,
      visitToEdit,
    ],
  );

  if (!workspaceProps) {
    return null;
  }

  return (
    <Workspace2
      title={visitToEdit ? t('editVisit', 'Edit visit') : t('startVisitWorkspaceTitle', 'Start a visit')}
      hasUnsavedChanges={isDirty}>
      <FormProvider {...methods}>
        <Form className={styles.form} onSubmit={handleSubmit(onSubmit)} data-openmrs-role="Start Visit Form">
          {showPatientHeader && patient && (
            <ExtensionSlot name="patient-header-slot" state={{ patient, patientUuid, hideActionsOverflow: true }} />
          )}
          {errorFetchingResources && (
            <InlineNotification
              kind={errorFetchingResources?.blockSavingForm ? 'error' : 'warning'}
              lowContrast
              className={styles.inlineNotification}
              title={t('partOfFormDidntLoad', 'Part of the form did not load')}
              subtitle={t('refreshToTryAgain', 'Please refresh to try again')}
            />
          )}
          <div>
            {isTablet && (
              <Row className={styles.headerGridRow}>
                <ExtensionSlot
                  name="visit-form-header-slot"
                  className={styles.dataGridRow}
                  state={visitHeaderSlotState}
                />
              </Row>
            )}
            <Stack gap={1} className={styles.container}>
              <section>
                <FormGroup legendText={t('theVisitIs', 'The visit is')}>
                  <Controller
                    name="visitStatus"
                    control={control}
                    render={({ field: { onChange, value } }) => {
                      const validVisitStatuses = visitToEdit ? ['ongoing', 'past'] : visitStatuses;
                      const idx = validVisitStatuses.indexOf(value);
                      const selectedIndex = idx >= 0 ? idx : 0;
                      return visitToEdit ? (
                        <ContentSwitcher
                          selectedIndex={selectedIndex}
                          onChange={({ name }) => onChange(name)}
                          size="md">
                          <Switch name="ongoing">{t('ongoing', 'Ongoing')}</Switch>
                          <Switch name="past">{t('ended', 'Ended')}</Switch>
                        </ContentSwitcher>
                      ) : (
                        <ContentSwitcher
                          selectedIndex={selectedIndex}
                          onChange={({ name }) => onChange(name)}
                          size="md">
                          <Switch name="new">{t('new', 'New')}</Switch>
                          <Switch name="ongoing">{t('ongoing', 'Ongoing')}</Switch>
                          <Switch name="past">{t('inThePast', 'In the past')}</Switch>
                        </ContentSwitcher>
                      );
                    }}
                  />
                </FormGroup>
              </section>
              {hasActiveVisitConflict && (
                <InlineNotification
                  className={styles.inlineNotification}
                  kind="info"
                  lowContrast
                  title={t('activeVisitExists', 'This patient already has an active visit')}
                  subtitle={t('endActiveVisitFirst', 'You must end the current visit before starting a new one.')}
                />
              )}
              {!hasActiveVisitConflict && (
                <>
                  <VisitDateTimeSection
                    {...{ control, firstEncounterDateTime, lastEncounterDateTime }}
                    earliestStartDate={earliestAllowedStartDate?.getTime()}
                  />
                  {config.showUpcomingAppointments && (
                    <section>
                      <div className={styles.sectionField}>
                        <VisitFormExtensionSlot
                          name="visit-form-top-slot"
                          patientUuid={patientUuid}
                          visitFormOpenedFrom={openedFrom}
                          setVisitFormCallbacks={setVisitFormCallbacks}
                        />
                      </div>
                    </section>
                  )}
                  <LocationSelector control={control} />
                  {config.showRecommendedVisitTypeTab && (
                    <section>
                      <h1 className={styles.sectionTitle}>{t('program', 'Program')}</h1>
                      <FormGroup
                        legendText={t('selectProgramType', 'Select program type')}
                        className={styles.sectionField}>
                        <Controller
                          name="programType"
                          control={control}
                          render={({ field: { onChange } }) => (
                            <RadioButtonGroup
                              orientation="vertical"
                              onChange={(selection: string | number | undefined) =>
                                onChange(
                                  activePatientEnrollment.find(
                                    ({ program }) => program.uuid === String(selection ?? ''),
                                  )?.uuid,
                                )
                              }
                              name="program-type-radio-group">
                              {activePatientEnrollment.map(({ uuid, display, program }) => (
                                <RadioButton
                                  key={uuid}
                                  className={styles.radioButton}
                                  id={uuid}
                                  labelText={display}
                                  value={program.uuid}
                                />
                              ))}
                            </RadioButtonGroup>
                          )}
                        />
                      </FormGroup>
                    </section>
                  )}
                  {!emrConfiguration?.atFacilityVisitType && (
                    <section>
                      <h1 className={styles.sectionTitle}>{t('visitType_title', 'Visit Type')}</h1>
                      <div className={styles.sectionField}>
                        {config.showRecommendedVisitTypeTab ? (
                          <>
                            <ContentSwitcher
                              selectedIndex={visitTypeContentSwitcherIndex}
                              onChange={({ index }) => setVisitTypeContentSwitcherIndex(index ?? 0)}
                              size="md">
                              <Switch name="recommended">{t('recommended', 'Recommended')}</Switch>
                              <Switch name="all">{t('all', 'All')}</Switch>
                            </ContentSwitcher>
                            {visitTypeContentSwitcherIndex === 0 &&
                              !isLoading &&
                              (() => {
                                const enrollment = activePatientEnrollment?.find(
                                  ({ program }) => program.uuid === getValues('programType'),
                                );
                                const locationUuid = getValues('visitLocation')?.uuid;
                                return enrollment && locationUuid ? (
                                  <MemoizedRecommendedVisitType
                                    patientUuid={patientUuid}
                                    patientProgramEnrollment={enrollment}
                                    locationUuid={locationUuid}
                                  />
                                ) : null;
                              })()}
                            {visitTypeContentSwitcherIndex === 1 && <BaseVisitType visitTypes={allVisitTypes} />}
                          </>
                        ) : (
                          <BaseVisitType visitTypes={allVisitTypes} />
                        )}
                      </div>
                      {errors?.visitType && (
                        <section>
                          <div className={styles.sectionField}>
                            <InlineNotification
                              role="alert"
                              style={{ margin: '0', minWidth: '100%' }}
                              kind="error"
                              lowContrast={true}
                              title={t('missingVisitType', 'Missing visit type')}
                              subtitle={t('selectVisitType', 'Please select a Visit Type')}
                            />
                          </div>
                        </section>
                      )}
                      <ExtensionSlot state={{ patientUuid, setExtraVisitInfo }} name="extra-visit-attribute-slot" />
                    </section>
                  )}
                  <section>
                    <div className={styles.sectionField}>
                      <VisitFormExtensionSlot
                        name="visit-form-bottom-slot"
                        patientUuid={patientUuid}
                        visitFormOpenedFrom={openedFrom}
                        setVisitFormCallbacks={setVisitFormCallbacks}
                      />
                    </div>
                  </section>
                </>
              )}
            </Stack>
          </div>
          <ButtonSet
            className={classNames(styles.buttonSet, {
              [styles.tablet]: isTablet,
              [styles.desktop]: !isTablet,
            })}>
            <Button className={styles.button} kind="secondary" onClick={() => closeWorkspace()}>
              {t('discard', 'Discard')}
            </Button>
            <Button
              className={styles.button}
              disabled={
                isSubmitting ||
                isLoadingVisit ||
                isLoadingBirthdateCheck ||
                isLoadingOverlapSetting ||
                errorFetchingResources?.blockSavingForm ||
                hasActiveVisitConflict
              }
              kind="primary"
              type="submit">
              {isSubmitting ? (
                <InlineLoading
                  className={styles.spinner}
                  description={
                    visitToEdit
                      ? t('updatingVisit', 'Updating visit') + '...'
                      : t('startingVisit', 'Starting visit') + '...'
                  }
                />
              ) : (
                <span>{visitToEdit ? t('updateVisit', 'Update visit') : t('startVisit', 'Start visit')}</span>
              )}
            </Button>
          </ButtonSet>
        </Form>
      </FormProvider>
    </Workspace2>
  );
};

interface VisitFormExtensionSlotProps {
  name: string;
  patientUuid: string;
  visitFormOpenedFrom: string;
  setVisitFormCallbacks: React.Dispatch<React.SetStateAction<Map<string, VisitFormCallbacks>>>;
}

type VisitFormExtensionState = {
  patientUuid: string;
  setVisitFormCallbacks: (callbacks: VisitFormCallbacks) => void;
  visitFormOpenedFrom: string;
  patientChartConfig: ExpressWorkflowConfig;
};

const VisitFormExtensionSlot: React.FC<VisitFormExtensionSlotProps> = React.memo(
  ({ name, patientUuid, visitFormOpenedFrom, setVisitFormCallbacks }) => {
    const config = useConfig<ExpressWorkflowConfig>();
    return (
      <ExtensionSlot name={name}>
        {(extension: AssignedExtension) => {
          const state: VisitFormExtensionState = {
            patientUuid,
            setVisitFormCallbacks: (callbacks: VisitFormCallbacks): void => {
              setVisitFormCallbacks((old) => new Map(old).set(extension.id, callbacks));
            },
            visitFormOpenedFrom,
            patientChartConfig: config,
          };
          return <Extension state={state} />;
        }}
      </ExtensionSlot>
    );
  },
);

export default ExportedVisitForm;
