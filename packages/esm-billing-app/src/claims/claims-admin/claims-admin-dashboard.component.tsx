import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DataTable,
  DataTableSkeleton,
  DatePicker,
  DatePickerInput,
  InlineLoading,
  Pagination,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
} from '@carbon/react';
import { Archive, Checkmark, CloseOutline, Document, Money, Return, SendAlt, Warning } from '@carbon/react/icons';
import dayjs from 'dayjs';
import { ConfigurableLink, formatDate } from '@openmrs/esm-framework';
import { useClaimsMetrics, type VirtualClaim } from '../../hooks/useClaimsMetrics';
import BillingHeader from '../../billing-header/billing-header.component';
import {
  adminTableHeaders,
  billingUrl,
  CLAIMS_PAGE_SIZE,
  filterByTab,
  formatKes,
  PAYER_TAG,
  STAGE_TAG,
  toTitleCase,
} from '../../utils';
import styles from './claims-admin-dashboard.scss';
import ClaimsMetricCard from './claims-metric-card.component';

interface ClaimsTableProps {
  claims: VirtualClaim[];
  isLoading: boolean;
}

const ClaimsTable: React.FC<ClaimsTableProps> = ({ claims, isLoading }) => {
  const [page, setPage] = useState(1);
  const start = (page - 1) * CLAIMS_PAGE_SIZE;
  const pageResults = claims.slice(start, start + CLAIMS_PAGE_SIZE);

  const rows = pageResults.map((c) => {
    const stageTag = STAGE_TAG[c.display_stage] ?? { label: c.display_stage, type: 'gray' };
    const payerState = (c.payer_workflow_state ?? '').toUpperCase();
    const payerTag = PAYER_TAG[payerState];

    return {
      id: c.virtual_claim_uuid,
      patient: (
        <ConfigurableLink
          style={{ textDecoration: 'none' }}
          to={billingUrl}
          templateParams={{ patientUuid: c.patient_uuid ?? '', uuid: c.bill_uuid ?? '' }}>
          {c.patient_name ? toTitleCase(c.patient_name) : '—'}
        </ConfigurableLink>
      ),
      date: c.date_created ? formatDate(new Date(c.date_created)) : '—',
      authCode: c.authorization_code ?? '—',
      serviceType: c.service_type ? toTitleCase(c.service_type) : '—',
      invoiceNo: c.invoice_number ?? '—',
      amount: c.total_claim_amount ? c.total_claim_amount.toLocaleString('en-KE') : '—',
      status: payerTag ? (
        <Tag type={payerTag.type as any} size="sm">
          {payerTag.label}
        </Tag>
      ) : (
        <Tag type={stageTag.type as any} size="sm">
          {stageTag.label}
        </Tag>
      ),
    };
  });

  if (isLoading) {
    return (
      <DataTableSkeleton
        headers={adminTableHeaders}
        rowCount={CLAIMS_PAGE_SIZE}
        columnCount={adminTableHeaders.length}
        zebra
        showToolbar={false}
        showHeader={false}
      />
    );
  }

  return (
    <>
      <DataTable rows={rows} headers={adminTableHeaders} useZebraStyles size="sm" isSortable>
        {({ rows, headers, getHeaderProps, getRowProps, getTableProps }) => (
          <TableContainer>
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  {headers.map((header) => {
                    const { key, ...rest } = getHeaderProps({ header });
                    return (
                      <TableHeader key={header.key} {...rest}>
                        {header.header}
                      </TableHeader>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={adminTableHeaders.length} className={styles.emptyCell}>
                      No claims found
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => {
                    const { key, ...rest } = getRowProps({ row });
                    return (
                      <TableRow key={row.id} {...rest}>
                        {row.cells.map((cell) => (
                          <TableCell key={cell.id}>{cell.value}</TableCell>
                        ))}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
      <Pagination
        page={page}
        pageSize={CLAIMS_PAGE_SIZE}
        pageSizes={[10, 20, 50]}
        totalItems={claims.length}
        onChange={({ page: p }) => setPage(p)}
        size="sm"
      />
    </>
  );
};

const ClaimsAdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [fromDate, setFromDate] = useState<string>(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
  const [toDate, setToDate] = useState<string>(dayjs().format('YYYY-MM-DD'));

  const { data, claims, isLoading } = useClaimsMetrics(fromDate, toDate);

  const m = data?.metrics;
  const provider = m?.provider_side;
  const payer = m?.payer_side;

  const submittedCount = provider?.by_workflow_state?.SUBMITTED ?? 0;
  const rejectedCount = payer?.by_workflow_state?.REJECTED ?? 0;
  const returnedCount = payer?.by_workflow_state?.SENT_BACK ?? 0;
  const closedCount = provider?.by_workflow_state?.CLOSED ?? 0;

  const paidCount =
    (payer?.by_workflow_state?.PAYMENT_COMPLETED ?? 0) + (payer?.by_workflow_state?.PARTIALLY_PAID ?? 0);
  const totalCount = m?.total_claims ?? 0;
  const unpaidCount = Math.max(0, totalCount - paidCount);

  const paidAmount = payer?.total_paid_amount_kes ?? 0;
  const totalAmount = m?.total_claim_amount_kes ?? 0;
  const unpaidAmount = Math.max(0, totalAmount - paidAmount);

  const submittedClaims = filterByTab(claims, 'submitted');
  const rejectedClaims = filterByTab(claims, 'rejected');
  const returnedClaims = filterByTab(claims, 'returned');
  const paidClaims = filterByTab(claims, 'paid');
  const draftClaims = filterByTab(claims, 'draft');
  const closedClaims = filterByTab(claims, 'closed');

  return (
    <div>
      <BillingHeader title={t('claimsAdmin', 'Claims Admin')} />
      <div className={styles.container}>
        <div className={styles.filterBar}>
          <DatePicker
            datePickerType="range"
            dateFormat="Y-m-d"
            value={[fromDate, toDate]}
            onChange={(dates) => {
              if (dates[0]) {
                setFromDate(dayjs(dates[0]).format('YYYY-MM-DD'));
              }
              if (dates[1]) {
                setToDate(dayjs(dates[1]).format('YYYY-MM-DD'));
              }
            }}>
            <DatePickerInput
              id="admin-from-date"
              labelText={t('fromDate', 'From')}
              placeholder="YYYY-MM-DD"
              size="sm"
            />
            <DatePickerInput id="admin-to-date" labelText={t('toDate', 'To')} placeholder="YYYY-MM-DD" size="sm" />
          </DatePicker>
        </div>

        {isLoading && !data ? (
          <InlineLoading description={t('loadingMetrics', 'Loading metrics...')} />
        ) : (
          <>
            <section className={styles.section}>
              <h4 className={styles.sectionTitle}>{t('claimsAnalytics', 'Claims Analytics')}</h4>
              <div className={styles.analyticsGrid}>
                <ClaimsMetricCard
                  label={t('submittedClaims', 'Submitted Claims')}
                  count={submittedCount}
                  icon={<SendAlt size={24} />}
                  colorClass={styles.cardBlue}
                />
                <ClaimsMetricCard
                  label={t('rejectedClaims', 'Rejected Claims')}
                  count={rejectedCount}
                  icon={<CloseOutline size={24} />}
                  colorClass={styles.cardRed}
                />
                <ClaimsMetricCard
                  label={t('returnedClaims', 'Returned Claims')}
                  count={returnedCount}
                  icon={<Return size={24} />}
                  colorClass={styles.cardOrange}
                />
                <ClaimsMetricCard
                  label={t('closedClaims', 'Closed Claims')}
                  count={closedCount}
                  icon={<Archive size={24} />}
                  colorClass={styles.cardGray}
                />
              </div>
            </section>

            <section className={styles.section}>
              <h4 className={styles.sectionTitle}>{t('claimsTotals', 'Claims Totals')}</h4>
              <div className={styles.totalsGrid}>
                <ClaimsMetricCard
                  label={t('paidClaims', 'Paid Claims')}
                  count={paidCount}
                  amount={formatKes(paidAmount)}
                  icon={<Checkmark size={24} />}
                  colorClass={styles.cardGreen}
                />
                <ClaimsMetricCard
                  label={t('unpaidClaims', 'Unpaid Claims')}
                  count={unpaidCount}
                  amount={formatKes(unpaidAmount)}
                  icon={<Warning size={24} />}
                  colorClass={styles.cardGray}
                />
                <ClaimsMetricCard
                  label={t('totalClaims', 'Total Claims')}
                  count={totalCount}
                  amount={formatKes(totalAmount)}
                  icon={<Document size={24} />}
                />
                <ClaimsMetricCard
                  label={t('approvedAmount', 'Approved Amount')}
                  count={payer?.by_workflow_state?.APPROVED ?? 0}
                  amount={formatKes(payer?.total_approved_amount_kes ?? 0)}
                  icon={<Money size={24} />}
                  colorClass={styles.cardGreen}
                />
              </div>
            </section>

            <section className={styles.section}>
              <h4 className={styles.sectionTitle}>{t('claimsByStatus', 'Claims by Status')}</h4>
              <Tabs>
                <TabList aria-label={t('claimsTabs', 'Claims status tabs')} contained>
                  <Tab>
                    {t('all', 'All')} ({claims.length})
                  </Tab>
                  <Tab>
                    {t('submitted', 'Submitted')} ({submittedClaims.length})
                  </Tab>
                  <Tab>
                    {t('rejected', 'Rejected')} ({rejectedClaims.length})
                  </Tab>
                  <Tab>
                    {t('returned', 'Returned')} ({returnedClaims.length})
                  </Tab>
                  <Tab>
                    {t('paid', 'Paid')} ({paidClaims.length})
                  </Tab>
                  <Tab>
                    {t('draft', 'Draft')} ({draftClaims.length})
                  </Tab>
                  <Tab>
                    {t('closed', 'Closed')} ({closedClaims.length})
                  </Tab>
                </TabList>
                <TabPanels>
                  <TabPanel className={styles.tabPanel}>
                    <ClaimsTable claims={claims} isLoading={isLoading} />
                  </TabPanel>
                  <TabPanel className={styles.tabPanel}>
                    <ClaimsTable claims={submittedClaims} isLoading={isLoading} />
                  </TabPanel>
                  <TabPanel className={styles.tabPanel}>
                    <ClaimsTable claims={rejectedClaims} isLoading={isLoading} />
                  </TabPanel>
                  <TabPanel className={styles.tabPanel}>
                    <ClaimsTable claims={returnedClaims} isLoading={isLoading} />
                  </TabPanel>
                  <TabPanel className={styles.tabPanel}>
                    <ClaimsTable claims={paidClaims} isLoading={isLoading} />
                  </TabPanel>
                  <TabPanel className={styles.tabPanel}>
                    <ClaimsTable claims={draftClaims} isLoading={isLoading} />
                  </TabPanel>
                  <TabPanel className={styles.tabPanel}>
                    <ClaimsTable claims={closedClaims} isLoading={isLoading} />
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default ClaimsAdminDashboard;
