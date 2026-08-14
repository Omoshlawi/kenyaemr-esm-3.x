import {
  Button,
  DataTable,
  DataTableSkeleton,
  DatePicker,
  DatePickerInput,
  ActionableNotification,
  InlineLoading,
  InlineNotification,
  Search,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableExpandedRow,
  TableExpandHeader,
  TableExpandRow,
  TableHead,
  TableHeader,
  TableRow,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
} from '@carbon/react';
import { Add, Calendar, Renew, TrashCan } from '@carbon/react/icons';
import { isDesktop, launchWorkspace2, useLayoutType } from '@openmrs/esm-framework';
import { EmptyState, ErrorState, PatientChartPagination } from '@openmrs/esm-patient-common-lib';
import { mutate } from 'swr';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './preauth-queue-table.scss';
import {
  removePreauthDiagnosis,
  usePreauthQueue,
} from '../../../../billing-form/social-health-authority/sha-virtual-claim.resource';
import {
  CANCELLABLE_PREAUTH_STATUSES,
  PreauthDiagnosis,
  PreauthQueueItem,
} from '../../../../billing-form/social-health-authority/type';
import { PREAUTH_TYPE_COLORS, WORKFLOW_STATE_COLORS } from './constants';
import { formatShaDate, isWithinDateRange } from './utils';
import { formatCurrency } from '../../../../helpers/currency';
import { extractSavannahErrorMessage } from '../../../../helpers/functions';
import InterventionCrudLauncher from './intervention-crud-launcher.component';
import { useClaimDoctors } from '../../../claims-wrap/claim-workspaces/doctors/claim-doctors-resource';

// usePreauthQueue is server-paginated, but these tables also filter client-side (search, date range),
// which the pagination hook explicitly doesn't support combining with. Fetch a single generous batch
// instead and paginate/filter entirely client-side so the page controls and item counts stay accurate.
const PREAUTH_FETCH_LIMIT = 1000;

interface ExpandedPanelProps {
  item: PreauthQueueItem;
  tab: 'PENDING' | 'COMPLETED' | 'REJECTED' | 'RESUBMIT';
  onAction: () => void;
}

const ExpandedPanel: React.FC<ExpandedPanelProps> = ({ item, tab, onAction }) => {
  const { t } = useTranslation();
  const [submitting] = useState(false);
  const [removingDiagnosisCode, setRemovingDiagnosisCode] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const preauthAlreadySubmitted = Boolean((item as any)?.preauth_already_submitted);
  const canCancelPreauth = CANCELLABLE_PREAUTH_STATUSES.includes(item.preauth_status ?? '');
  const {
    doctors,
    isLoading: isLoadingDoctors,
    error: doctorsError,
    mutate: mutateDoctors,
  } = useClaimDoctors(item.authorization_code);
  const diagnoses = item.diagnoses ?? [];

  const mutateDoctorAction = () => {
    onAction();
    mutateDoctors();
  };

  const handleRequestDoctorApproval = (doctor: { uuid: string; doctor_name: string; identification_number: string }) =>
    launchWorkspace2('preauth-form-workspace', {
      workspaceTitle: t('requestDoctorApproval', 'Request Doctor Approval'),
      item,
      doctor,
      isRequestDoctorApproval: true,
      mutate: mutateDoctorAction,
    });

  const handleRemoveDiagnosis = async (diagnosis: PreauthDiagnosis) => {
    if (
      !window.confirm(
        t('removeDiagnosisConfirm', 'Remove diagnosis {{code}} from this preauth?', {
          code: diagnosis.icd_code,
        }),
      )
    ) {
      return;
    }

    setActionError(null);
    setRemovingDiagnosisCode(diagnosis.icd_code);

    try {
      const result = await removePreauthDiagnosis(item.authorization_code, diagnosis.icd_code, item.intervention_code);

      if (result.success) {
        onAction();
        return;
      }

      setActionError(
        extractSavannahErrorMessage({
          error: result.error,
          upstream_error: result.upstream_error,
        }) ?? t('removeDiagnosisFailed', 'Could not remove diagnosis'),
      );
    } catch (error: any) {
      setActionError(extractSavannahErrorMessage(error) ?? t('removeDiagnosisFailed', 'Could not remove diagnosis'));
    } finally {
      setRemovingDiagnosisCode(null);
    }
  };

  const handleSubmitPreauth = () =>
    launchWorkspace2('preauth-form-workspace', {
      workspaceTitle: t('submitPreauth', 'Submit Pre-Authorization'),
      item,
      isResubmit: false,
      mutate: onAction,
    });

  const handleResubmit = () =>
    launchWorkspace2('preauth-form-workspace', {
      workspaceTitle: t('resubmitPreauth', 'Resubmit Pre-Authorization'),
      item,
      isResubmit: true,
      mutate: onAction,
    });

  const handleCancelPreauth = () =>
    launchWorkspace2('preauth-form-workspace', {
      workspaceTitle: t('cancelPreauth', 'Cancel Pre-Authorization'),
      item,
      isCancel: true,
      mutate: onAction,
    });

  return (
    <div className={styles.expandedPanel}>
      <div className={styles.expandedGrid}>
        <div className={styles.expandedCard}>
          <p className={styles.expandedCardTitle}>{t('preauthDetails', 'Preauth details')}</p>

          <div className={styles.kvRow}>
            <span className={styles.kvLabel}>{t('authCode', 'Auth code')}</span>
            <span className={styles.kvValueMono}>{item.authorization_code}</span>
          </div>
          <div className={styles.kvRow}>
            <span className={styles.kvLabel}>{t('interventionCode', 'Intervention code')}</span>
            <span className={styles.kvValue}>{item.intervention_code ?? '—'}</span>
          </div>
          <div className={styles.kvRow}>
            <span className={styles.kvLabel}>{t('interventionName', 'Intervention name')}</span>
            <span className={styles.kvValue}>{item.intervention_name ?? '—'}</span>
          </div>
          <div className={styles.kvRow}>
            <span className={styles.kvLabel}>{t('preauthType', 'Preauth type')}</span>
            <span className={styles.kvValue}>
              <Tag type={PREAUTH_TYPE_COLORS[item.preauth_type] ?? 'gray'} size="sm">
                {item.preauth_type}
              </Tag>
            </span>
          </div>
          <div className={styles.kvRow}>
            <span className={styles.kvLabel}>{t('serviceType', 'Service type')}</span>
            <span className={styles.kvValue}>{item.service_type ?? '—'}</span>
          </div>

          {item.preauth_status && (
            <div className={styles.kvRow}>
              <span className={styles.kvLabel}>{t('preauthStatus', 'Preauth status')}</span>
              <span className={styles.kvValue}>
                <Tag
                  type={
                    item.preauth_status === 'FINALISED'
                      ? 'green'
                      : item.preauth_status === 'REJECTED' || item.preauth_status === 'REJECTED_AFTER_APPROVAL'
                      ? 'red'
                      : 'warm-gray'
                  }
                  size="sm">
                  {item.preauth_status}
                </Tag>
              </span>
            </div>
          )}

          {item.requested_on && (
            <div className={styles.kvRow}>
              <span className={styles.kvLabel}>{t('requestedOn', 'Requested on')}</span>
              <span className={styles.kvValue}>{formatShaDate(item.requested_on)}</span>
            </div>
          )}
          {item.responded_on && (
            <div className={styles.kvRow}>
              <span className={styles.kvLabel}>{t('respondedOn', 'Responded on')}</span>
              <span className={styles.kvValue}>{formatShaDate(item.responded_on)}</span>
            </div>
          )}

          {tab === 'COMPLETED' && item.approved_amount && (
            <div className={styles.kvRow}>
              <span className={styles.kvLabel}>{t('approvedAmount', 'Approved amount')}</span>
              <span className={`${styles.kvValue} ${styles.kvValueGreen}`}>KES {item.approved_amount}</span>
            </div>
          )}

          {tab === 'REJECTED' && item.response_note && (
            <div className={styles.kvRow}>
              <span className={styles.kvLabel}>{t('rejectionReason', 'Rejection reason')}</span>
              <span className={`${styles.kvValue} ${styles.kvValueRed}`}>{item.response_note}</span>
            </div>
          )}
        </div>

        <div className={styles.expandedCard}>
          {(doctors.length > 0 || diagnoses.length > 0 || isLoadingDoctors || doctorsError) && (
            <>
              <p className={styles.expandedCardTitle}>{t('clinicalDetails', 'Clinical details')}</p>

              {doctorsError ? (
                <InlineNotification
                  kind="error"
                  lowContrast
                  hideCloseButton
                  title={t('doctorsLoadError', 'Failed to load doctors')}
                  subtitle={
                    doctorsError instanceof Error
                      ? doctorsError.message
                      : t('doctorsLoadErrorGeneric', 'Request failed')
                  }
                />
              ) : isLoadingDoctors ? (
                <InlineLoading description={t('loadingDoctors', 'Loading doctors…')} />
              ) : (
                doctors.length > 0 && (
                  <>
                    <div className={styles.kvRow}>
                      <span className={styles.kvLabel}>{t('doctors', 'Doctors')}</span>
                      <span className={styles.kvValue}>{doctors.length}</span>
                    </div>
                    <div className={styles.attachmentList}>
                      {doctors.map((doctor) => (
                        <div key={doctor.uuid} className={styles.attachmentRow}>
                          <Tag type="cyan" size="sm">
                            {doctor.identification_number}
                          </Tag>
                          <span className={styles.attachmentTitle}>{doctor.doctor_name}</span>
                          <Button
                            size="sm"
                            kind="secondary"
                            onClick={() => handleRequestDoctorApproval(doctor)}
                            iconDescription={t('requestDoctorApproval', 'Request doctor approval')}>
                            {t('rerequest', 'Re-request')}
                          </Button>
                          <Button
                            size="sm"
                            kind="danger--tertiary"
                            renderIcon={TrashCan}
                            onClick={() =>
                              launchWorkspace2('preauth-form-workspace', {
                                workspaceTitle: t('removeDoctor', 'Remove Doctor'),
                                item,
                                doctor,
                                isRemoveDoctor: true,
                                mutate: mutateDoctorAction,
                              })
                            }
                            iconDescription={t('removeDoctor', 'Remove doctor')}>
                            {t('remove', 'Remove')}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </>
                )
              )}

              {diagnoses.length > 0 && (
                <>
                  <div className={styles.kvRow}>
                    <span className={styles.kvLabel}>{t('diagnoses', 'Diagnoses')}</span>
                    <span className={styles.kvValue}>{diagnoses.length}</span>
                  </div>
                  <div className={styles.attachmentList}>
                    {diagnoses.map((diagnosis) => (
                      <div key={diagnosis.icd_code} className={styles.attachmentRow}>
                        <Tag type="blue" size="sm">
                          {diagnosis.icd_code}
                        </Tag>
                        <span className={styles.attachmentTitle}>{diagnosis.display ?? diagnosis.icd_code}</span>
                        <Button
                          size="sm"
                          kind="danger--tertiary"
                          renderIcon={TrashCan}
                          onClick={() => handleRemoveDiagnosis(diagnosis)}
                          disabled={removingDiagnosisCode === diagnosis.icd_code}
                          iconDescription={t('removeDiagnosis', 'Remove diagnosis')}>
                          {removingDiagnosisCode === diagnosis.icd_code
                            ? t('removing', 'Removing...')
                            : t('remove', 'Remove')}
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {tab === 'PENDING' && (
            <>
              <p className={styles.expandedCardTitle}>{t('requiredDocuments', 'Required documents')}</p>
              {(item.required_preauth_document_types?.length ?? 0) > 0 ? (
                <div className={styles.docTags}>
                  {item.required_preauth_document_types?.map((doc) => (
                    <Tag key={doc} type="cool-gray" size="sm">
                      {doc}
                    </Tag>
                  ))}
                </div>
              ) : (
                <p className={styles.muted}>{t('noDocsRequired', 'No documents required')}</p>
              )}
            </>
          )}

          {(tab === 'COMPLETED' || tab === 'REJECTED') && (
            <>
              <p className={styles.expandedCardTitle}>{t('submittedDocuments', 'Submitted documents')}</p>
              {(item.attachments ?? []).length > 0 ? (
                <div className={styles.attachmentList}>
                  {(item.attachments ?? []).map((att, idx) => (
                    <div key={idx} className={styles.attachmentRow}>
                      <Tag type="blue" size="sm">
                        {att.attachment_type ?? 'FILE'}
                      </Tag>
                      <span className={styles.attachmentTitle}>{att.title ?? 'Document'}</span>
                      {att.uploaded_file ? (
                        <a
                          href={att.uploaded_file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.viewLink}>
                          {t('view', 'View')} ↗
                        </a>
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.muted}>{t('noSubmittedDocs', 'No documents submitted')}</p>
              )}
            </>
          )}

          <p className={styles.expandedCardTitle}>{t('visitInfo', 'Visit info')}</p>
          <div className={styles.kvRow}>
            <span className={styles.kvLabel}>{t('visitType', 'Visit type')}</span>
            <span className={styles.kvValue}>{item.visit?.visitType ?? '—'}</span>
          </div>
          <div className={styles.kvRow}>
            <span className={styles.kvLabel}>{t('visitDate', 'Visit date')}</span>
            <span className={styles.kvValue}>{formatShaDate(item.visit?.startDate)}</span>
          </div>
          <div className={styles.kvRow}>
            <span className={styles.kvLabel}>{t('claimAuthStatus', 'Auth status')}</span>
            <span className={styles.kvValue}>{item.claim_auth_status ?? '—'}</span>
          </div>
          {actionError && (
            <div className={styles.actionNotification}>
              <ActionableNotification
                kind="error"
                lowContrast
                title={t('actionFailed', 'Action failed')}
                subtitle={actionError}
                inline
                hideCloseButton
              />
            </div>
          )}
        </div>
      </div>

      <div className={styles.expandedActions}>
        {tab === 'PENDING' && (
          <Button
            size="sm"
            kind={preauthAlreadySubmitted ? 'ghost' : 'primary'}
            onClick={handleSubmitPreauth}
            disabled={submitting || preauthAlreadySubmitted}>
            {submitting ? (
              <InlineLoading description={t('submitting', 'Submitting...')} />
            ) : preauthAlreadySubmitted ? (
              t('preauthAlreadySubmitted', 'Preauth submitted ✓')
            ) : (
              t('submitPreauth', 'Submit preauth')
            )}
          </Button>
        )}
        {canCancelPreauth && (
          <Button size="sm" kind="danger--tertiary" onClick={handleCancelPreauth}>
            {t('cancelPreauth', 'Cancel preauth')}
          </Button>
        )}
        {(tab === 'REJECTED' || tab === 'RESUBMIT') && (
          <Button size="sm" kind="danger--tertiary" renderIcon={Renew} onClick={handleResubmit}>
            {t('resubmitPreauth', 'Resubmit preauth')}
          </Button>
        )}
      </div>
    </div>
  );
};
interface ScheduledExpandedPanelProps {
  item: PreauthQueueItem;
  onAction: () => void;
}

const ScheduledExpandedPanel: React.FC<ScheduledExpandedPanelProps> = ({ item, onAction }) => {
  const { t } = useTranslation();
  const [submittingDoctorId, setSubmittingDoctorId] = useState<string | null>(null);
  const [removingDiagnosisCode, setRemovingDiagnosisCode] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const isApproved = item?.workflow_state === 'ELECTIVE_APPROVED';
  const isPending = item?.workflow_state === 'ELECTIVE_PENDING';
  const isDraft = item?.workflow_state === 'ELECTIVE_DRAFT';
  const isRejected = item?.workflow_state === 'ELECTIVE_REJECTED';
  const {
    doctors,
    isLoading: isLoadingDoctors,
    error: doctorsError,
    mutate: mutateDoctors,
  } = useClaimDoctors(item?.authorization_code);
  const diagnoses = item?.diagnoses ?? [];

  const preauthAlreadySubmitted = Boolean((item as any)?.preauth_already_submitted);

  const mutateDoctorAction = () => {
    onAction();
    mutateDoctors();
  };

  const handleRequestDoctorApproval = (doctor: { uuid: string; doctor_name: string; identification_number: string }) =>
    launchWorkspace2('preauth-form-workspace', {
      workspaceTitle: t('requestDoctorApproval', 'Request Doctor Approval'),
      item,
      doctor,
      isRequestDoctorApproval: true,
      mutate: mutateDoctorAction,
    });

  const handleRemoveDiagnosis = async (diagnosis: PreauthDiagnosis) => {
    if (
      !window.confirm(
        t('removeDiagnosisConfirm', 'Remove diagnosis {{code}} from this preauth?', {
          code: diagnosis.icd_code,
        }),
      )
    ) {
      return;
    }

    setActionError(null);
    setRemovingDiagnosisCode(diagnosis.icd_code);

    try {
      const result = await removePreauthDiagnosis(item.authorization_code, diagnosis.icd_code, item.intervention_code);

      if (result.success) {
        onAction();
        return;
      }

      setActionError(
        result.error ??
          (result.upstream_error as { message?: string } | undefined)?.message ??
          t('removeDiagnosisFailed', 'Could not remove diagnosis'),
      );
    } catch (error: any) {
      setActionError(error?.message ?? t('removeDiagnosisFailed', 'Could not remove diagnosis'));
    } finally {
      setRemovingDiagnosisCode(null);
    }
  };

  const handleSubmitPreauth = () =>
    launchWorkspace2('preauth-form-workspace', {
      workspaceTitle: isDraft
        ? t('submitElectivePreauth', 'Submit Elective Pre-Authorization')
        : t('resubmitElectivePreauth', 'Resubmit Elective Pre-Authorization'),
      item,
      isElective: true,
      isResubmit: isRejected,
      mutate: onAction,
    });

  const handleCancelPreauth = () =>
    launchWorkspace2('preauth-form-workspace', {
      workspaceTitle: t('cancelPreauth', 'Cancel Pre-Authorization'),
      item,
      isElective: true,
      isCancel: true,
      mutate: onAction,
    });

  return (
    <div className={styles.expandedPanel}>
      <div className={styles.expandedGrid}>
        <div className={styles.expandedCard}>
          <p className={styles.expandedCardTitle}>{t('electivePreauthDetails', 'Elective preauth details')}</p>

          <div className={styles.kvRow}>
            <span className={styles.kvLabel}>{t('authCode', 'Auth code')}</span>
            <span className={styles.kvValueMono}>{item.authorization_code}</span>
          </div>
          <div className={styles.kvRow}>
            <span className={styles.kvLabel}>{t('interventionCode', 'Intervention code')}</span>
            <span className={styles.kvValue}>{item.intervention_code ?? '—'}</span>
          </div>
          <div className={styles.kvRow}>
            <span className={styles.kvLabel}>{t('interventionName', 'Intervention name')}</span>
            <span className={styles.kvValue}>{item.intervention_name ?? '—'}</span>
          </div>
          <div className={styles.kvRow}>
            <span className={styles.kvLabel}>{t('serviceType', 'Service type')}</span>
            <span className={styles.kvValue}>{item.service_type ?? '—'}</span>
          </div>
          <div className={styles.kvRow}>
            <span className={styles.kvLabel}>{t('status', 'Status')}</span>
            <span className={styles.kvValue}>
              <Tag type={WORKFLOW_STATE_COLORS[item.workflow_state] ?? 'warm-gray'} size="sm">
                {item.workflow_state?.replace('ELECTIVE_', '') ?? '—'}
              </Tag>
            </span>
          </div>
          <div className={styles.kvRow}>
            <span className={styles.kvLabel}>{t('dateCreated', 'Date created')}</span>
            <span className={styles.kvValue}>{formatShaDate(item.date_created)}</span>
          </div>

          {item.preauth_status && (
            <div className={styles.kvRow}>
              <span className={styles.kvLabel}>{t('shaStatus', 'SHA status')}</span>
              <span className={styles.kvValue}>
                <Tag
                  type={
                    item.preauth_status === 'FINALISED'
                      ? 'green'
                      : item.preauth_status?.startsWith('REJECTED')
                      ? 'red'
                      : item.preauth_status === 'ACTIVE'
                      ? 'cyan'
                      : 'warm-gray'
                  }
                  size="sm">
                  {item.preauth_status}
                </Tag>
              </span>
            </div>
          )}
          {isApproved && item.approved_amount && (
            <div className={styles.kvRow}>
              <span className={styles.kvLabel}>{t('approvedAmount', 'Approved amount')}</span>
              <span className={`${styles.kvValue} ${styles.kvValueGreen}`}>KES {item.approved_amount}</span>
            </div>
          )}
          {isRejected && item.response_note && (
            <div className={styles.kvRow}>
              <span className={styles.kvLabel}>{t('rejectionReason', 'Rejection reason')}</span>
              <span className={`${styles.kvValue} ${styles.kvValueRed}`}>{item.response_note}</span>
            </div>
          )}
          {item.requested_on && (
            <div className={styles.kvRow}>
              <span className={styles.kvLabel}>{t('requestedOn', 'Requested on')}</span>
              <span className={styles.kvValue}>{formatShaDate(item.requested_on)}</span>
            </div>
          )}
          {item.responded_on && (
            <div className={styles.kvRow}>
              <span className={styles.kvLabel}>{t('respondedOn', 'Responded on')}</span>
              <span className={styles.kvValue}>{formatShaDate(item.responded_on)}</span>
            </div>
          )}
        </div>

        <div className={styles.expandedCard}>
          {(doctors.length > 0 || diagnoses.length > 0 || isLoadingDoctors || doctorsError) && (
            <>
              <p className={styles.expandedCardTitle}>{t('clinicalDetails', 'Clinical details')}</p>

              {doctorsError ? (
                <InlineNotification
                  kind="error"
                  lowContrast
                  hideCloseButton
                  title={t('doctorsLoadError', 'Failed to load doctors')}
                  subtitle={
                    doctorsError instanceof Error
                      ? doctorsError.message
                      : t('doctorsLoadErrorGeneric', 'Request failed')
                  }
                />
              ) : isLoadingDoctors ? (
                <InlineLoading description={t('loadingDoctors', 'Loading doctors…')} />
              ) : (
                doctors.length > 0 && (
                  <>
                    <div className={styles.kvRow}>
                      <span className={styles.kvLabel}>{t('doctors', 'Doctors')}</span>
                      <span className={styles.kvValue}>{doctors.length}</span>
                    </div>
                    <div className={styles.attachmentList}>
                      {doctors.map((doctor) => (
                        <div key={doctor.uuid} className={styles.attachmentRow}>
                          <Tag type="cyan" size="sm">
                            {doctor.identification_number}
                          </Tag>
                          <span className={styles.attachmentTitle}>{doctor.doctor_name}</span>
                          <Button
                            size="sm"
                            kind="secondary"
                            onClick={() => handleRequestDoctorApproval(doctor)}
                            iconDescription={t('requestDoctorApproval', 'Request doctor approval')}>
                            {t('rerequest', 'Re-request')}
                          </Button>
                          <Button
                            size="sm"
                            kind="danger--tertiary"
                            renderIcon={TrashCan}
                            onClick={() =>
                              launchWorkspace2('preauth-form-workspace', {
                                workspaceTitle: t('removeDoctor', 'Remove Doctor'),
                                item,
                                doctor,
                                isRemoveDoctor: true,
                                mutate: mutateDoctorAction,
                              })
                            }
                            iconDescription={t('removeDoctor', 'Remove doctor')}>
                            {t('remove', 'Remove')}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </>
                )
              )}

              {diagnoses.length > 0 && (
                <>
                  <div className={styles.kvRow}>
                    <span className={styles.kvLabel}>{t('diagnoses', 'Diagnoses')}</span>
                    <span className={styles.kvValue}>{diagnoses.length}</span>
                  </div>
                  <div className={styles.attachmentList}>
                    {diagnoses.map((diagnosis) => (
                      <div key={diagnosis.icd_code} className={styles.attachmentRow}>
                        <Tag type="blue" size="sm">
                          {diagnosis.icd_code}
                        </Tag>
                        <span className={styles.attachmentTitle}>{diagnosis.display ?? diagnosis.icd_code}</span>
                        <Button
                          size="sm"
                          kind="danger--tertiary"
                          renderIcon={TrashCan}
                          onClick={() => handleRemoveDiagnosis(diagnosis)}
                          disabled={removingDiagnosisCode === diagnosis.icd_code}
                          iconDescription={t('removeDiagnosis', 'Remove diagnosis')}>
                          {removingDiagnosisCode === diagnosis.icd_code
                            ? t('removing', 'Removing...')
                            : t('remove', 'Remove')}
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {(isDraft || isRejected) && (
            <>
              <p className={styles.expandedCardTitle}>{t('requiredDocuments', 'Required documents')}</p>
              {(item.required_preauth_document_types ?? []).length > 0 ? (
                <div className={styles.docTags}>
                  {item.required_preauth_document_types?.map((doc) => (
                    <Tag key={doc} type="cool-gray" size="sm">
                      {doc}
                    </Tag>
                  ))}
                </div>
              ) : (
                <p className={styles.muted}>
                  {t(
                    'noSpecificDocsRequired',
                    'No specific documents listed — attach clinical notes and relevant lab results.',
                  )}
                </p>
              )}
            </>
          )}

          {isRejected && (item.attachments ?? []).length > 0 && (
            <>
              <p className={styles.expandedCardTitle}>
                {t('previouslySubmittedDocs', 'Previously submitted documents')}
              </p>
              <div className={styles.attachmentList}>
                {(item.attachments ?? []).map((att, idx) => (
                  <div key={idx} className={styles.attachmentRow}>
                    <Tag type="warm-gray" size="sm">
                      {att.attachment_type ?? 'FILE'}
                    </Tag>
                    <span className={styles.attachmentTitle}>{att.title ?? 'Document'}</span>
                    {att.uploaded_file ? (
                      <a href={att.uploaded_file} target="_blank" rel="noopener noreferrer" className={styles.viewLink}>
                        {t('view', 'View')} ↗
                      </a>
                    ) : (
                      <span className={styles.muted}>—</span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {(isPending || isApproved) && (
            <>
              <p className={styles.expandedCardTitle}>{t('submittedDocuments', 'Submitted documents')}</p>
              {(item.attachments ?? []).length > 0 ? (
                <div className={styles.attachmentList}>
                  {(item.attachments ?? []).map((att, idx) => (
                    <div key={idx} className={styles.attachmentRow}>
                      <Tag type="blue" size="sm">
                        {att.attachment_type ?? 'FILE'}
                      </Tag>
                      <span className={styles.attachmentTitle}>{att.title ?? 'Document'}</span>
                      {att.uploaded_file ? (
                        <a
                          href={att.uploaded_file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.viewLink}>
                          {t('view', 'View')} ↗
                        </a>
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.muted}>{t('noSubmittedDocs', 'No documents submitted')}</p>
              )}
            </>
          )}

          <div className={styles.inlineNotification}>
            {isDraft && (
              <ActionableNotification
                kind="info"
                lowContrast
                title={t('preauthNotSubmitted', 'Preauth not yet submitted')}
                subtitle={t('createPreauthGuidance', 'Submit an elective preauth to SHA for review.')}
                inline
              />
            )}
            {isPending && (
              <ActionableNotification
                kind="info"
                lowContrast
                title={t('preauthUnderReview', 'Under SHA review')}
                subtitle={t(
                  'preauthPendingGuidance',
                  'SHA is reviewing this elective preauth. Auto-refreshes every 3 minutes.',
                )}
                inline
              />
            )}
            {isApproved && (
              <ActionableNotification
                kind="success"
                lowContrast
                title={t('preauthApprovedCheckin', 'Approved patient can check in')}
                subtitle={t(
                  'checkInGuidance',
                  'SHA has approved this preauth. The registration desk can now check in the patient to start the elective visit.',
                )}
                inline
              />
            )}
            {isRejected && (
              <ActionableNotification
                kind="error"
                lowContrast
                title={t('preauthRejected', 'SHA rejected this preauth')}
                subtitle={
                  item.response_note
                    ? t('rejectionReason', 'Reason: {{reason}}', { reason: item.response_note })
                    : t('checkPortal', 'Check the SHA provider portal for full rejection details.')
                }
                inline
              />
            )}
          </div>
          {actionError && (
            <ActionableNotification
              kind="error"
              lowContrast
              title={t('actionFailed', 'Action failed')}
              subtitle={actionError}
              inline
              hideCloseButton
            />
          )}
        </div>
      </div>

      <div className={styles.expandedActions}>
        {isDraft && (
          <Button
            size="sm"
            kind={preauthAlreadySubmitted ? 'ghost' : 'primary'}
            renderIcon={Calendar}
            onClick={handleSubmitPreauth}
            disabled={preauthAlreadySubmitted}>
            {preauthAlreadySubmitted
              ? t('preauthAlreadySubmitted', 'Preauth submitted')
              : t('submitElectivePreauth', 'Submit elective preauth')}
          </Button>
        )}
        {isPending && (
          <Button
            size="sm"
            kind={preauthAlreadySubmitted ? 'ghost' : 'secondary'}
            renderIcon={Calendar}
            onClick={handleSubmitPreauth}
            disabled={preauthAlreadySubmitted}>
            {preauthAlreadySubmitted
              ? t('preauthAlreadySubmitted', 'Preauth submitted')
              : t('resubmitElectivePreauth', 'Resubmit preauth')}
          </Button>
        )}
        {isRejected && (
          <Button size="sm" kind="danger--tertiary" renderIcon={Calendar} onClick={handleSubmitPreauth}>
            {t('resubmitAfterRejection', 'Resubmit after rejection')}
          </Button>
        )}
        {(isDraft || isPending) && (
          <Button size="sm" kind="danger--tertiary" onClick={handleCancelPreauth}>
            {t('cancelPreauth', 'Cancel preauth')}
          </Button>
        )}
      </div>
    </div>
  );
};

interface ScheduledTableProps {
  search: string;
  fromDate: Date | null;
  toDate: Date | null;
}

const ScheduledTable: React.FC<ScheduledTableProps> = ({ search, fromDate, toDate }) => {
  const { t } = useTranslation();
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const { queue, isLoading, error, mutate } = usePreauthQueue('SCHEDULED', PREAUTH_FETCH_LIMIT);

  const headers = [
    { key: 'patient', header: t('patient', 'Patient') },
    { key: 'authorization_code', header: t('authCode', 'Auth Code') },
    { key: 'intervention', header: t('intervention', 'Intervention') },
    { key: 'workflow_state', header: t('status', 'Status') },
    { key: 'date_created', header: t('dateCreated', 'Date Created') },
  ];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return queue.filter((item) => {
      const matchesSearch =
        !q ||
        item.patient?.display?.toLowerCase().includes(q) ||
        item.authorization_code?.toLowerCase().includes(q) ||
        item.intervention_code?.toLowerCase().includes(q) ||
        item.intervention_name?.toLowerCase().includes(q);
      return matchesSearch && isWithinDateRange(item.date_created, fromDate, toDate);
    });
  }, [queue, search, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const effectivePage = Math.min(currentPage, totalPages);

  const paginated = useMemo(() => {
    const start = (effectivePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, effectivePage, pageSize]);

  if (isLoading) {
    return (
      <DataTableSkeleton
        headers={headers}
        rowCount={5}
        columnCount={headers.length}
        zebra
        showToolbar={false}
        showHeader={false}
      />
    );
  }
  if (error) {
    return <ErrorState error={error} headerTitle={t('scheduledPreauths', 'Scheduled Elective Pre-Authorizations')} />;
  }
  if (filtered.length === 0) {
    return (
      <EmptyState
        headerTitle={t('scheduledPreauths', 'Scheduled Elective Pre-Authorizations')}
        displayText={
          search || fromDate
            ? t('noResults', 'No results match your search')
            : t(
                'noScheduledPreauths',
                'No elective preauths scheduled. Elective interventions will appear here after authorization.',
              )
        }
      />
    );
  }

  const rows = paginated.map((item, idx) => ({
    id: `${item.claim_uuid}-${item.intervention_code ?? idx}`,
    patient: item.patient?.display ?? '—',
    authorization_code: item.authorization_code,
    intervention: `${item.intervention_code ?? ''} — ${item.intervention_name ?? ''}`,
    tariff: formatCurrency(Number(item.tariff)) ?? '—',
    workflow_state: item.workflow_state,
    date_created: item.date_created,
  }));

  const itemsById = new Map(rows.map((row, idx) => [row.id, paginated[idx]]));

  return (
    <DataTable rows={rows} headers={headers} isSortable useZebraStyles>
      {({
        rows: tableRows,
        headers: tableHeaders,
        getHeaderProps,
        getRowProps,
        getTableProps,
        getExpandedRowProps,
        getExpandHeaderProps,
      }) => (
        <TableContainer>
          <Table {...getTableProps()}>
            <TableHead>
              <TableRow>
                <TableExpandHeader enableToggle {...getExpandHeaderProps()} />
                {tableHeaders.map((h) => (
                  <TableHeader {...getHeaderProps({ header: h })}>{h.header}</TableHeader>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {tableRows.map((row) => {
                const raw = itemsById.get(row.id);
                return (
                  <React.Fragment key={row.id}>
                    <TableExpandRow {...getRowProps({ row })}>
                      {row.cells.map((cell) => {
                        if (cell.info.header === 'workflow_state') {
                          return (
                            <TableCell key={cell.id}>
                              <Tag type={WORKFLOW_STATE_COLORS[cell.value] ?? 'warm-gray'} size="sm">
                                {cell.value?.replace('ELECTIVE_', '') ?? '—'}
                              </Tag>
                            </TableCell>
                          );
                        }
                        if (cell.info.header === 'date_created') {
                          return <TableCell key={cell.id}>{formatShaDate(cell.value)}</TableCell>;
                        }
                        return <TableCell key={cell.id}>{cell.value ?? '—'}</TableCell>;
                      })}
                    </TableExpandRow>
                    {row.isExpanded && raw ? (
                      <TableExpandedRow colSpan={tableHeaders.length + 1} {...getExpandedRowProps({ row })}>
                        <ScheduledExpandedPanel item={raw} onAction={mutate} />
                      </TableExpandedRow>
                    ) : (
                      <TableExpandedRow
                        className={styles.hiddenRow}
                        colSpan={tableHeaders.length + 1}
                        {...getExpandedRowProps({ row })}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
          <PatientChartPagination
            currentItems={paginated.length}
            totalItems={filtered.length}
            pageNumber={effectivePage}
            pageSize={pageSize}
            onPageNumberChange={({ page, pageSize: ps }: { page: number; pageSize: number }) => {
              if (ps !== pageSize) {
                setPageSize(ps);
                setCurrentPage(1);
              } else {
                setCurrentPage(page);
              }
            }}
          />
        </TableContainer>
      )}
    </DataTable>
  );
};

interface PreauthTableProps {
  tab: 'PENDING' | 'COMPLETED' | 'REJECTED' | 'RESUBMIT';
  search: string;
  fromDate: Date | null;
  toDate: Date | null;
}

const PreauthTable: React.FC<PreauthTableProps> = ({ tab, search, fromDate, toDate }) => {
  const { t } = useTranslation();
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const { queue, isLoading, error, mutate } = usePreauthQueue(tab, PREAUTH_FETCH_LIMIT);

  const headerTitle =
    tab === 'PENDING'
      ? t('pendingPreauths', 'Pending Pre-Authorizations')
      : tab === 'COMPLETED'
      ? t('completedPreauths', 'Completed Pre-Authorizations')
      : tab === 'RESUBMIT'
      ? t('resubmitPreauths', 'Pre-Authorizations Pending Resubmission')
      : t('rejectedPreauths', 'Rejected Pre-Authorizations');

  const emptyText =
    tab === 'PENDING'
      ? t('noPendingPreauths', 'No pending pre-authorizations')
      : tab === 'COMPLETED'
      ? t('noCompletedPreauths', 'No approved pre-authorizations')
      : tab === 'RESUBMIT'
      ? t('noResubmitPreauths', 'No pre-authorizations pending resubmission')
      : t('noRejectedPreauths', 'No rejected pre-authorizations');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return queue.filter((item) => {
      const matchesSearch =
        !q ||
        item.patient?.display?.toLowerCase().includes(q) ||
        item.authorization_code?.toLowerCase().includes(q) ||
        item.intervention_code?.toLowerCase().includes(q) ||
        item.intervention_name?.toLowerCase().includes(q);
      const dateField =
        tab === 'PENDING' || tab === 'RESUBMIT'
          ? item.date_created
          : item.responded_on ?? item.requested_on ?? item.date_created;
      return matchesSearch && isWithinDateRange(dateField, fromDate, toDate);
    });
  }, [queue, search, fromDate, toDate, tab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const effectivePage = Math.min(currentPage, totalPages);

  const paginated = useMemo(() => {
    const start = (effectivePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, effectivePage, pageSize]);

  const baseHeaders = [
    { key: 'patient', header: t('patient', 'Patient') },
    { key: 'authorization_code', header: t('authCode', 'Auth Code') },
    { key: 'intervention', header: t('intervention', 'Intervention') },
  ];

  const tabHeaders = {
    PENDING: [
      ...baseHeaders,
      { key: 'preauth_type', header: t('preauthType', 'Preauth Type') },
      { key: 'service_type', header: t('serviceType', 'Service Type') },
      { key: 'date_created', header: t('dateCreated', 'Date Created') },
    ],
    COMPLETED: [
      ...baseHeaders,
      { key: 'approved_amount', header: t('approvedAmount', 'Approved (KES)') },
      { key: 'service_type', header: t('serviceType', 'Service Type') },
      { key: 'responded_on', header: t('approvedOn', 'Approved On') },
    ],
    REJECTED: [
      ...baseHeaders,
      { key: 'service_type', header: t('serviceType', 'Service Type') },
      { key: 'responded_on', header: t('rejectedOn', 'Rejected On') },
    ],
    RESUBMIT: [
      ...baseHeaders,
      { key: 'service_type', header: t('serviceType', 'Service Type') },
      { key: 'status', header: t('status', 'Status') },
      { key: 'date_created', header: t('dateCreated', 'Date Created') },
    ],
  };

  const headers = tabHeaders[tab];

  if (isLoading) {
    return (
      <DataTableSkeleton
        headers={headers}
        rowCount={5}
        columnCount={headers.length}
        zebra
        showToolbar={false}
        showHeader={false}
      />
    );
  }
  if (error) {
    return <ErrorState error={error} headerTitle={headerTitle} />;
  }
  if (filtered.length === 0) {
    return (
      <EmptyState
        headerTitle={headerTitle}
        displayText={search || fromDate ? t('noResults', 'No results match your search') : emptyText}
      />
    );
  }

  const rows = paginated.map((item, idx) => ({
    id: `${item.claim_uuid}-${item.intervention_code ?? idx}`,
    patient: item.patient?.display ?? '—',
    authorization_code: item.authorization_code,
    intervention: `${item.intervention_code ?? ''} — ${item.intervention_name ?? ''}`,
    tariff: item.tariff ?? '—',
    preauth_type: item.preauth_type,
    service_type: item.service_type ?? '—',
    date_created: item.date_created,
    approved_amount: formatCurrency(Number(item.approved_amount)) ?? '—',
    responded_on: item.responded_on,
    status: item.preauth_status ?? '—',
    response_note: item.response_note ?? '—',
  }));

  const itemsById = new Map(rows.map((row, idx) => [row.id, paginated[idx]]));

  return (
    <DataTable rows={rows} headers={headers} isSortable useZebraStyles>
      {({
        rows: tableRows,
        headers: tableHeaders,
        getHeaderProps,
        getRowProps,
        getTableProps,
        getExpandedRowProps,
        getExpandHeaderProps,
      }) => (
        <TableContainer>
          <Table {...getTableProps()}>
            <TableHead>
              <TableRow>
                <TableExpandHeader enableToggle {...getExpandHeaderProps()} />
                {tableHeaders.map((h) => (
                  <TableHeader {...getHeaderProps({ header: h })}>{h.header}</TableHeader>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {tableRows.map((row) => {
                const raw = itemsById.get(row.id);
                return (
                  <React.Fragment key={row.id}>
                    <TableExpandRow {...getRowProps({ row })}>
                      {row.cells.map((cell) => {
                        if (cell.info.header === 'preauth_type') {
                          return (
                            <TableCell key={cell.id}>
                              <Tag type={PREAUTH_TYPE_COLORS[cell.value] ?? 'gray'} size="sm">
                                {cell.value}
                              </Tag>
                            </TableCell>
                          );
                        }
                        if (cell.info.header === 'approved_amount') {
                          return (
                            <TableCell key={cell.id}>
                              {cell.value ? <Tag type="green">{cell.value}</Tag> : '—'}
                            </TableCell>
                          );
                        }
                        if (cell.info.header === 'date_created' || cell.info.header === 'responded_on') {
                          return <TableCell key={cell.id}>{formatShaDate(cell.value)}</TableCell>;
                        }
                        return <TableCell key={cell.id}>{cell.value ?? '—'}</TableCell>;
                      })}
                    </TableExpandRow>
                    {row.isExpanded && raw ? (
                      <TableExpandedRow colSpan={tableHeaders.length + 1} {...getExpandedRowProps({ row })}>
                        <ExpandedPanel item={raw} tab={tab} onAction={mutate} />
                      </TableExpandedRow>
                    ) : (
                      <TableExpandedRow
                        className={styles.hiddenRow}
                        colSpan={tableHeaders.length + 1}
                        {...getExpandedRowProps({ row })}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
          <PatientChartPagination
            currentItems={paginated.length}
            totalItems={filtered.length}
            pageNumber={effectivePage}
            pageSize={pageSize}
            onPageNumberChange={({ page, pageSize: ps }: { page: number; pageSize: number }) => {
              if (ps !== pageSize) {
                setPageSize(ps);
                setCurrentPage(1);
              } else {
                setCurrentPage(page);
              }
            }}
          />
        </TableContainer>
      )}
    </DataTable>
  );
};

const PreauthQueueTable: React.FC = () => {
  const { t } = useTranslation();

  const { queue: pendingQueue } = usePreauthQueue('PENDING');
  const { queue: completedQueue } = usePreauthQueue('COMPLETED');
  const { queue: rejectedQueue } = usePreauthQueue('REJECTED');
  const { queue: scheduledQueue } = usePreauthQueue('SCHEDULED');
  const { queue: resubmitQueue } = usePreauthQueue('RESUBMIT');

  const [search, setSearch] = useState('');
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const [fromDate, setFromDate] = useState<Date | null>(todayMidnight);
  const [toDate, setToDate] = useState<Date | null>(todayMidnight);

  const filterQueue = (q: PreauthQueueItem[], dateField: 'date_created' | 'responded_on') => {
    const sq = search.toLowerCase().trim();
    return q.filter((item) => {
      const matchesSearch =
        !sq ||
        item.patient?.display?.toLowerCase().includes(sq) ||
        item.authorization_code?.toLowerCase().includes(sq) ||
        item.intervention_code?.toLowerCase().includes(sq) ||
        item.intervention_name?.toLowerCase().includes(sq);
      const v =
        dateField === 'responded_on' ? item.responded_on ?? item.requested_on ?? item.date_created : item[dateField];
      return matchesSearch && isWithinDateRange(v, fromDate, toDate);
    });
  };

  const pendingFiltered = useMemo(
    () => filterQueue(pendingQueue, 'date_created'),
    [pendingQueue, search, fromDate, toDate],
  );
  const completedFiltered = useMemo(
    () => filterQueue(completedQueue, 'responded_on'),
    [completedQueue, search, fromDate, toDate],
  );
  const rejectedFiltered = useMemo(
    () => filterQueue(rejectedQueue, 'responded_on'),
    [rejectedQueue, search, fromDate, toDate],
  );
  const scheduledFiltered = useMemo(
    () => filterQueue(scheduledQueue, 'date_created'),
    [scheduledQueue, search, fromDate, toDate],
  );
  const resubmitFiltered = useMemo(
    () => filterQueue(resubmitQueue, 'date_created'),
    [resubmitQueue, search, fromDate, toDate],
  );

  const approvedScheduledCount = scheduledFiltered.filter((i) => i.workflow_state === 'ELECTIVE_APPROVED').length;
  const rejectedScheduledCount = scheduledFiltered.filter((i) => i.workflow_state === 'ELECTIVE_REJECTED').length;
  const pendingScheduledCount = scheduledFiltered.length - approvedScheduledCount - rejectedScheduledCount;

  const isScheduledTab = activeTabIndex === 3;

  const handleCreateElectivePreauth = () =>
    launchWorkspace2('elective-preauth-form-workspace', {
      workspaceTitle: t('createElectivePreauth', 'Create Elective Pre-Authorization'),
      mutate,
    });

  return (
    <div className={styles.container}>
      <Tabs onChange={({ selectedIndex }) => setActiveTabIndex(selectedIndex)}>
        <div className={styles.tabsRow}>
          <TabList aria-label={t('preauthTabs', 'Pre-authorization tabs')} contained activation="automatic">
            <Tab>
              {t('pending', 'Pending')}
              {pendingFiltered.length > 0 && (
                <Tag type="warm-gray" size="sm" className={styles.tagStatus}>
                  {pendingFiltered.length}
                </Tag>
              )}
            </Tab>
            <Tab>
              {t('approved', 'Approved')}
              {completedFiltered.length > 0 && (
                <Tag type="green" size="sm" className={styles.tagStatus}>
                  {completedFiltered.length}
                </Tag>
              )}
            </Tab>
            <Tab>
              {t('rejected', 'Rejected')}
              {rejectedFiltered.length > 0 && (
                <Tag type="red" size="sm" className={styles.tagStatus}>
                  {rejectedFiltered.length}
                </Tag>
              )}
            </Tab>
            <Tab>
              {t('scheduled', 'Scheduled')}
              {approvedScheduledCount > 0 && (
                <Tag type="green" size="sm" className={styles.tagStatus}>
                  {approvedScheduledCount}
                </Tag>
              )}
              {pendingScheduledCount > 0 && (
                <Tag type="warm-gray" size="sm" className={styles.tagStatus}>
                  {pendingScheduledCount}
                </Tag>
              )}
              {rejectedScheduledCount > 0 && (
                <Tag type="red" size="sm" className={styles.tagStatus}>
                  {rejectedScheduledCount}
                </Tag>
              )}
            </Tab>
            <Tab>
              {t('resubmit', 'Resubmit')}
              {resubmitFiltered.length > 0 && (
                <Tag type="warm-gray" size="sm" className={styles.tagStatus}>
                  {resubmitFiltered.length}
                </Tag>
              )}
            </Tab>
          </TabList>

          <div className={styles.tabsToolbar}>
            <Search
              size="sm"
              placeholder={t('searchPlaceholder', 'Search patient or auth code')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              labelText=""
              className={styles.searchInput}
            />
            <DatePicker
              datePickerType="range"
              dateFormat="d/m/Y"
              value={[fromDate, toDate].filter(Boolean) as Date[]}
              onChange={(dates) => {
                setFromDate(dates[0] ?? null);
                setToDate(dates[1] ?? null);
              }}>
              <DatePickerInput id="preauth-date-from" placeholder="dd/mm/yyyy" labelText="" size="sm" />
              <DatePickerInput id="preauth-date-to" placeholder="dd/mm/yyyy" labelText="" size="sm" />
            </DatePicker>
            {isScheduledTab && (
              <Button
                size="sm"
                kind="primary"
                renderIcon={Add}
                onClick={handleCreateElectivePreauth}
                className={styles.createElectiveButton}>
                {t('createElectivePreauth', 'Create elective preauth')}
              </Button>
            )}
          </div>
        </div>

        <TabPanels>
          <TabPanel>
            <PreauthTable tab="PENDING" search={search} fromDate={fromDate} toDate={toDate} />
          </TabPanel>
          <TabPanel>
            <PreauthTable tab="COMPLETED" search={search} fromDate={fromDate} toDate={toDate} />
          </TabPanel>
          <TabPanel>
            <PreauthTable tab="REJECTED" search={search} fromDate={fromDate} toDate={toDate} />
          </TabPanel>
          <TabPanel>
            <ScheduledTable search={search} fromDate={fromDate} toDate={toDate} />
          </TabPanel>
          <TabPanel>
            <PreauthTable tab="RESUBMIT" search={search} fromDate={fromDate} toDate={toDate} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
};

export default PreauthQueueTable;
