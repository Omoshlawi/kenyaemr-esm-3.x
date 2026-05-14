import {
  Button,
  DataTable,
  DataTableSkeleton,
  OverflowMenu,
  OverflowMenuItem,
  Pagination,
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
  Tag,
} from '@carbon/react';
import { Add, Document, DocumentAdd, Stethoscope, Upload } from '@carbon/react/icons';
import { formatDate, showModal, useLayoutType, usePagination } from '@openmrs/esm-framework';
import { EmptyState, usePaginationInfo } from '@openmrs/esm-patient-common-lib';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ClaimResponse } from '../../../types';
import styles from './claims-list-table.scss';
import capitalize from 'lodash-es/capitalize';
import { formatCurrency } from '../../../helpers/currency';
import usePatientDiagnosis from '../../../hooks/usePatientDiagnosis';
import { getClaimPayerPreview } from './claim-summary-modal/claim.resource';

const WORKFLOW_STATE_CONFIG: Record<string, { label: string; type: string }> = {
  DRAFT: { label: 'Draft', type: 'gray' },
  PREAUTH_PENDING: { label: 'Awaiting preauth', type: 'blue' },
  PREAUTH_APPROVED: { label: 'Preauth approved', type: 'green' },
  PREAUTH_REJECTED: { label: 'Preauth rejected', type: 'red' },
  ELECTIVE_DRAFT: { label: 'Elective pending', type: 'gray' },
  ELECTIVE_PENDING: { label: 'Elective pending', type: 'orange' },
  ELECTIVE_APPROVED: { label: 'Elective approved', type: 'green' },
  ELECTIVE_REJECTED: { label: 'Elective rejected', type: 'red' },
  CANCELLED: { label: 'Cancelled', type: 'red' },
};

const STATUS_FALLBACK: Record<string, { label: string; type: string }> = {
  ENTERED: { label: 'Entered', type: 'gray' },
  DRAFT: { label: 'Draft', type: 'gray' },
  APPROVED: { label: 'Approved', type: 'green' },
  REJECTED: { label: 'Rejected', type: 'red' },
  CHECKED: { label: 'Checked', type: 'blue' },
  VALUATED: { label: 'Valuated', type: 'blue' },
  ERRORED: { label: 'Errored', type: 'red' },
  PENDING: { label: 'Pending', type: 'orange' },
  SUBMISSION_READY: { label: 'Submission ready', type: 'blue' },
  CLOSED: { label: 'Closed', type: 'red' },
  SUBMITTED: { label: 'Submitted', type: 'blue' },
};

function getStatusBadge(claim: ClaimResponse) {
  const state = claim.claimAuthStatus?.trim() || claim.workflowState?.trim() || null;
  const cfg = (state && WORKFLOW_STATE_CONFIG[state]) ??
    STATUS_FALLBACK[state ?? ''] ?? { label: state ?? claim.status ?? '—', type: 'gray' };
  return <Tag type={cfg.type as any}>{cfg.label}</Tag>;
}

const ShifExpandedRow: React.FC<{ claim: ClaimResponse }> = ({ claim }) => {
  const { t } = useTranslation();
  const ws = claim.claimAuthStatus?.trim() || claim.workflowState?.trim() || null;
  const isInpatient = claim.serviceType === 'INPATIENT';
  const isDraft = ws === 'DRAFT' || (!ws && claim.status === 'DRAFT');
  const isPreauth = ws === 'PREAUTH_APPROVED';
  const isRejected = ws?.includes('REJECTED') || claim.status === 'REJECTED';
  const canSubmit = isDraft || isPreauth;
  const {
    diagnoses,
    error: diagnosisError,
    isLoading: diagnosisLoading,
  } = usePatientDiagnosis(claim.patient?.uuid ?? '');
  const isTablet = useLayoutType() === 'tablet';
  const controlSize = isTablet ? 'md' : 'sm';

  const [payerData, setPayerData] = useState<any>(null);
  const [payerLoading, setPayerLoading] = useState(false);
  const [payerError, setPayerError] = useState<any>(null);

  useEffect(() => {
    if (claim.invoiceNumber) {
      setPayerLoading(true);
      getClaimPayerPreview(claim.invoiceNumber)
        .then((response) => {
          setPayerData(response.data);
          setPayerError(null);
        })
        .catch((err) => {
          setPayerError(err);
          setPayerData(null);
        })
        .finally(() => setPayerLoading(false));
    }
  }, [claim.invoiceNumber]);

  const open = (modalName: string, payload?: Record<string, unknown>) => {
    const dispose = showModal(modalName, { closeModal: () => dispose(), claimId: claim.uuid, ...payload });
  };

  const lines = claim.invoices?.[0]?.lines ?? [];

  return (
    <div className={styles.expandedPanel}>
      <div className={styles.expandedInfo}>
        {claim.authorizationCode && (
          <span>
            <strong>{t('authCode', 'Auth')}:</strong> <code>{claim.authorizationCode}</code>
          </span>
        )}
        {claim.invoiceNumber && (
          <span>
            <strong>{t('invoice', 'Invoice')}:</strong> <code>{claim.invoiceNumber}</code>
          </span>
        )}
        {claim.memberNumber && (
          <span>
            <strong>{t('member', 'Member')}:</strong> <code>{claim.memberNumber}</code>
          </span>
        )}
        {claim.interventionDetails?.[0] && (
          <span>
            <strong>{t('tariff', 'Tariff')}:</strong>{' '}
            {claim.interventionDetails[0].tariff
              ? formatCurrency(Number(claim.interventionDetails[0].tariff))
              : 'Per diem'}
            {' · '}
            {claim.interventionDetails[0].payment_mechanism}
          </span>
        )}
      </div>

      <div className={styles.expandedButtons}>
        <Tag type={isInpatient ? 'blue' : 'gray'}>
          {isInpatient ? t('inpatient', 'Inpatient') : t('outpatient', 'Outpatient')}
        </Tag>
        <div>
          {diagnosisLoading && <span>{t('loadingDiagnoses', 'Loading diagnoses...')}</span>}
          {diagnosisError && <span>{diagnosisError.message}</span>}
          {!diagnosisLoading && !diagnosisError && diagnoses.length === 0 && (
            <span>{t('noDiagnoses', 'No diagnoses')}</span>
          )}
          {!diagnosisLoading && !diagnosisError && diagnoses.length > 0 && (
            <>
              {diagnoses
                .filter((d) => d.certainty === 'CONFIRMED')
                .map((d, idx) => (
                  <Tag key={`confirmed-${idx}`} type="green">
                    {t('confirmed', 'Confirmed')} : {d.text}
                  </Tag>
                ))}
              {diagnoses
                .filter((d) => d.certainty === 'PROVISIONAL')
                .map((d, idx) => (
                  <Tag key={`provisional-${idx}`} type="blue">
                    {t('provisional', 'Provisional')} : {d.text}
                  </Tag>
                ))}
            </>
          )}
        </div>
      </div>

      <div className={styles.interventionsSection}>
        <div className={styles.interventionsSectionHeader}>
          <p className={styles.interventionsSectionTitle}>{t('interventions', 'Interventions')}</p>
          <div className={styles.interventionActions}>
            <Button
              kind="ghost"
              size={controlSize}
              renderIcon={Add}
              onClick={() => open('claim-add-intervention-modal')}>
              {t('addNewIntervention', 'Add new intervention')}
            </Button>
          </div>
        </div>
        {claim.interventionDetails && claim.interventionDetails.length > 0 ? (
          <table className={styles.interventionsTable}>
            <thead>
              <tr>
                <th>{t('code', 'Code')}</th>
                <th>{t('name', 'Name')}</th>
                <th>{t('tariff', 'Tariff')}</th>
                <th>{t('paymentMechanism', 'Payment Mechanism')}</th>
                <th>{t('workflowState', 'Status')}</th>
                <th>{t('subBenefitCode', 'Sub-benefit Code')}</th>
                <th>{t('preauth', 'Preauth')}</th>
                <th>{t('actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {claim.interventionDetails.map((intervention, idx) => (
                <tr key={intervention.intervention_code ?? idx}>
                  <td>
                    <code>{intervention.intervention_code}</code>
                  </td>
                  <td>{intervention.intervention_name ?? '—'}</td>
                  <td>{intervention.tariff ? formatCurrency(Number(intervention.tariff)) : 'Per diem'}</td>
                  <td>{intervention.payment_mechanism ?? '—'}</td>
                  <td>
                    <Tag type="gray">{intervention.workflow_state ?? '—'}</Tag>
                  </td>
                  <td>{intervention.sub_benefit_code ?? '—'}</td>
                  <td>
                    <Tag type={intervention.preauth_exist ? 'green' : 'gray'}>
                      {intervention.preauth_exist ? t('yes', 'Yes') : t('no', 'No')}
                    </Tag>
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <OverflowMenu size={controlSize} flipped>
                        <OverflowMenuItem
                          onClick={() => open('claim-edit-intervention-modal', { intervention })}
                          itemText={t('edit', 'Edit')}
                        />
                        <OverflowMenuItem
                          onClick={() => open('claim-restore-intervention-modal', { intervention })}
                          itemText={t('restore', 'Restore')}
                        />
                        <OverflowMenuItem
                          onClick={() => open('claim-retire-intervention-modal', { intervention })}
                          itemText={t('retire', 'Retire')}
                        />
                      </OverflowMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : claim.interventions && claim.interventions.length > 0 ? (
          <div className={styles.fallbackMessage}>
            <p>
              {t(
                'interventionsNotAvailable',
                'Interventions available but detailed data not loaded. Available interventions:',
              )}
            </p>
            <ul>
              {claim.interventions.map((intervention, idx) => (
                <li key={idx}>{intervention}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className={styles.noInterventions}>{t('noInterventions', 'No interventions added yet.')}</p>
        )}
      </div>

      <div className={styles.submissionStatusSection}>
        <p className={styles.submissionStatusTitle}>{t('submissionStatus', 'Submission Status')}</p>
        {payerLoading && <span>{t('loadingSubmissionStatus', 'Loading submission status...')}</span>}
        {payerError && (
          <span className={styles.errorText}>
            {payerError?.message || t('errorLoadingStatus', 'Error loading submission status')}
          </span>
        )}
        {!payerLoading && !payerError && payerData ? (
          <div className={styles.statusDetails}>
            <div className={styles.statusRow}>
              <strong>{t('workflowState', 'Workflow State')}:</strong>
              <Tag
                type={
                  payerData.workflowState?.includes('APPROVED')
                    ? 'green'
                    : payerData.workflowState?.includes('REJECTED') ||
                      payerData.workflowState?.includes('CLARIFICATION')
                    ? 'red'
                    : payerData.workflowState?.includes('PENDING')
                    ? 'blue'
                    : 'gray'
                }>
                {payerData.workflowDisplayName || payerData.workflowState || '—'}
              </Tag>
            </div>
            {payerData.created && (
              <div className={styles.statusRow}>
                <strong>{t('submissionDate', 'Submission Date')}:</strong>
                <span>{formatDate(new Date(payerData.created))}</span>
              </div>
            )}
            {payerData.claimNotes && payerData.claimNotes.length > 0 && (
              <div className={styles.statusRow}>
                <strong>{t('notes', 'Notes')}:</strong>
                <div className={styles.notesList}>
                  {payerData.claimNotes.map((note: any, idx: number) => (
                    <div key={idx} className={styles.noteItem}>
                      <p className={styles.noteText}>{note.note}</p>
                      <small className={styles.noteMetadata}>
                        {note.author && (
                          <span>
                            {t('by', 'By')}: {note.author}
                          </span>
                        )}
                        {note.workflowState && <span> ({note.workflowState})</span>}
                      </small>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          !payerLoading && !payerError && <p>{t('noSubmissionData', 'No submission data available')}</p>
        )}
      </div>

      <div className={styles.billingLinesSection}>
        <p className={styles.billingLinesTitle}>{t('billingLines', 'Billing lines')}</p>
        {lines.length === 0 ? (
          <div className={styles.billingLinesEmpty}>
            <p>{t('noBillingLines', 'No billing lines added yet.')}</p>
            <Button kind="ghost" size={controlSize} renderIcon={Add} onClick={() => open('claim-add-line-modal')}>
              {t('addFirstLine', 'Add billing line')}
            </Button>
          </div>
        ) : (
          <table className={styles.billingLinesTable}>
            <thead>
              <tr>
                <th>{t('item', 'Item')}</th>
                <th>{t('code', 'Code')}</th>
                <th>{t('qty', 'Qty')}</th>
                <th>{t('unit', 'Unit')}</th>
                <th>{t('unitPrice', 'Unit price')}</th>
                <th>{t('total', 'Total')}</th>
                <th>{t('net', 'Net')}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id ?? line.item_code}>
                  <td>{line.item_name ?? '—'}</td>
                  <td>
                    <code>{line.intervention_code}</code>
                  </td>
                  <td>{line.quantity}</td>
                  <td>{line.unit ?? '—'}</td>
                  <td>{formatCurrency(Number(line.unit_price ?? 0))}</td>
                  <td>{formatCurrency(Number(line.line_total_amount ?? 0))}</td>
                  <td className={styles.netAmount}>{formatCurrency(Number(line.line_net_amount ?? 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

interface TableProps {
  title: string;
  emptyStateText: string;
  emptyStateHeader: string;
  includeClaimCode?: boolean;
  isPhc?: boolean;
  isLoading?: boolean;
  error: any | null;
  claims?: Array<ClaimResponse>;
}

const PAGE_SIZE = 10;

const ClaimsTable: React.FC<TableProps> = ({
  title,
  emptyStateText,
  emptyStateHeader,
  includeClaimCode = false,
  isPhc = false,
  isLoading = false,
  error,
  claims = [],
}) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const controlSize = useLayoutType() === 'tablet' ? 'md' : 'sm';

  const headers = [
    ...(includeClaimCode ? [{ key: 'claimCode', header: t('claimNo', 'Claim No.') }] : []),
    { key: 'patientName', header: t('patientName', 'Patient name') },
    { key: 'intervention', header: t('intervention', 'Intervention') },
    { key: 'claimedTotal', header: t('claimed', 'Claimed (KES)') },
    { key: 'status', header: t('status', 'Status') },
    { key: 'provider', header: t('provider', 'Provider') },
    ...(!isPhc ? [{ key: 'serviceType', header: t('serviceType', 'Service type') }] : []),
    { key: 'dateCreated', header: t('dateCreated', 'Date created') },
    { key: 'actions', header: t('actions', 'Actions') },
  ];

  const { results, currentPage, goTo } = usePagination(claims, PAGE_SIZE);
  const { pageSizes } = usePaginationInfo(PAGE_SIZE, claims.length, currentPage, results.length);

  // Plain serialisable values only — JSX rendered at cell render time
  const tableRows = results.map((claim) => ({
    id: claim.uuid,
    claimCode: claim.authorizationCode || claim.claimCode || '—',
    patientName: capitalize(claim.patient?.display) || '—',
    intervention: claim.interventions?.length
      ? claim.interventions.join(', ')
      : claim.interventionDetails?.map((i) => i.intervention_code).join(', ') || '—',
    tariff: (() => {
      const details = claim.interventionDetails ?? [];
      if (!details.length) {
        return '—';
      }
      return details.map((i) => (i.tariff != null ? formatCurrency(Number(i.tariff)) : 'Per diem')).join(', ') || '—';
    })(),
    claimedTotal:
      claim.claimedTotal != null && Number(claim.claimedTotal) > 0 ? formatCurrency(Number(claim.claimedTotal)) : '—',
    status: claim.claimAuthStatus?.trim() || claim.workflowState?.trim() || claim.status || '',
    serviceType: claim.serviceType ?? '',
    provider: claim.provider?.display || '—',
    dateCreated: claim.dateFrom ? formatDate(new Date(claim.dateFrom)) : '—',
    visitUuid: claim.visit?.uuid ?? '',
    actions: (
      <OverflowMenu size={controlSize} flipped>
        <>
          <OverflowMenuItem
            itemText={t('previewClaim', 'Preview Claim')}
            onClick={() => {
              const dispose = showModal('claim-preview-modal', {
                patient_uuid: claim?.patient?.uuid,
                receiptNumber: `INV-${claim?.uuid}`,
                onClose: () => {
                  dispose();
                },
                controlSize: { controlSize },
              });
              return dispose;
            }}
          />
          <OverflowMenuItem
            itemText={t('submitClaim', 'Submit Claim')}
            onClick={() => {
              const dispose = showModal('resubmit-claim-line-modal', {
                patient_uuid: claim?.patient?.uuid,
                onClose: () => {
                  dispose();
                },
                controlSize: { controlSize },
              });
              return dispose;
            }}
          />
          <OverflowMenuItem
            hasDivider
            isDelete
            itemText={t('cancelClaim', 'Cancel claim')}
            onClick={() => {
              const dispose = showModal('close-claim-modal', {
                title: t('cancelClaim', 'Cancel Claim'),
                patient_uuid: claim?.patient?.uuid,
                onClose: () => {
                  dispose();
                },
                controlSize: { controlSize },
              });
              return dispose;
            }}
          />
          <OverflowMenuItem
            hasDivider
            isDelete
            itemText={t('resubmitClaim', 'Resubmit Claim')}
            onClick={() => {
              const dispose = showModal('resubmit-claim-line-modal', {
                patient_uuid: claim?.patient?.uuid,
                onClose: () => {
                  dispose();
                },
                controlSize: { controlSize },
              });
              return dispose;
            }}
          />
        </>
      </OverflowMenu>
    ),
  }));

  if (isLoading) {
    return (
      <div className={styles.dataTableSkeleton}>
        <DataTableSkeleton
          headers={headers}
          rowCount={5}
          columnCount={headers.length}
          zebra
          showToolbar={false}
          showHeader={false}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.emptyState}>
        <EmptyState headerTitle={title} displayText={t('errorLoadingClaims', 'Error loading claims')} />
      </div>
    );
  }

  if (!claims.length) {
    return (
      <div className={styles.emptyState}>
        <EmptyState headerTitle={emptyStateHeader} displayText={emptyStateText} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <DataTable rows={tableRows} headers={headers} useZebraStyles isSortable>
        {({ rows, headers, getHeaderProps, getRowProps, getTableProps, getExpandHeaderProps }) => (
          <TableContainer title={title}>
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  <TableExpandHeader enableToggle {...getExpandHeaderProps()} />
                  {headers.map((header) => (
                    <TableHeader key={header.key} {...getHeaderProps({ header })}>
                      {header.header}
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const claim = claims.find((c) => c.uuid === row.id);
                  return (
                    <React.Fragment key={row.id}>
                      <TableExpandRow {...getRowProps({ row })}>
                        {row.cells.map((cell) => {
                          if (cell.info.header === 'status') {
                            return <TableCell key={cell.id}>{claim ? getStatusBadge(claim) : '—'}</TableCell>;
                          }
                          if (cell.info.header === 'serviceType') {
                            const st = claim?.serviceType;
                            return (
                              <TableCell key={cell.id}>
                                {st ? <Tag type={st === 'INPATIENT' ? 'blue' : 'gray'}>{st}</Tag> : '—'}
                              </TableCell>
                            );
                          }
                          return <TableCell key={cell.id}>{cell.value}</TableCell>;
                        })}
                      </TableExpandRow>
                      <TableExpandedRow colSpan={headers.length + 1}>
                        {claim ? <ShifExpandedRow claim={claim} /> : null}
                      </TableExpandedRow>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
      <Pagination
        page={currentPage}
        pageSize={PAGE_SIZE}
        pageSizes={pageSizes}
        totalItems={claims.length}
        onChange={({ page }) => goTo(page)}
      />
    </div>
  );
};

export default ClaimsTable;
