import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DataTable,
  InlineLoading,
  InlineNotification,
  OverflowMenu,
  OverflowMenuItem,
  Pagination,
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

import { useBill } from '../../billing.resource';
import { MappedBill } from '../../types';
import { partitionByTab, syncClaim, usePatientClaims } from './claims-main.resource';
import styles from './claims-main.scss';
import { ClaimTabKey, PatientClaim, PatientClaimDiagnosis, PatientClaimIntervention } from './type';
import { getPatientUuidFromUrl } from '../../prompt-payment/prompt-payment-modal.component';
import { CardHeader, EmptyState } from '@openmrs/esm-patient-common-lib';
import { DocumentAdd, DocumentPdf, Renew, Upload, UserMultiple } from '@carbon/react/icons';
import {
  useLayoutType,
  isDesktop as isDesktopLayout,
  useConfig,
  formatDate,
  launchWorkspace2,
  restBaseUrl,
  useVisit,
  showModal,
  showSnackbar,
} from '@openmrs/esm-framework';
import { BillingConfig } from '../../config-schema';
import { useCurrencyFormatting } from '../../helpers/currency';
import { TFunction } from 'i18next';
import {
  useClaimAttachments,
  retireClaimAttachment,
  moveClaimToResubmit,
} from './claim-workspaces/attachements/claim-attachments-resource';
import { useClaimDoctors } from './claim-workspaces/doctors/claim-doctors-resource';
import { PREAUTH_TYPE_COLORS } from '../claims-management/table/virtual-claim-preauth/constants';

interface ClaimsMainProps {
  bill: MappedBill;
}

type ClaimsContextValue = {
  patientUuid: string;
  receiptNumber: string;
  visitUuid: string;
  mutate: () => void;
  bill: MappedBill;
};

const ClaimsContext = React.createContext<ClaimsContextValue | null>(null);

function useClaimsContext(): ClaimsContextValue {
  const context = React.useContext(ClaimsContext);
  if (!context) {
    throw new Error('useClaimsContext must be used within a ClaimsContext.Provider');
  }
  return context;
}

const ClaimMainComponent: React.FC<ClaimsMainProps> = ({ bill }) => {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const isDesktop = isDesktopLayout(layout);
  const patientUuid = getPatientUuidFromUrl();
  const { detailedViewPageSize } = useConfig<BillingConfig>();
  const { activeVisit } = useVisit(patientUuid);
  const visitUuid = activeVisit?.uuid;
  const { bill: internalBill } = useBill(bill.uuid);
  const receiptNumber = internalBill?.receiptNumber;
  const { claims, error, mutate } = usePatientClaims(patientUuid);
  const { pending, sent, resubmission, closed, paid } = useMemo(() => {
    const buckets: Record<ClaimTabKey, Array<PatientClaim>> = {
      pending: [],
      sent: [],
      resubmission: [],
      closed: [],
      paid: [],
    };
    for (const c of claims) {
      buckets[partitionByTab(c)].push(c);
    }
    return buckets;
  }, [claims]);

  const contextValue = useMemo<ClaimsContextValue>(
    () => ({
      patientUuid: patientUuid ?? '',
      receiptNumber: receiptNumber ?? '',
      visitUuid: visitUuid ?? '',
      mutate,
      bill,
    }),
    [patientUuid, receiptNumber, visitUuid, mutate, bill],
  );

  return (
    <ClaimsContext.Provider value={contextValue}>
      <div className={styles.mainContainer}>
        <div className={styles.tabsContainer}>
          {error && (
            <EmptyState
              headerTitle={t('failedToLoadClaims', 'Failed to load claims')}
              displayText={t('LoadClaims', 'loaded claims')}
            />
          )}
          <Tabs>
            <TabList scrollDebounceWait={200}>
              <Tab>
                {t('pending', 'Pending')} ({pending.length})
              </Tab>
              <Tab>
                {t('sent', 'Sent')} ({sent.length})
              </Tab>
              <Tab>
                {t('pendingResubmission', 'Pending resubmission')} ({resubmission.length})
              </Tab>
              <Tab>
                {t('closed', 'Closed')} ({closed.length})
              </Tab>
              <Tab>
                {t('paidClaims', 'Paid')} ({paid.length})
              </Tab>
            </TabList>

            <TabPanels>
              <TabPanel>
                <ClaimsTable
                  claims={pending}
                  tab="pending"
                  isDesktop={isDesktop}
                  defaultPageSize={detailedViewPageSize}
                  emptyMessage={t('noPendingClaims', 'No pending claims')}
                />
              </TabPanel>
              <TabPanel>
                <ClaimsTable
                  claims={sent}
                  tab="sent"
                  isDesktop={isDesktop}
                  defaultPageSize={detailedViewPageSize}
                  emptyMessage={t('noSentClaims', 'No sent claims')}
                />
              </TabPanel>
              <TabPanel>
                <ClaimsTable
                  claims={resubmission}
                  tab="resubmission"
                  isDesktop={isDesktop}
                  defaultPageSize={detailedViewPageSize}
                  emptyMessage={t('noResubmissionClaims', 'No claims pending resubmission')}
                />
              </TabPanel>
              <TabPanel>
                <ClaimsTable
                  claims={closed}
                  tab="closed"
                  isDesktop={isDesktop}
                  defaultPageSize={detailedViewPageSize}
                  emptyMessage={t('noClosedClaims', 'No closed claims')}
                />
              </TabPanel>
              <TabPanel>
                <ClaimsTable
                  claims={paid}
                  tab="paid"
                  isDesktop={isDesktop}
                  defaultPageSize={detailedViewPageSize}
                  emptyMessage={t('noPaidClaims', 'No paid claims')}
                />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </div>
      </div>
    </ClaimsContext.Provider>
  );
};

function parseDiagnosisError(raw: string): string {
  const jsonStart = raw.indexOf('{');
  if (jsonStart === -1) {
    return raw;
  }
  const prefix = raw.slice(0, jsonStart).replace(/:\s*$/, '').trim();
  try {
    const parsed = JSON.parse(raw.slice(jsonStart));
    const messages: string[] = [];
    for (const val of Object.values(parsed)) {
      if (Array.isArray(val)) {
        val.forEach((v) => typeof v === 'string' && messages.push(v));
      } else if (typeof val === 'string') {
        messages.push(val);
      }
    }
    if (messages.length) {
      return prefix ? `${prefix}: ${messages.join('; ')}` : messages.join('; ');
    }
  } catch {
    // fall through
  }
  return raw;
}

function parseSyncErrorMessage(raw: string): string {
  const jsonStart = raw.indexOf('{');
  if (jsonStart !== -1) {
    try {
      const parsed = JSON.parse(raw.slice(jsonStart));
      if (typeof parsed?.message === 'string' && parsed.message.trim()) {
        return parsed.message.trim();
      }
    } catch {
      // fall through to raw string handling
    }
  }
  return raw.replace(/^HTTP \d+:\s*/, '').replace(/\n.*$/, '');
}

const renderPayerStatus = (claim: PatientClaim, tab: ClaimTabKey, t: TFunction): React.ReactNode => {
  if (claim.payer_workflow_state) {
    return (
      <div className={styles.payerStatusCell}>
        <PayerStatusTag state={claim.payer_workflow_state} />
      </div>
    );
  }

  const providerState = (claim.provider_workflow_state ?? '').toUpperCase();

  switch (tab) {
    case 'pending':
      return <span className={styles.mutedStatus}>{t('notYetSubmitted', 'Not yet submitted')}</span>;

    case 'sent':
      return <Tag type="cyan">{t('awaitingPayerReview', 'AWAITING_PAYER_REVIEW')}</Tag>;

    case 'resubmission':
      return (
        <span className={styles.mutedStatus}>
          {providerState === 'FAILED_TO_SUBMIT'
            ? t('submitFailedRetry', 'SUBMIT_FAILED_RETRY')
            : t('rejectedNeedsAction', 'REJECTED_NEED_ACTION')}
        </span>
      );

    case 'closed':
      return <span className={styles.mutedStatus}>{t('claimClosed', 'CLOSED')}</span>;

    case 'paid':
      return (
        <Tag size="sm" type="green">
          {t('paid', 'PAID')}
        </Tag>
      );

    default:
      return <span className={styles.mutedStatus}>—</span>;
  }
};

const ClaimsTable: React.FC<{
  claims: Array<PatientClaim>;
  tab: ClaimTabKey;
  isDesktop: boolean;
  defaultPageSize: number;
  emptyMessage: string;
}> = ({ claims, tab, isDesktop, defaultPageSize, emptyMessage }) => {
  const { t } = useTranslation();
  const { patientUuid, receiptNumber, mutate } = useClaimsContext();
  const showSubmitColumn = tab === 'pending' || tab === 'resubmission';

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => defaultPageSize || 10);
  const [syncingClaimIds, setSyncingClaimIds] = useState<Set<string>>(new Set());

  const pageSizeOptions = useMemo(
    () => Array.from(new Set([pageSize, 10, 20, 30, 40, 50])).sort((a, b) => a - b),
    [pageSize],
  );

  const totalItems = claims.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const effectivePage = Math.min(currentPage, totalPages);

  const paginatedClaims = useMemo(() => {
    const start = (effectivePage - 1) * pageSize;
    return claims.slice(start, start + pageSize);
  }, [claims, effectivePage, pageSize]);

  const headers = useMemo(() => {
    const base = [
      { key: 'date_created', header: t('dateCreated', 'Date created') },
      { key: 'authorization_code', header: t('authorizationCode', 'Authorization code') },
      { key: 'service_type', header: t('serviceType', 'Service type') },
      { key: 'invoice_number', header: t('invoiceNumber', 'Invoice number') },
      { key: 'provider_workflow_state', header: t('claimStatus', 'Claim status') },
      { key: 'payer_workflow_state', header: t('payerStatus', 'Payer') },
    ];
    base.push({ key: 'action', header: '' });
    return base;
  }, [t]);

  const handleSubmitClaim = (claim: PatientClaim) => {
    const isResubmit = tab === 'resubmission';
    const isFailedToSubmit = claim.provider_workflow_state === 'FAILED_TO_SUBMIT';
    const totalAmount = (claim.bill_lines ?? []).reduce((acc, bl) => acc + (Number(bl.line_total_amount) || 0), 0);

    launchWorkspace2(
      'claim-submission-workspace',
      {
        workspaceTitle: isResubmit ? t('resubmit', 'Resubmit') : t('submit', 'Submit'),
        consentToken: claim.authorization_code,
        invoiceNumber: receiptNumber ?? '',
        serviceType: claim.service_type,
        patientUuid,
        patientCRId: claim.member_number ?? '',
        interventions: (claim.interventions ?? []).map((i) => i.intervention_code),
        paymentMechanism: claim.interventions?.[0]?.payment_mechanism,
        isResubmission: isResubmit,
        providerWorkflowState: claim.provider_workflow_state,
        skipAuthorization: isFailedToSubmit,
        totalAmount,
        preview: {
          interventions: (claim.interventions ?? []).map((i) => ({
            intervention_code: i.intervention_code,
            intervention_name: i.intervention_name,
            preauth_type: i.preauth_type,
            payment_mechanism: i.payment_mechanism,
          })),
          diagnoses: (claim.diagnoses ?? []).map((d) => ({
            icd_code: d.icd_code,
            icd_description: d.icd_description,
            status: d.status,
          })),
          billLines: (claim.bill_lines ?? []).map((bl) => ({
            item_name: bl.item_name,
            intervention_code: bl.intervention_code,
            line_total_amount: bl.line_total_amount,
          })),
        },
        mutate,
      },
      {},
      {},
    );
  };

  const handleSyncClaim = useCallback(
    async (claimId: string, authorizationCode: string) => {
      setSyncingClaimIds((prev) => new Set(prev).add(claimId));
      try {
        await syncClaim(authorizationCode);
        mutate();
        showSnackbar({
          title: t('claimSynced', 'Claim synced'),
          subtitle: t('claimSyncedSubtitle', 'Claim details have been updated.'),
          kind: 'success',
        });
      } catch (error: any) {
        showSnackbar({
          title: t('claimSyncFailed', 'Could not sync claim'),
          subtitle: error?.message,
          kind: 'error',
        });
      } finally {
        setSyncingClaimIds((prev) => {
          const next = new Set(prev);
          next.delete(claimId);
          return next;
        });
      }
    },
    [mutate, t],
  );

  const claimsById = useMemo(() => {
    const map = new Map<string, PatientClaim>();
    paginatedClaims.forEach((claim, index) => {
      map.set(String(claim.id ?? `claim-${index}`), claim);
    });
    return map;
  }, [paginatedClaims]);

  const tableRows = useMemo(
    () =>
      paginatedClaims.map((claim, index) => {
        const row: Record<string, any> = {
          id: String(claim.id ?? `claim-${index}`),
          date_created: formatDate(new Date(claim.date_created), { mode: 'wide', time: true }),
          authorization_code: claim.authorization_code,
          service_type: claim.service_type,
          invoice_number: claim.invoice_number,
          provider_workflow_state: <StatusTag stage={claim.provider_workflow_state} />,
          payer_workflow_state: renderPayerStatus(claim, tab, t),
        };
        const isDxEffectivelyResolved = (dx: NonNullable<typeof claim.diagnoses>[number]): boolean => {
          if (dx.is_resolved) {
            return true;
          }
          if (!dx.intervention_code) {
            return false;
          }
          return (claim.diagnoses ?? []).some(
            (sibling) =>
              sibling.status === 'ATTACHED' &&
              sibling.intervention_code === dx.intervention_code &&
              sibling.id !== dx.id,
          );
        };
        const hasDiagnosisErrors = (claim.diagnoses ?? []).some(
          (dx) => !!dx.sha_error_message && dx.status !== 'ATTACHED' && !isDxEffectivelyResolved(dx),
        );
        const isResubmit = tab === 'resubmission';
        const claimId = row.id;
        const isSyncing = syncingClaimIds.has(claimId);
        row.action = isSyncing ? (
          <div className={styles.rowActions}>
            <InlineLoading description={t('claimSyncing', 'Updating claim details…')} />
          </div>
        ) : (
          <div className={styles.rowActions}>
            {showSubmitColumn && (
              <Button
                size="sm"
                kind={isResubmit ? 'danger--tertiary' : 'primary'}
                onClick={() => handleSubmitClaim(claim)}
                renderIcon={isResubmit ? Renew : Upload}
                disabled={hasDiagnosisErrors}
                title={
                  hasDiagnosisErrors ? t('fixDiagnosisErrors', 'Fix diagnosis errors before submitting') : undefined
                }>
                {isResubmit ? t('resubmit', 'Resubmit') : t('submit', 'Submit')}
              </Button>
            )}
            <OverflowMenu size="sm" flipped aria-label={t('moreActions', 'More actions')}>
              {tab === 'pending' && (
                <OverflowMenuItem
                  itemText={t('cancel', 'Cancel')}
                  isDelete
                  onClick={() =>
                    launchWorkspace2(
                      'claim-submission-workspace',
                      {
                        workspaceTitle: t('cancelClaim', 'Cancel'),
                        isCancelMode: true,
                        patientUuid,
                        consentToken: claim.authorization_code,
                        invoiceNumber: claim.invoice_number ?? '',
                        serviceType: claim.service_type ?? '',
                        patientCRId: claim.member_number ?? '',
                        interventions: [],
                        mutate,
                      },
                      {},
                      {},
                    )
                  }
                />
              )}
              <OverflowMenuItem
                itemText={t('sync', 'Sync')}
                onClick={() => handleSyncClaim(claimId, claim.authorization_code)}
              />
            </OverflowMenu>
          </div>
        );
        return row;
      }),
    [paginatedClaims, t, showSubmitColumn, tab, mutate, syncingClaimIds, handleSyncClaim],
  );

  return (
    <>
      <CardHeader title={t('claims', 'Claims')}>{null}</CardHeader>
      <DataTable
        headers={headers}
        rows={(tableRows ?? []) as any}
        size={isDesktop ? 'sm' : 'lg'}
        useZebraStyles
        isSortable>
        {({
          rows,
          headers: carbonHeaders,
          getHeaderProps,
          getRowProps,
          getExpandHeaderProps,
          getExpandedRowProps,
          getTableProps,
        }) => (
          <>
            <TableContainer>
              <Table {...getTableProps()}>
                <TableHead>
                  <TableRow>
                    <TableExpandHeader enableToggle {...getExpandHeaderProps()} />
                    {carbonHeaders.map((header) => (
                      <TableHeader {...getHeaderProps({ header })} key={header.key}>
                        {header.header}
                      </TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => {
                    const claim = claimsById.get(row.id);
                    return (
                      <React.Fragment key={row.id}>
                        <TableExpandRow {...getRowProps({ row })}>
                          {row.cells.map((cell) => (
                            <TableCell key={cell.id}>{cell?.value}</TableCell>
                          ))}
                        </TableExpandRow>
                        {row.isExpanded && claim ? (
                          <TableExpandedRow {...getExpandedRowProps({ row })} colSpan={carbonHeaders.length + 1}>
                            <ClaimDetailsPanel claim={claim} tab={tab} />
                          </TableExpandedRow>
                        ) : (
                          <TableExpandedRow className={styles.hiddenRow} colSpan={carbonHeaders.length + 1} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {rows.length === 0 ? (
              <div className={styles.tileContainer}>
                <EmptyState headerTitle={emptyMessage} displayText={emptyMessage} />
              </div>
            ) : null}

            {totalItems > 0 && (
              <Pagination
                backwardText={t('previousPage', 'Previous page')}
                forwardText={t('nextPage', 'Next page')}
                itemsPerPageText={t('itemsPerPage', 'Items per page:')}
                page={effectivePage}
                pageSize={pageSize}
                pageSizes={pageSizeOptions}
                totalItems={totalItems}
                size={isDesktop ? 'sm' : 'lg'}
                onChange={({ pageSize: newPageSize, page }) => {
                  if (newPageSize !== pageSize) {
                    setPageSize(newPageSize);
                    setCurrentPage(1);
                  } else if (page !== currentPage) {
                    setCurrentPage(page);
                  }
                }}
              />
            )}
          </>
        )}
      </DataTable>
    </>
  );
};

const ClaimDetailsPanel: React.FC<{
  claim: PatientClaim;
  tab: ClaimTabKey;
}> = ({ claim, tab }) => {
  const { t } = useTranslation();
  const { patientUuid, receiptNumber, bill, visitUuid, mutate } = useClaimsContext();
  const { format: formatCurrency } = useCurrencyFormatting();
  const { interventions: attachmentInterventions, mutate: mutateAttachments } = useClaimAttachments(
    claim.authorization_code,
  );
  const { doctors, mutate: mutateDoctors } = useClaimDoctors(claim.authorization_code);
  const attachmentsByCode = useMemo(() => {
    const map = new Map<string, (typeof attachmentInterventions)[number]>();
    for (const iv of attachmentInterventions) {
      map.set(iv.intervention_code, iv);
    }
    return map;
  }, [attachmentInterventions]);

  const combinedMutate = useCallback(() => {
    mutate();
    mutateAttachments();
    mutateDoctors();
  }, [mutate, mutateAttachments, mutateDoctors]);
  const isEditable =
    claim.provider_workflow_state === 'DRAFT' ||
    claim.provider_workflow_state === 'DRAFT_RESUBMIT' ||
    claim.provider_workflow_state === 'DRAFT_RESUBMIT_DOCUMENTS' ||
    claim.provider_workflow_state === 'DRAFT_RESUBMISSION';
  const canMoveToResubmit = claim.provider_workflow_state === 'SUBMITTED' && claim.payer_workflow_state === 'SENT_BACK';
  const handleMoveToResubmit = useCallback(async () => {
    const result = await moveClaimToResubmit({
      consentToken: claim.authorization_code,
      t,
    });
    if (!result.ok) {
      showSnackbar({
        title: t('moveToResubmitFailed', 'Could not open claim for changes'),
        subtitle: result.error,
        kind: 'error',
      });
      return;
    }
    combinedMutate();
    showSnackbar({
      title: result.alreadyOpenForEdit
        ? t('claimAlreadyOpen', 'Claim is already open for changes')
        : t('claimOpenedForChanges', 'Claim opened for changes'),
      subtitle: t(
        'claimOpenedForChangesSubtitle',
        'You can now replace or add attachments, edit lines, and submit back to SHA when ready.',
      ),
      kind: 'success',
    });
  }, [claim.authorization_code, combinedMutate, t]);

  const preauthsByIntervention = useMemo(() => {
    const map = new Map<string, Array<(typeof claim.preauths)[number]>>();
    for (const p of claim.preauths ?? []) {
      const key = p.intervention_code ?? '__unmapped__';
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(p);
    }
    return map;
  }, [claim.preauths]);

  const uniqueDiagnoses = useMemo(() => {
    const seen = new Map<string, PatientClaimDiagnosis>();
    for (const dx of claim.diagnoses ?? []) {
      const key = dx.icd_code;
      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, dx);
        continue;
      }
      const dxScore = (dx.upstream_guid ? 2 : 0) + (dx.status === 'ATTACHED' ? 1 : 0);
      const exScore = (existing.upstream_guid ? 2 : 0) + (existing.status === 'ATTACHED' ? 1 : 0);
      const mergedError = dx.sha_error_message || existing.sha_error_message;
      if (dxScore > exScore) {
        seen.set(key, { ...dx, sha_error_message: mergedError });
      } else {
        seen.set(key, { ...existing, sha_error_message: mergedError });
      }
    }
    return Array.from(seen.values());
  }, [claim.diagnoses]);

  const totalBilled = (claim.bill_lines ?? []).reduce((acc, bl) => acc + (Number(bl.line_total_amount) || 0), 0);
  const canUploadAttachments = tab === 'pending' || tab === 'resubmission' || tab === 'sent';
  const canManageInterventions = tab === 'pending' || tab === 'resubmission';
  const documentParams = useMemo<Record<string, string | undefined>>(
    () => ({
      patientUuid,
      billUuid: bill.uuid,
      billId: bill.id.toString(),
      visitUuid,
      consentToken: claim.authorization_code,
      authorizationCode: claim.authorization_code,
      invoiceNumber: claim.invoice_number ?? receiptNumber ?? undefined,
      memberNumber: claim.member_number ?? undefined,
      receiptNumber: receiptNumber,
    }),
    [
      patientUuid,
      bill.uuid,
      visitUuid,
      claim.authorization_code,
      claim.invoice_number,
      claim.member_number,
      receiptNumber,
    ],
  );

  const handleGenerateForIntervention = useCallback(
    (iv: PatientClaimIntervention) => {
      const ivAttachments = attachmentsByCode.get(iv.intervention_code);
      const alreadyUploaded = (ivAttachments?.attachments ?? [])
        .map((a) => a.document_type)
        .filter((d): d is string => !!d);
      const uploadedAttachmentUuids = Object.fromEntries(
        (ivAttachments?.attachments ?? [])
          .filter((a) => a.document_type && a.uuid)
          .map((a) => [a.document_type, a.uuid]),
      );

      launchWorkspace2(
        'claim-document-generator-workspace',
        {
          workspaceTitle: t('generateDocuments', 'Generate documents'),
          consentToken: claim.authorization_code,
          interventionCode: iv.intervention_code,
          interventionName: iv.intervention_name,
          documentTypes: iv.applicable_document_types ?? [],
          alreadyUploadedTypes: alreadyUploaded,
          uploadedAttachmentUuids,
          params: { ...documentParams, interventionCode: iv.intervention_code },
          mutate: combinedMutate,
        },
        {},
        {},
      );
    },
    [claim.authorization_code, attachmentsByCode, documentParams, combinedMutate, t],
  );
  const handleUploadForIntervention = useCallback(
    (iv: PatientClaimIntervention) => {
      const ivAttachments = attachmentsByCode.get(iv.intervention_code);
      const alreadyUploaded = (ivAttachments?.attachments ?? [])
        .map((a) => a.document_type)
        .filter((d): d is string => !!d);

      launchWorkspace2(
        'claim-attachments-workspace',
        {
          workspaceTitle: t('uploadAttachments', 'Upload attachments'),
          consentToken: claim.authorization_code,
          interventionCode: iv.intervention_code,
          interventionName: iv.intervention_name,
          applicableDocumentTypes: iv.applicable_document_types ?? [],
          alreadyUploadedTypes: alreadyUploaded,
          mutate: combinedMutate,
        },
        {},
        {},
      );
    },
    [claim.authorization_code, attachmentsByCode, combinedMutate, t],
  );

  const handleReplaceAttachment = useCallback(
    (iv: PatientClaimIntervention, attachment: { uuid: string; document_type: string; filename?: string }) => {
      const dispose = showModal('replace-claim-attachment-modal', {
        documentType: attachment.document_type,
        filename: attachment.filename,
        onConfirm: async () => {
          const retireResult = await retireClaimAttachment({
            consentToken: claim.authorization_code,
            attachmentUuid: attachment.uuid,
            interventionCode: iv.intervention_code,
            t,
          });
          if (!retireResult.ok) {
            showSnackbar({
              title: t('retireFailed', 'Could not retire attachment'),
              subtitle: retireResult.error,
              kind: 'error',
            });
            return;
          }

          combinedMutate();

          showSnackbar({
            title: t('attachmentRetired', 'Attachment retired'),
            subtitle: t(
              'attachmentRetiredSubtitle',
              'SHA has cleared the previous {{type}}. Upload the replacement to complete.',
              { type: attachment.document_type.replace(/_/g, ' ') },
            ),
            kind: 'info',
          });

          launchWorkspace2(
            'claim-attachments-workspace',
            {
              workspaceTitle: t('uploadReplacementAttachment', 'Upload replacement attachment'),
              consentToken: claim.authorization_code,
              interventionCode: iv.intervention_code,
              interventionName: iv.intervention_name,
              applicableDocumentTypes: [attachment.document_type],
              alreadyUploadedTypes: [],
              preselectedDocumentType: attachment.document_type,
              replacementNotice: {
                documentType: attachment.document_type,
                filename: attachment.filename,
              },
              mutate: combinedMutate,
            },
            {},
            {},
          );
        },
        closeModal: () => dispose(),
      });
    },
    [claim.authorization_code, combinedMutate, t],
  );

  const handleAddDocumentForIntervention = useCallback(
    (iv: PatientClaimIntervention, remainingDocTypes: ReadonlyArray<string>) => {
      launchWorkspace2(
        'claim-attachments-workspace',
        {
          workspaceTitle: t('addMissingDocument', 'Add missing document'),
          consentToken: claim.authorization_code,
          interventionCode: iv.intervention_code,
          interventionName: iv.intervention_name,
          applicableDocumentTypes: remainingDocTypes,
          alreadyUploadedTypes: [],
          mutate: combinedMutate,
        },
        {},
        {},
      );
    },
    [claim.authorization_code, combinedMutate, t],
  );

  return (
    <div className={styles.expandedContent}>
      {claim.sync_status === 'ERROR' && claim.sync_error_message && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title={t('syncError', 'Sync error')}
          subtitle={parseSyncErrorMessage(claim.sync_error_message)}
          className={styles.syncErrorNotification}
        />
      )}
      {claim.provider_workflow_state === 'DRAFT_RESUBMIT' && (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title={t('claimOpenForChanges', 'Claim is open for changes')}
          subtitle={t('claimOpenForChangesSubtitle', 'You can do edits, and submit back to SHA when ready')}
          className={styles.payerNotice}
        />
      )}

      {(claim.payer_workflow_state ||
        (claim.payer_notes?.length ?? 0) > 0 ||
        (claim.payer_transitions?.length ?? 0) > 0) && (
        <section className={styles.payerActivitySection}>
          {claim.payer_workflow_state === 'SENT_BACK' && (
            <div className={styles.payerNoticeWrap}>
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                title={t('shaBouncedClaim', 'SHA returned this claim for action')}
                subtitle={claim.payer_workflow_display_name ?? ''}
                className={styles.payerNotice}
              />
              {canMoveToResubmit && (
                <div className={styles.payerNoticeActions}>
                  <Button size="sm" kind="danger--tertiary" renderIcon={Renew} onClick={handleMoveToResubmit}>
                    {t('openForChanges', 'Open for changes')}
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className={styles.payerActivityCard}>
            <h6 className={styles.detailsCardTitle}>{t('payerActivity', 'Payer activity')}</h6>
            {(claim.payer_notes?.length ?? 0) > 0 && (
              <>
                <h6 className={styles.detailsCardSubtitle}>
                  {t('payerNotes', 'Notes from SHA')} ({claim.payer_notes?.length})
                </h6>
                <ul className={styles.payerNotesList}>
                  {(claim.payer_notes ?? []).map((n) => (
                    <li key={n.id ?? n.guid} className={styles.payerNoteRow}>
                      <p className={styles.payerNoteText}>{n.note ?? '—'}</p>
                      <div className={styles.payerNoteMeta}>
                        {n.workflowState && <PayerStatusTag state={n.workflowState} />}
                        {n.author && <span className={styles.payerNoteAuthor}>{n.author}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {(claim.payer_transitions?.length ?? 0) > 0 && (
              <>
                <h6 className={styles.detailsCardSubtitle}>
                  {t('payerTimeline', 'Timeline')} ({claim.payer_transitions?.length})
                </h6>
                <ul className={styles.payerTransitionsList}>
                  {(claim.payer_transitions ?? []).map((tx) => (
                    <li key={tx.id ?? tx.guid} className={styles.payerTransitionRow}>
                      <span className={styles.payerTransitionWhen}>
                        {tx.transitionDate
                          ? formatDate(new Date(tx.transitionDate), { mode: 'standard', time: true })
                          : '—'}
                      </span>
                      <div className={styles.payerTransitionStates}>
                        {tx.workflowStateFrom && (
                          <>
                            <PayerStatusTag state={tx.workflowStateFrom} />
                            <span className={styles.payerTransitionArrow}>→</span>
                          </>
                        )}
                        <PayerStatusTag state={tx.workflowStateTo ?? ''} />
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>
      )}

      {canUploadAttachments && (
        <div className={styles.detailsToolbar}>
          <Button
            size="sm"
            kind="ghost"
            renderIcon={UserMultiple}
            onClick={() =>
              launchWorkspace2(
                'claim-doctors-workspace',
                {
                  workspaceTitle: t('addDoctorsToClaim', 'Add doctors to claim'),
                  consentToken: claim.authorization_code,
                  claimAuthorizationCode: claim.authorization_code,
                  mutate: combinedMutate,
                },
                {},
                {},
              )
            }>
            {t('addDoctors', 'Add doctors')}
          </Button>
        </div>
      )}

      <div className={styles.detailsGrid}>
        <section className={styles.detailsCard}>
          <h6 className={styles.detailsCardTitle}>{t('claimSummary', 'Claim summary')}</h6>

          <KV label={t('payer', 'Payer')} value={claim.payer_name ?? '—'} />
          <KV label={t('scheme', 'Scheme')} value={`${claim.scheme_code} — ${claim.scheme_name}`} />
          <KV label={t('memberNumber', 'Member number')} value={claim.member_number ?? '—'} />
          <KV label={t('serviceType', 'Service type')} value={claim.service_type} />
          <KV label={t('useType', 'Use type')} value={claim.use_type ?? '—'} />
          <KV
            label={t('startDate', 'Start date')}
            value={claim.start_date ? formatDate(new Date(claim.start_date), { mode: 'standard' }) : '—'}
          />
          <KV
            label={t('endDate', 'End date')}
            value={claim.end_date ? formatDate(new Date(claim.end_date), { mode: 'standard' }) : '—'}
          />
          <KV label={t('invoiceNumber', 'Invoice number')} value={claim.invoice_number ?? '—'} />
          <KV label={t('totalBilled', 'Total billed')} value={formatCurrency(totalBilled)} highlight />
        </section>

        <section className={styles.detailsCard}>
          <div className={styles.detailsCardHeaderRow}>
            <h6 className={styles.detailsCardTitle}>
              {t('interventions', 'Interventions')} ({(claim.interventions ?? []).length})
            </h6>
            {canManageInterventions && (
              <Button
                size="sm"
                kind="ghost"
                renderIcon={DocumentAdd}
                onClick={() =>
                  launchWorkspace2(
                    'manage-interventions-workspace',
                    {
                      workspaceTitle: t('manageInterventions', 'Manage interventions'),
                      authorizationCode: claim.authorization_code,
                      patientCRId: claim.member_number ?? '',
                      interventions: claim.interventions ?? [],
                      mutate: combinedMutate,
                    },
                    {},
                    {},
                  )
                }>
                {t('manageInterventions', 'Manage interventions')}
              </Button>
            )}
          </div>

          {(claim.interventions ?? []).length === 0 ? (
            <p className={styles.muted}>{t('noInterventions', 'No interventions on this claim')}</p>
          ) : (
            <ul className={styles.interventionList}>
              {claim.interventions.map((iv) => {
                const preauths = preauthsByIntervention.get(iv.intervention_code) ?? [];
                const mech = (iv.payment_mechanism ?? '').toUpperCase();
                const isPerDiem = mech.includes('DIEM');
                const isCapitation = mech === 'CAPITATION';
                const ivAttData = attachmentsByCode.get(iv.intervention_code);
                const uploadedAttachments = ivAttData?.attachments ?? [];
                const uploadedTypes = new Set(uploadedAttachments.map((a) => a.document_type));
                const requiredDocs = iv.applicable_document_types ?? [];
                const hasAnyRequiredOrUploaded = requiredDocs.length > 0 || uploadedAttachments.length > 0;
                const preauthType = (iv.preauth_type ?? '').toUpperCase();
                const showPreauthType = preauthType && preauthType !== 'NORMAL' && preauthType !== 'NONE';

                return (
                  <li key={iv.id} className={styles.interventionListItem}>
                    <div className={styles.interventionHeader}>
                      <code className={styles.interventionCode}>{iv.intervention_code}</code>
                      <Tag size="sm" type={isPerDiem ? 'teal' : isCapitation ? 'blue' : 'gray'}>
                        {isPerDiem
                          ? t('perDiem', 'Per diem')
                          : isCapitation
                          ? t('capitation', 'Capitation')
                          : mech || t('feeForService', 'Fee-for-service')}
                      </Tag>
                      {iv.status !== 'ACTIVE' && (
                        <Tag size="sm" type="warm-gray">
                          {iv.status}
                        </Tag>
                      )}
                    </div>
                    <div className={styles.interventionName}>
                      <p>{iv.intervention_name}</p>
                    </div>

                    <div className={styles.interventionMeta}>
                      {isPerDiem ? (
                        <>
                          <span className={styles.metaItem}>
                            {t('accrued', 'Accrued')}: {formatCurrency(Number(iv.accrued_amount ?? 0))}
                          </span>
                          <span className={styles.metaItem}>
                            {t('days', 'Days')}: {iv.accrued_days ?? 0}
                          </span>
                        </>
                      ) : (
                        <span className={styles.metaItem}>
                          {t('tariff', 'Tariff')}: {formatCurrency(Number(iv.keph_level_tariff ?? 0))}
                        </span>
                      )}
                      {iv.needs_preauth && (
                        <span className={styles.metaItem}>
                          <Tag size="sm" type={iv.preauth_exist ? 'green' : 'magenta'}>
                            {iv.preauth_exist
                              ? t('preauthAttached', 'Preauth attached')
                              : t('preauthRequired', 'Preauth required')}
                          </Tag>
                        </span>
                      )}
                      {showPreauthType && (
                        <span className={styles.metaItem}>
                          <Tag size="sm" type={PREAUTH_TYPE_COLORS[preauthType] ?? 'gray'}>
                            {t('preauthTypeTag', '{{type}} preauth', { type: preauthType })}
                          </Tag>
                        </span>
                      )}
                    </div>

                    {preauths.length > 0 && (
                      <div className={styles.preauthAttached}>
                        {preauths.map((p) => (
                          <div key={p.id} className={styles.preauthRow}>
                            <span className={styles.preauthLabel}>{t('preauthLabel', 'Preauth')}:</span>
                            <Tag
                              size="sm"
                              type={
                                p.status === 'FINALISED'
                                  ? 'green'
                                  : p.status?.startsWith('REJECTED')
                                  ? 'red'
                                  : 'warm-gray'
                              }>
                              {p.status}
                            </Tag>
                            <span className={styles.preauthType}>{p.preauth_type}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {iv.switched_intervention && iv.switched_from_code && (
                      <p className={styles.switchNote}>
                        {t('switchedFrom', 'Switched from')}: <code>{iv.switched_from_code}</code>
                      </p>
                    )}

                    {(hasAnyRequiredOrUploaded || canUploadAttachments) && (
                      <div className={styles.ivAttachmentsSection}>
                        <div className={styles.ivAttachmentsHeader}>
                          <span className={styles.ivAttachmentsLabel}>{t('attachments', 'Attachments')}</span>
                          <div className={styles.ivAttachmentsActions}>
                            {canUploadAttachments && (
                              <Button
                                size="sm"
                                kind="ghost"
                                disabled={
                                  (uploadedTypes.size > 0 && requiredDocs.every((d) => uploadedTypes.has(d))) ||
                                  requiredDocs?.length === 0
                                }
                                renderIcon={DocumentAdd}
                                onClick={() => handleUploadForIntervention(iv)}>
                                {t('uploadAttachments', 'Upload attachments')}
                              </Button>
                            )}
                            {canUploadAttachments && (
                              <Button
                                size="sm"
                                kind="ghost"
                                // disabled={
                                //   (uploadedTypes.size > 0 && requiredDocs.every((d) => uploadedTypes.has(d))) ||
                                //   requiredDocs?.length === 0
                                // }
                                renderIcon={DocumentPdf}
                                onClick={() => handleGenerateForIntervention(iv)}>
                                {t('generateDocuments', 'Generate documents')}
                              </Button>
                            )}
                            {tab === 'resubmission' &&
                              isEditable &&
                              (() => {
                                const remaining = requiredDocs.filter((d) => !uploadedTypes.has(d));
                                if (remaining.length === 0) {
                                  return null;
                                }
                                return (
                                  <Button
                                    size="sm"
                                    kind="tertiary"
                                    renderIcon={DocumentAdd}
                                    className={styles.addDocBtn}
                                    onClick={() => handleAddDocumentForIntervention(iv, remaining)}>
                                    {t('addDocumentN', '+ Add document ({{count}})', { count: remaining.length })}
                                  </Button>
                                );
                              })()}
                          </div>
                        </div>

                        {requiredDocs.length > 0 && (
                          <div className={styles.docTagsRow}>
                            {requiredDocs.map((doc) => {
                              const uploaded = uploadedTypes.has(doc);
                              return (
                                <Tag key={doc} size="sm" type={uploaded ? 'green' : 'warm-gray'}>
                                  {doc.replace(/_/g, ' ')} {uploaded ? '✓' : ''}
                                </Tag>
                              );
                            })}
                          </div>
                        )}

                        {uploadedAttachments.length > 0 && (
                          <ul className={styles.ivAttachmentList}>
                            <div className={styles.ivAttachmentRow}>
                              <span className={styles.ivAttachmentsLabel}>{t('view', 'View')}</span>
                            </div>
                            {uploadedAttachments.map((a) => (
                              <li key={a.uuid} className={styles.ivAttachmentRow}>
                                <span className={styles.ivAttachmentTitle}>{a.document_type}</span>
                                <div className={styles.attachmentActions}>
                                  {a.uuid ? (
                                    <a
                                      href={`/openmrs${restBaseUrl}/virtualclaims/billing/attachments/${a.uuid}/file`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={styles.viewLink}>
                                      {t('view', 'View')} ↗
                                    </a>
                                  ) : (
                                    <span className={styles.muted}>—</span>
                                  )}
                                  {tab === 'resubmission' && isEditable && a.uuid && (
                                    <Button
                                      size="sm"
                                      kind="ghost"
                                      renderIcon={Renew}
                                      className={styles.replaceBtn}
                                      onClick={() =>
                                        handleReplaceAttachment(iv, {
                                          uuid: a.uuid,
                                          document_type: a.document_type ?? '',
                                          filename: (a as { filename?: string }).filename,
                                        })
                                      }>
                                      {t('replace', 'Replace')}
                                    </Button>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={styles.detailsCard}>
          <h6 className={styles.detailsCardTitle}>
            {t('billLines', 'Bill lines')} ({(claim.bill_lines ?? []).length})
          </h6>

          {(claim.bill_lines ?? []).length === 0 ? (
            <p className={styles.muted}>{t('noBillLines', 'No bill lines have been sent to SHA yet')}</p>
          ) : (
            <ul className={styles.billLineList}>
              {claim.bill_lines.map((bl) => (
                <li key={bl.id} className={styles.billLineItem}>
                  <div className={styles.billLineRow}>
                    {bl.cashier_line?.billable_service_name && (
                      <span className={styles.muted}>{bl.cashier_line.billable_service_name}</span>
                    )}
                    <span className={styles.billLineAmount}>{formatCurrency(Number(bl.line_total_amount))}</span>
                  </div>
                  <div className={styles.billLineMeta}>
                    <code className={styles.billLineCode}>{bl.intervention_code}</code>
                    <span className={styles.metaItem}>{bl.item_name}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <h6 className={styles.detailsCardTitleSpaced}>
            {t('diagnoses', 'Diagnoses')} ({uniqueDiagnoses.length})
          </h6>
          {uniqueDiagnoses.length === 0 ? (
            <p className={styles.muted}>{t('noDiagnoses', 'No diagnoses attached')}</p>
          ) : (
            <ul className={styles.diagnosisList}>
              {uniqueDiagnoses.map((dx) => (
                <li key={dx.id} className={styles.diagnosisRow}>
                  <div className={styles.diagnosisMain}>
                    <code className={styles.diagnosisCode}>{dx.icd_code}</code>
                    <span className={styles.diagnosisDesc}>{dx.icd_description}</span>
                    <Tag
                      size="sm"
                      type={dx.status === 'ATTACHED' ? 'green' : dx.status === 'REJECTED' ? 'red' : 'warm-gray'}>
                      {dx.status}
                    </Tag>
                  </div>
                  {dx.sha_error_message && (
                    <p className={styles.diagnosisError}>{parseDiagnosisError(dx.sha_error_message)}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className={styles.detailsCard}>
          <h6 className={styles.detailsCardTitle}>
            {t('doctors', 'Doctors')} ({doctors.length})
          </h6>

          {doctors.length === 0 ? (
            <p className={styles.muted}>{t('noDoctorsAttached', 'No doctors attached to this claim')}</p>
          ) : (
            <ul className={styles.billLineList}>
              {doctors.map((d) => (
                <li key={d.uuid} className={styles.billLineItem}>
                  <span className={styles.muted}>{d.doctor_name}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

const KV: React.FC<{
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  highlight?: boolean;
}> = ({ label, value, mono, highlight }) => (
  <div className={styles.kvRow}>
    <span className={styles.kvLabel}>{label}</span>
    <span className={`${styles.kvValue} ${mono ? styles.kvValueMono : ''} ${highlight ? styles.kvValueHighlight : ''}`}>
      {value}
    </span>
  </div>
);

const StatusTag: React.FC<{ stage: string }> = ({ stage }) => {
  const upper = (stage ?? '').toUpperCase();
  let type: 'cool-gray' | 'warm-gray' | 'blue' | 'green' | 'red' | 'magenta' | 'cyan' = 'cool-gray';
  if (upper === 'DRAFT' || upper === 'ELECTIVE_DRAFT') {
    type = 'blue';
  } else if (upper.includes('REJECTED') || upper === 'FAILED_TO_SUBMIT' || upper === 'SENT_BACK') {
    type = 'red';
  } else if (upper === 'COMPLETED' || upper === 'PREAUTH_APPROVED' || upper === 'ELECTIVE_APPROVED') {
    type = 'green';
  } else if (upper === 'PAYER_PENDING' || upper === 'SUBMITTED') {
    type = 'cyan';
  } else if (upper.includes('PENDING')) {
    type = 'magenta';
  } else if (upper === 'CLOSED' || upper === 'CANCELLED') {
    type = 'warm-gray';
  }
  return (
    <Tag size="sm" type={type}>
      {stage}
    </Tag>
  );
};

const PayerStatusTag: React.FC<{ state: string }> = ({ state }) => {
  const upper = state.toUpperCase();
  let type: 'cool-gray' | 'green' | 'red' | 'magenta' | 'cyan' | 'warm-gray' = 'cool-gray';
  if (upper.includes('APPROVED') || upper === 'PAID') {
    type = 'green';
  } else if (upper.includes('REJECTED') || upper === 'DENIED' || upper === 'SENT_BACK') {
    type = 'red';
  } else if (upper.includes('REVIEWING') || upper.includes('PENDING')) {
    type = 'cyan';
  } else if (upper === 'CANCELLED' || upper === 'CLOSED') {
    type = 'warm-gray';
  }
  return (
    <Tag size="sm" type={type}>
      {state}
    </Tag>
  );
};

export default ClaimMainComponent;
