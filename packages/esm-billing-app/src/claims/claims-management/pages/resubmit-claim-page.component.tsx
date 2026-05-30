import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  ButtonSet,
  Form,
  InlineLoading,
  InlineNotification,
  OverflowMenu,
  OverflowMenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from '@carbon/react';
import { useLaunchWorkspaceRequiringVisit } from '@openmrs/esm-patient-common-lib';
import { Add, ArrowLeft, Document, Stethoscope } from '@carbon/react/icons';
import {
  launchWorkspace2,
  showModal,
  showSnackbar,
  navigate,
  ExtensionSlot,
  usePatient,
  useConfig,
  CardHeader,
} from '@openmrs/esm-framework';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router-dom';
import ClaimsSupportingDocumentsInput from '../../dashboard/form/claims-supporting-documents-inputs.form';
import { useClaimPreview, useVisit, uploadAttachments } from '../../dashboard/form/claims-form.resource';
import {
  getClaimPayerPreview,
  submitInsuranceClaim,
  resubmitInsuranceClaimLine,
} from '../table/claim-summary-modal/claim.resource';
import { parseExternalApiErrors } from '../../utils';
import styles from './resubmit-claim-page.scss';
import { spaBasePath } from '../../../constants';
import { BillingConfig } from '../../../config-schema';

type ResubmitClaimFormValues = {
  packages: Array<string>;
  interventions: Array<string>;
  supportingDocuments: Array<any>;
};

type InvoiceLine = {
  invoiceUuid: string;
  invoiceNumber: string;
  lineItemId: string;
  item: string;
  quantity: number;
  unitPrice: string;
  total: string;
  status: string;
};

type PayerPreview = {
  workflowState?: string | null;
  workflowDisplayName?: string | null;
  created?: string | null;
  claimNotes?: Array<any>;
  trackingNumber?: string | null;
};

type ClaimDiagnosis = {
  claim?: string;
  diagnosis?: string;
  recorded_on?: string;
  patient_number?: string;
  diagnosis_name?: string;
  diagnosis_code?: string;
  is_flagged_diagnosis?: boolean;
  intervention_code?: string;
};

const ResubmitClaimPage: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { patientUuid: routePatientUuid, consentToken } = useParams<{ patientUuid?: string; consentToken?: string }>();
  const { patient, isLoading: isLoadingPatient, error: patientError } = usePatient(routePatientUuid);

  const state = location.state as {
    payerData?: any;
    autoResubmit?: boolean;
    mutate?: () => void;
  } | null;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payerPreview, setPayerPreview] = useState<PayerPreview | null>(null);
  const [isPayerPreviewLoading, setIsPayerPreviewLoading] = useState(false);
  const mutate = state?.mutate;
  const autoResubmit = state?.autoResubmit ?? false;
  const payerData = state?.payerData;

  const { claimPreview, isLoading: isPreviewLoading, error: previewError } = useClaimPreview(consentToken);
  const claim = claimPreview ?? null;
  const patientUuid = claim?.patient?.uuid ?? claim?.patient_uuid ?? claim?.patientUuid ?? '';

  const { visits, isLoading: isVisitLoading } = useVisit(patientUuid || undefined);

  const form = useForm<ResubmitClaimFormValues>({
    defaultValues: {
      packages: [],
      interventions: [],
      supportingDocuments: [],
    },
  });

  const defaultInterventions = useMemo(
    () =>
      (claimPreview?.interventions ?? claim?.interventions ?? claim?.interventionDetails ?? [])
        .map((intervention: any) =>
          String(intervention?.intervention_code ?? intervention?.interventionCode ?? intervention?.code ?? '').trim(),
        )
        .filter(Boolean),
    [claimPreview],
  );

  const defaultPackages = useMemo(
    () =>
      (claimPreview?.packages ?? claim?.packages ?? [])
        .map((subBenefit: any) => String(subBenefit?.code ?? subBenefit ?? '').trim())
        .filter(Boolean),
    [claimPreview],
  );

  useEffect(() => {
    form.reset({
      packages: defaultPackages,
      interventions: defaultInterventions,
      supportingDocuments: [],
    });
  }, [routePatientUuid, claimPreview?.authorization_code, defaultInterventions, defaultPackages, form]);

  const isInpatient =
    String(claimPreview?.service_type ?? claim?.service_type ?? claim?.serviceType ?? '').toUpperCase() === 'INPATIENT';
  const authorizationCode = String(claimPreview?.authorization_code ?? '');
  const receiptNumber = String(
    claimPreview?.invoices?.[0]?.invoice_number ??
      claimPreview?.receiptNumber ??
      claimPreview?.invoiceNumber ??
      claimPreview?.identifier ??
      claimPreview?.uuid ??
      '',
  );

  const invoices = useMemo(() => {
    const rawInvoices = claimPreview?.invoices ?? [];

    return (Array.isArray(rawInvoices) ? rawInvoices : []).map((invoice: any, invoiceIndex: number) => ({
      uuid: String(invoice?.uuid ?? invoice?.id ?? `invoice-${invoiceIndex}`),
      invoiceNumber: String(invoice?.invoice_number ?? invoice?.invoiceNumber ?? invoice?.id ?? invoiceIndex + 1),
      provider: invoice?.provider_name ?? invoice?.provider ?? '-',
      scheme: invoice?.scheme_name ?? invoice?.scheme ?? '-',
      status: invoice?.workflow_state ?? invoice?.dispatch_status ?? claimPreview?.status ?? '-',
      lines: Array.isArray(invoice?.lines)
        ? invoice.lines
        : Array.isArray(invoice?.lineItems)
        ? invoice.lineItems
        : Array.isArray(invoice?.items)
        ? invoice.items
        : [],
    }));
  }, [claimPreview]);

  const lineItems: InvoiceLine[] = useMemo(
    () =>
      invoices.flatMap((invoice) =>
        invoice.lines.map((lineItem: any, lineIndex: number) => ({
          invoiceUuid: invoice.uuid,
          invoiceNumber: invoice.invoiceNumber,
          lineItemId: String(lineItem?.uuid ?? lineItem?.id ?? `${invoice.uuid}-line-${lineIndex}`),
          item: String(lineItem?.display ?? lineItem?.item_name ?? lineItem?.item ?? lineItem?.billableService ?? '-'),
          quantity: Number(lineItem?.quantity ?? lineItem?.qty ?? 1),
          unitPrice: String(lineItem?.unit_price ?? lineItem?.unitPrice ?? lineItem?.price ?? 0),
          total: String(
            Number(lineItem?.unit_price ?? lineItem?.unitPrice ?? lineItem?.price ?? 0) *
              Number(lineItem?.quantity ?? lineItem?.qty ?? 1),
          ),
          status: String(lineItem?.workflow_state ?? lineItem?.paymentStatus ?? lineItem?.status ?? '-'),
        })),
      ),
    [invoices],
  );

  const attachments = useMemo(() => claimPreview?.claim_attachments ?? [], [claimPreview]);
  const claimDoctors = useMemo(
    () => (claimPreview?.claim_doctors ?? []) as Array<{ id: string; claim: string; doctor_name: string }>,
    [claimPreview],
  );
  const feedbackNotes = useMemo(() => claimPreview?.claimNotes ?? [], [claimPreview]);
  const diagnoses = useMemo(
    () => (claimPreview?.claim_diagnoses ?? claimPreview?.diagnoses ?? []) as Array<ClaimDiagnosis>,
    [claimPreview],
  );
  const workflowState =
    claimPreview?.workflowDisplayName ?? claimPreview?.workflowState ?? claimPreview?.workflow_state ?? '—';

  useEffect(() => {
    const abortController = new AbortController();

    const loadPayerPreview = async () => {
      const invoiceNumber = claimPreview?.invoices?.[0]?.invoice_number;

      if (!invoiceNumber) {
        setPayerPreview(null);
        return;
      }

      setIsPayerPreviewLoading(true);

      try {
        const response = await getClaimPayerPreview(invoiceNumber);

        if (abortController.signal.aborted) {
          return;
        }
        setPayerPreview(response?.data ?? null);
      } catch (err) {
        if (abortController.signal.aborted) {
          return;
        }
        setPayerPreview(null);
      } finally {
        if (!abortController.signal.aborted) {
          setIsPayerPreviewLoading(false);
        }
      }
    };

    loadPayerPreview();

    return () => {
      abortController.abort();
    };
  }, [claimPreview?.invoices]);

  const handleLaunchIntervention = (
    operationType: 'add' | 'switch' | 'retire' | 'restore',
    currentInterventionCode = '',
    currentInterventionName = '',
    currentPackageCode = '',
  ) => {
    const titles: Record<'add' | 'switch' | 'retire' | 'restore', string> = {
      add: t('addIntervention', 'Add Intervention'),
      switch: t('switchIntervention', 'Switch Intervention'),
      retire: t('removeIntervention', 'Remove Intervention'),
      restore: t('restoreIntervention', 'Restore Intervention'),
    };

    launchWorkspace2('preauth-operation-workspace', {
      workspaceTitle: titles[operationType],
      operationType,
      authorizationCode,
      currentInterventionCode,
      currentInterventionName,
      currentPackageCode,
      patientUuid: routePatientUuid || null,
      isElective: false,
      mutate: () => {
        mutate?.();
      },
    });
  };

  const handleLaunchBillItemWorkspace = () => {
    launchWorkspace2('billing-form', {
      workspaceTitle: t('billingForm', 'Billing Form'),
      patientUuid: routePatientUuid || null,
      patient: claimPreview?.patient,
      mutate: () => {
        mutate?.();
      },
    });
  };
  const {
    clinicalEncounter: { formUuid },
  } = useConfig<BillingConfig>();
  const launchWorkspaceRequiringVisit = useLaunchWorkspaceRequiringVisit(
    routePatientUuid,
    'patient-form-entry-workspace',
  );

  const handleOpenOrEditClinicalEncounterForm = (encounterUuid?: string) => {
    launchWorkspaceRequiringVisit({
      form: { uuid: formUuid },
      encounterUuid: encounterUuid ?? '',
    });
  };

  const openEditLineModal = (line: InvoiceLine) => {
    const dispose = showModal('edit-claim-line-modal', {
      claimLineId: line.lineItemId,
      quantity: line.quantity,
      unit_price: line.unitPrice,
      item: line.item,
      consent_token: consentToken,
      onClose: () => dispose(),
    });
  };

  const openDeleteLineModal = (line: InvoiceLine) => {
    const dispose = showModal('delete-claim-line-modal', {
      claimLineId: line.lineItemId,
      consent_token: consentToken,
      onClose: () => dispose(),
    });
  };

  // Auto-trigger resubmit if requested
  useEffect(() => {
    const abortController = new AbortController();
    const doAutoResubmit = async () => {
      if (!autoResubmit) {
        return;
      }

      const targetId = visits?.uuid ?? patientUuid ?? claimPreview?.visit?.uuid ?? claimPreview?.visit_uuid ?? '';
      if (!targetId) {
        return;
      }

      showSnackbar({ kind: 'info', title: t('resubmitting', 'Resubmitting...'), isLowContrast: true });
      const result = await resubmitInsuranceClaimLine(targetId);

      if (abortController.signal.aborted) {
        return;
      }

      if (result.success) {
        showSnackbar({
          kind: 'success',
          title: t('resubmitTriggered', 'Resubmit triggered'),
          subtitle: t('resubmitTriggeredDescription', 'Resubmit event sent to payer/back-end.'),
          isLowContrast: true,
        });
        mutate?.();
      } else {
        showSnackbar({
          kind: 'error',
          title: t('resubmitTriggerFailed', 'Resubmit trigger failed'),
          subtitle: result.upstreamError || t('resubmitTriggerFailedDesc', 'Unable to trigger resubmit'),
          isLowContrast: true,
        });
      }
    };

    doAutoResubmit();
    return () => {
      abortController.abort();
    };
  }, [autoResubmit, visits, patientUuid, claimPreview, mutate, t]);

  const handleResubmit = async () => {
    setIsSubmitting(true);

    const result = await submitInsuranceClaim(isInpatient, authorizationCode, receiptNumber, patientUuid);

    if (result.success) {
      const supportingDocuments = form.getValues('supportingDocuments') ?? [];
      const visitUuid = visits?.uuid;

      if (supportingDocuments.length > 0 && visitUuid) {
        await uploadAttachments(supportingDocuments, defaultInterventions[0] ?? '', visitUuid);
      } else if (supportingDocuments.length > 0 && !visitUuid) {
        showSnackbar({
          kind: 'warning',
          title: t('attachmentUploadSkipped', 'Attachment upload skipped'),
          subtitle: t(
            'missingVisitForAttachmentUpload',
            'A recent visit was not found, so attachments were not uploaded.',
          ),
          isLowContrast: true,
          timeoutInMs: 3500,
        });
      }

      showSnackbar({
        kind: 'success',
        title: t('claimResubmitted', 'Claim resubmitted'),
        subtitle: t('claimResubmittedDescription', 'Claim resubmission request sent successfully.'),
        isLowContrast: true,
        timeoutInMs: 3500,
      });

      mutate?.();
    } else {
      showSnackbar({
        kind: 'error',
        title: t('claimResubmitFailed', 'Claim resubmit failed'),
        subtitle: result.upstreamError || t('claimResubmitFailedDescription', 'Unable to resubmit claim'),
        isLowContrast: true,
        timeoutInMs: 4000,
      });
    }

    setIsSubmitting(false);
  };

  if (!isPreviewLoading && !claimPreview) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <Button
            kind="ghost"
            size="sm"
            renderIcon={ArrowLeft}
            onClick={() => navigate({ to: `${spaBasePath}/accounting}` })}>
            {t('back', 'Back')}
          </Button>
        </div>
        <div style={{ padding: 16 }}>{t('missingClaim', 'No claim preview was returned for this resubmission.')}</div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      {patient && routePatientUuid && <ExtensionSlot name="patient-header-slot" state={{ patient, patientUuid }} />}
      <CardHeader title={t('claimResubmissionDetails', 'Claim resubmission details')} />

      <FormProvider {...form}>
        <Form className={styles.form} onSubmit={(event) => event.preventDefault()}>
          <Stack gap={3}>
            {isPreviewLoading || isVisitLoading ? (
              <InlineLoading
                status="active"
                iconDescription={t('loading', 'Loading')}
                description={t('loadingClaimDetails', 'Loading claim details...')}
              />
            ) : null}

            {previewError ? (
              <InlineNotification
                kind="error"
                hideCloseButton
                title={t('claimPreviewError', 'Claim preview error')}
                subtitle={previewError.message}
              />
            ) : null}

            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionLabel}>{t('claimSummary', 'Claim summary')}</p>
                  <h3 className={styles.sectionTitle}>
                    {claimPreview?.patient?.display ??
                      claimPreview?.patient_name ??
                      t('unknownPatient', 'Unknown patient')}
                  </h3>
                </div>
                <Tag type="blue">{String(claimPreview?.service_type ?? claim?.service_type ?? '—')}</Tag>
              </div>

              <div className={styles.summaryGrid}>
                <div>
                  <span className={styles.metaLabel}>{t('receiptNumber', 'Receipt Number')}</span>
                  <strong>{receiptNumber || '—'}</strong>
                </div>
                <div>
                  <span className={styles.metaLabel}>{t('authorizationCode', 'Authorization Code')}</span>
                  <strong>{authorizationCode || '—'}</strong>
                </div>
                <div>
                  <span className={styles.metaLabel}>{t('workflowState', 'Workflow State')}</span>
                  <strong>{workflowState}</strong>
                </div>
                <div>
                  <span className={styles.metaLabel}>{t('doctors', 'Doctors')}</span>
                  {claimDoctors.length > 0 ? (
                    <span className={styles.doctorInline}>{claimDoctors.map((d) => d.doctor_name).join(' · ')}</span>
                  ) : (
                    <span className={styles.muted}>—</span>
                  )}
                </div>
              </div>
            </div>

            {(payerData || payerPreview || isPayerPreviewLoading) && (
              <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <div>
                    <p className={styles.sectionLabel}>{t('payerResponse', 'Payer Response')}</p>
                    <h3 className={styles.sectionTitle}>{t('guidanceForResubmission', 'Guidance for resubmission')}</h3>
                  </div>
                </div>

                <div className={styles.payerDataDetails}>
                  {isPayerPreviewLoading ? (
                    <InlineLoading
                      status="active"
                      iconDescription={t('loading', 'Loading')}
                      description={t('loadingPayerPreview', 'Loading payer preview...')}
                    />
                  ) : null}

                  {(payerPreview?.trackingNumber ?? payerData?.trackingNumber) && (
                    <div>
                      <span className={styles.metaLabel}>{t('payerTrackingNumber', 'Payer Tracking Number')}</span>
                      <strong>{payerPreview?.trackingNumber ?? payerData?.trackingNumber}</strong>
                    </div>
                  )}
                  {(payerPreview?.workflowDisplayName ?? payerData?.workflowDisplayName) && (
                    <div>
                      <span className={styles.metaLabel}>{t('workflowState', 'Workflow State')}</span>
                      <strong>{payerPreview?.workflowDisplayName ?? payerData?.workflowDisplayName}</strong>
                      {(payerPreview?.workflowState ?? payerData?.workflowState) && (
                        <span className={styles.workflowCode}>
                          {payerPreview?.workflowState ?? payerData?.workflowState}
                        </span>
                      )}
                    </div>
                  )}
                  {!(payerPreview?.workflowDisplayName ?? payerData?.workflowDisplayName) &&
                    (payerPreview?.workflowState ?? payerData?.workflowState) && (
                      <div>
                        <span className={styles.metaLabel}>{t('workflowState', 'Workflow State')}</span>
                        <strong className={styles.breakWord}>
                          {payerPreview?.workflowState ?? payerData?.workflowState}
                        </strong>
                      </div>
                    )}
                  {(payerPreview?.created ?? payerData?.created) && (
                    <div>
                      <span className={styles.metaLabel}>{t('submissionDate', 'Submission Date')}</span>
                      <strong>
                        {new Date(String(payerPreview?.created ?? payerData?.created)).toLocaleDateString()}
                      </strong>
                    </div>
                  )}
                </div>

                {((payerPreview?.claimNotes?.length ?? 0) > 0 || (payerData?.claimNotes?.length ?? 0) > 0) && (
                  <div className={styles.notesList}>
                    {(payerPreview?.claimNotes ?? payerData?.claimNotes ?? []).map((note: any, index: number) => (
                      <div key={note.uuid ?? note.id ?? index} className={styles.noteItem}>
                        <div className={styles.noteHeader}>
                          <strong>{note.comment ?? note.message ?? note.note ?? t('feedback', 'Feedback')}</strong>
                          {note.workflowState ? <p>{note.workflowState}</p> : null}
                        </div>
                        <p>{note.display ?? note.description ?? note.reason ?? '—'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionLabel}>{t('hieChecks', 'HIE checks')}</p>
                  <h3 className={styles.sectionTitle}>{t('hieCheckResults', 'HIE check results')}</h3>
                </div>
              </div>

              {(() => {
                const externalErrors = parseExternalApiErrors(claimPreview?.externalApiErrors);
                const hasErrors = externalErrors.length > 0;
                const hasFeedback = feedbackNotes.length > 0;

                if (!hasFeedback && !hasErrors) {
                  return (
                    <InlineNotification
                      kind="success"
                      hideCloseButton
                      title={t('hieChecksPassed', 'All HIE checks passed')}
                      subtitle={t(
                        'hieChecksPassedDescription',
                        'No issues were flagged by the Health Information Exchange for this claim.',
                      )}
                    />
                  );
                }

                return (
                  <div className={styles.notesList}>
                    {hasErrors && (
                      <div className={styles.submissionErrorsSection}>
                        <h4 className={styles.submissionErrorsTitle}>{t('submissionErrors', 'Submission Errors')}</h4>
                        {externalErrors.map((e: any, idx: number) => (
                          <div key={`error-${idx}`} className={styles.noteItem}>
                            <p className={styles.noteText}>
                              {e.timestamp && <strong>{e.timestamp}</strong>}
                              {e.action && (
                                <>
                                  &nbsp;<em>{e.action}</em>:
                                </>
                              )}
                              &nbsp;
                              {e.parsed
                                ? e.parsed.error
                                  ? `${e.parsed.error}: ${e.parsed.message}`
                                  : e.parsed.message || JSON.stringify(e.parsed)
                                : e.raw}
                            </p>
                            {e.parsed?.inner && (
                              <small className={styles.noteMetadata}>
                                {typeof e.parsed.inner === 'object'
                                  ? JSON.stringify(e.parsed.inner)
                                  : String(e.parsed.inner)}
                              </small>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {hasFeedback && (
                      <div className={styles.claimFeedbackSection}>
                        {hasErrors && <hr className={styles.feedbackSeparator} />}
                        <h4 className={styles.claimFeedbackTitle}>{t('hieCheckDetails', 'HIE check details')}</h4>
                        {feedbackNotes.map((note: any, index: number) => (
                          <div key={note.uuid ?? note.id ?? index} className={styles.noteItem}>
                            <div className={styles.noteHeader}>
                              <strong>{note.comment ?? note.message ?? note.note ?? t('hieCheck', 'HIE check')}</strong>
                              {note.source && (
                                <span className={styles.hieSourceTag}>
                                  {t('source', 'Source')}: {note.source}
                                </span>
                              )}
                            </div>
                            {(note.display ?? note.description ?? note.reason) && (
                              <p>{note.display ?? note.description ?? note.reason}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionLabel}>{t('diagnosis', 'Diagnosis')}</p>
                  <h3 className={styles.sectionTitle}>{t('claimDiagnosis', 'Claim diagnosis')}</h3>
                </div>
                <Button
                  renderIcon={Stethoscope}
                  size="md"
                  kind="ghost"
                  onClick={() => handleOpenOrEditClinicalEncounterForm()}>
                  {t('editClinicalEncounter', 'Edit clinical encounter')}
                </Button>
              </div>

              {diagnoses.length > 0 ? (
                <Table aria-label={t('diagnoses', 'Diagnoses')} size="sm" className={styles.diagnosisTable}>
                  <TableHead>
                    <TableRow>
                      <TableHeader>{t('diagnosisCode', 'Diagnosis code')}</TableHeader>
                      <TableHeader>{t('diagnosisName', 'Diagnosis name')}</TableHeader>
                      <TableHeader>{t('interventionCode', 'Intervention code')}</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {diagnoses.map((diagnosis, index) => (
                      <TableRow key={`${diagnosis.diagnosis_code ?? diagnosis.diagnosis ?? index}`}>
                        <TableCell>
                          <code>{diagnosis.diagnosis_code ?? '—'}</code>
                        </TableCell>
                        <TableCell>{diagnosis.diagnosis_name ?? '—'}</TableCell>
                        <TableCell>
                          <code>{diagnosis.intervention_code ?? '—'}</code>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <InlineNotification
                  kind="info"
                  hideCloseButton
                  title={t('noDiagnosisYet', 'No diagnosis found')}
                  subtitle={t('noDiagnosisYetDescription', 'This claim does not have diagnosis details yet.')}
                />
              )}
            </div>

            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionLabel}>{t('interventions', 'Interventions')}</p>
                  <h3 className={styles.sectionTitle}>{t('manageInterventions', 'Manage interventions')}</h3>
                </div>
              </div>

              <Table aria-label={t('interventions', 'Interventions')} size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>{t('code', 'Code')}</TableHeader>
                    <TableHeader>{t('name', 'Name')}</TableHeader>
                    <TableHeader>{t('fund', 'Fund')}</TableHeader>
                    <TableHeader>{t('status', 'Status')}</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(claimPreview?.interventions ?? []).map((intervention: any, index: number) => {
                    const interventionCode = String(
                      intervention?.intervention_code ?? intervention?.interventionCode ?? intervention?.code ?? '',
                    );

                    return (
                      <TableRow key={intervention?.uuid ?? intervention?.id ?? `${interventionCode}-${index}`}>
                        <TableCell>{interventionCode || '—'}</TableCell>
                        <TableCell>{intervention?.intervention_name ?? intervention?.name ?? '—'}</TableCell>
                        <TableCell>{intervention?.intervention_fund ?? intervention?.fund ?? '—'}</TableCell>
                        <TableCell>
                          <Tag type={String(intervention?.workflow_state ?? '').includes('REJECTED') ? 'red' : 'gray'}>
                            {intervention?.workflow_state ?? '—'}
                          </Tag>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionLabel}>{t('billLineItems', 'Bill line items')}</p>
                  <h3 className={styles.sectionTitle}>{t('manageBillLines', 'Manage bill line items')}</h3>
                </div>
                <ButtonSet className={styles.inlineActions}>
                  <Button kind="secondary" renderIcon={Add} size="sm" onClick={handleLaunchBillItemWorkspace}>
                    {t('addBillLineItem', 'Add Bill Line Item')}
                  </Button>
                </ButtonSet>
              </div>

              <Table aria-label={t('billLineItems', 'Bill line items')} size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>{t('invoiceNumber', 'Invoice Number')}</TableHeader>
                    <TableHeader>{t('item', 'Item')}</TableHeader>
                    <TableHeader>{t('qty', 'Qty')}</TableHeader>
                    <TableHeader>{t('unitPrice', 'Unit Price')}</TableHeader>
                    <TableHeader>{t('total', 'Total')}</TableHeader>
                    <TableHeader>{t('status', 'Status')}</TableHeader>
                    <TableHeader>{t('actions', 'Actions')}</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lineItems.map((line) => (
                    <TableRow key={line.lineItemId}>
                      <TableCell>{line.invoiceNumber}</TableCell>
                      <TableCell>{line.item}</TableCell>
                      <TableCell>{line.quantity}</TableCell>
                      <TableCell>{line.unitPrice}</TableCell>
                      <TableCell>{line.total}</TableCell>
                      <TableCell>
                        <Tag type="blue">{line.status}</Tag>
                      </TableCell>
                      <TableCell>
                        <OverflowMenu className={styles.rowActions}>
                          <OverflowMenuItem onClick={() => openEditLineModal(line)} itemText={t('edit', 'Edit')} />
                          <OverflowMenuItem
                            onClick={() => openDeleteLineModal(line)}
                            itemText={t('delete', 'Delete')}
                          />
                        </OverflowMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionLabel}>{t('documents', 'Documents')}</p>
                  <h3 className={styles.sectionTitle}>{t('previewDocuments', 'Preview documents')}</h3>
                </div>
              </div>

              {attachments.length > 0 ? (
                <div className={styles.documentList}>
                  {attachments.map((attachment: any, index: number) => {
                    const previewUrl =
                      attachment.data ?? attachment.uploaded_file ?? attachment.file_url ?? attachment.url ?? '';
                    const attachmentLabel =
                      attachment.title ?? attachment.document_title ?? attachment.attachment ?? `Document ${index + 1}`;
                    const attachmentType = attachment.attachment_type ?? attachment.document_type ?? 'FILE';

                    return (
                      <div
                        key={attachment.uuid ?? attachment.id ?? `${attachmentLabel}-${index}`}
                        className={styles.documentRow}>
                        <Tag type="blue" size="sm">
                          {attachmentType}
                        </Tag>
                        <span className={styles.documentTitle}>{attachmentLabel}</span>
                        {previewUrl ? (
                          <Button
                            kind="ghost"
                            size="sm"
                            href={previewUrl}
                            renderIcon={Document}
                            target="_blank"
                            rel="noopener noreferrer"
                            type="button">
                            {t('preview', 'Preview')}
                          </Button>
                        ) : (
                          <span className={styles.muted}>—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <InlineNotification
                  kind="info"
                  hideCloseButton
                  title={t('noDocumentsYet', 'No documents attached')}
                  subtitle={t(
                    'noDocumentsYetDescription',
                    'Use the add attachment action below to upload new documents.',
                  )}
                />
              )}

              <div className={styles.attachmentEditor}>
                <ClaimsSupportingDocumentsInput patientUuid={patientUuid} />
              </div>
            </div>
          </Stack>

          <ButtonSet className={styles.footerActions}>
            <Button kind="secondary" onClick={() => navigate({ to: `${spaBasePath}/accounting}` })}>
              {t('cancel', 'Cancel')}
            </Button>
            <Button kind="primary" disabled={isSubmitting} onClick={handleResubmit} type="button">
              {isSubmitting ? (
                <InlineLoading description={t('resubmitting', 'Resubmitting...')} />
              ) : (
                t('resubmit', 'Resubmit')
              )}
            </Button>
          </ButtonSet>
        </Form>
      </FormProvider>
    </div>
  );
};

export default ResubmitClaimPage;
