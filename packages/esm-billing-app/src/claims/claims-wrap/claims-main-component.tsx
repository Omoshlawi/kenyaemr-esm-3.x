import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DataTable,
  InlineNotification,
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
import { partitionByTab, usePatientClaims } from './claims-main.resource';
import styles from './claims-main.scss';
import { ClaimTabKey, PatientClaim, PatientClaimDiagnosis, PatientClaimIntervention } from './type';
import { getPatientUuidFromUrl } from '../../prompt-payment/prompt-payment-modal.component';
import { CardHeader, EmptyState } from '@openmrs/esm-patient-common-lib';
import { DocumentAdd, Renew, Upload, UserMultiple } from '@carbon/react/icons';
import {
  useLayoutType,
  isDesktop as isDesktopLayout,
  useConfig,
  formatDate,
  launchWorkspace2,
  restBaseUrl,
  useVisit,
} from '@openmrs/esm-framework';
import { BillingConfig } from '../../config-schema';
import { useCurrencyFormatting } from '../../helpers/currency';
import { TFunction } from 'i18next';
import { useClaimAttachments } from './claim-workspaces/attachements/claim-attachments-resource';
import { useClaimDoctors } from './claim-workspaces/doctors/claim-doctors-resource';

interface ClaimsMainProps {
  bill: MappedBill;
}

const ClaimMainComponent: React.FC<ClaimsMainProps> = ({ bill }) => {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const isDesktop = isDesktopLayout(layout);
  const patientUuid = getPatientUuidFromUrl();
  const { detailedViewPageSize } = useConfig<BillingConfig>();
  const { activeVisit } = useVisit(patientUuid);
  const visitUuid = activeVisit?.uuid;
  const { isLoading: isLoadingBill, bill: internalBill } = useBill(bill.uuid);
  const receiptNumber = internalBill?.receiptNumber;
  const { claims, isLoading, error, mutate } = usePatientClaims(patientUuid);
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

  return (
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
                mutate={mutate}
                t={t}
                patientUuid={patientUuid ?? ''}
                receiptNumber={receiptNumber ?? ''}
              />
            </TabPanel>
            <TabPanel>
              <ClaimsTable
                claims={sent}
                tab="sent"
                isDesktop={isDesktop}
                defaultPageSize={detailedViewPageSize}
                emptyMessage={t('noSentClaims', 'No sent claims')}
                mutate={mutate}
                t={t}
                patientUuid={patientUuid ?? ''}
                receiptNumber={receiptNumber ?? ''}
              />
            </TabPanel>
            <TabPanel>
              <ClaimsTable
                claims={resubmission}
                tab="resubmission"
                isDesktop={isDesktop}
                defaultPageSize={detailedViewPageSize}
                emptyMessage={t('noResubmissionClaims', 'No claims pending resubmission')}
                mutate={mutate}
                t={t}
                patientUuid={patientUuid ?? ''}
                receiptNumber={receiptNumber ?? ''}
              />
            </TabPanel>
            <TabPanel>
              <ClaimsTable
                claims={closed}
                tab="closed"
                isDesktop={isDesktop}
                defaultPageSize={detailedViewPageSize}
                emptyMessage={t('noClosedClaims', 'No closed claims')}
                mutate={mutate}
                t={t}
                patientUuid={patientUuid ?? ''}
                receiptNumber={receiptNumber ?? ''}
              />
            </TabPanel>
            <TabPanel>
              <ClaimsTable
                claims={paid}
                tab="paid"
                isDesktop={isDesktop}
                defaultPageSize={detailedViewPageSize}
                emptyMessage={t('noPaidClaims', 'No paid claims')}
                mutate={mutate}
                t={t}
                patientUuid={patientUuid ?? ''}
                receiptNumber={receiptNumber ?? ''}
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </div>
  );
};

const renderPayerStatus = (claim: PatientClaim, tab: ClaimTabKey, t: TFunction): React.ReactNode => {
  if (claim.payer_workflow_state) {
    return <PayerStatusTag state={claim.payer_workflow_state} />;
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
  mutate: () => void;
  t: TFunction;
  patientUuid: string;
  receiptNumber: string;
}> = ({ claims, tab, isDesktop, defaultPageSize, emptyMessage, mutate, t, patientUuid, receiptNumber }) => {
  const showActionColumn = tab === 'pending' || tab === 'resubmission';

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => defaultPageSize || 10);

  // Carbon's Pagination loops (React #301) if the active pageSize isn't one of
  // the offered pageSizes, so always include the current value in the list.
  const pageSizeOptions = useMemo(
    () => Array.from(new Set([pageSize, 10, 20, 30, 40, 50])).sort((a, b) => a - b),
    [pageSize],
  );

  const totalItems = claims.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Keep the page in range when the claim set shrinks (e.g. after a sync/mutate).
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
    if (showActionColumn) {
      base.push({ key: 'action', header: t('actionButtons', 'Action') });
    }
    return base;
  }, [t, showActionColumn]);

  const handleSubmitClaim = (claim: PatientClaim) => {
    const isResubmit = tab === 'resubmission';
    const totalAmount = (claim.bill_lines ?? []).reduce((acc, bl) => acc + (Number(bl.line_total_amount) || 0), 0);

    launchWorkspace2(
      'claim-submission-workspace',
      {
        workspaceTitle: isResubmit ? t('resubmitClaim', 'Resubmit claim') : t('submitClaim', 'Submit claim'),
        consentToken: claim.authorization_code,
        invoiceNumber: receiptNumber ?? '',
        serviceType: claim.service_type,
        patientUuid,
        patientCRId: claim.member_number ?? '',
        interventions: (claim.interventions ?? []).map((i) => i.intervention_code),
        paymentMechanism: claim.interventions?.[0]?.payment_mechanism,
        isResubmission: isResubmit,
        totalAmount,
        mutate,
      },
      {},
      {},
    );
  };

  // Stable row id -> claim lookup so sorting/pagination never misaligns the expanded row.
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
        if (showActionColumn) {
          const isResubmit = tab === 'resubmission';
          row.action = (
            <Button
              size="sm"
              kind={isResubmit ? 'danger--tertiary' : 'primary'}
              onClick={() => handleSubmitClaim(claim)}
              renderIcon={isResubmit ? Renew : Upload}>
              {isResubmit ? t('resubmitClaim', 'Resubmit claim') : t('submitClaim', 'Submit claim')}
            </Button>
          );
        }
        return row;
      }),
    [paginatedClaims, t, showActionColumn, tab],
  );

  return (
    <>
      <CardHeader title={t('claims', 'Claims')}>
        <Button
          kind="ghost"
          renderIcon={(props) => <Renew size={16} {...props} />}
          iconDescription={t('sync', 'Sync')}
          onClick={() => mutate()}>
          {t('sync', 'Sync')}
        </Button>
      </CardHeader>
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
                            <ClaimDetailsPanel claim={claim} tab={tab} mutate={mutate} t={t} />
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
  mutate: () => void;
  t: TFunction;
}> = ({ claim, tab, mutate, t }) => {
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
      if (dxScore > exScore) {
        seen.set(key, dx);
      }
    }
    return Array.from(seen.values());
  }, [claim.diagnoses]);

  const totalBilled = (claim.bill_lines ?? []).reduce((acc, bl) => acc + (Number(bl.line_total_amount) || 0), 0);
  const canUploadAttachments = tab === 'pending' || tab === 'resubmission' || tab === 'sent';
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

  return (
    <div className={styles.expandedContent}>
      {claim.sync_status === 'ERROR' && claim.sync_error_message && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title={t('syncError', 'Sync error')}
          subtitle={claim.sync_error_message.replace(/^HTTP \d+:\s*/, '').replace(/\n.*$/, '')}
          className={styles.syncErrorNotification}
        />
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
          <h6 className={styles.detailsCardTitle}>
            {t('interventions', 'Interventions')} ({(claim.interventions ?? []).length})
          </h6>

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

                return (
                  <li key={iv.id} className={styles.interventionListItem}>
                    <div className={styles.interventionHeader}>
                      <code className={styles.interventionCode}>{iv.intervention_code}</code>
                      <span className={styles.interventionName}>{iv.intervention_name}</span>
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
                    </div>

                    {preauths.length > 0 && (
                      <div className={styles.preauthAttached}>
                        {preauths.map((p) => (
                          <div key={p.id} className={styles.preauthRow}>
                            <span className={styles.preauthLabel}>{t('preauthStatus', 'Preauth')}:</span>
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
                                {a.document_type}
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
                  <code className={styles.diagnosisCode}>{dx.icd_code}</code>
                  <span className={styles.diagnosisDesc}>{dx.icd_description}</span>
                  <Tag
                    size="sm"
                    type={dx.status === 'ATTACHED' ? 'green' : dx.status === 'REJECTED' ? 'red' : 'warm-gray'}>
                    {dx.status}
                  </Tag>
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
  } else if (upper.includes('REJECTED') || upper === 'FAILED_TO_SUBMIT') {
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
  } else if (upper.includes('REJECTED') || upper === 'DENIED') {
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
