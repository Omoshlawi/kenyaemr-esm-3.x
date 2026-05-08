import {
  Button,
  DataTable,
  DataTableSkeleton,
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
import { formatDate, showModal, usePagination } from '@openmrs/esm-framework';
import { EmptyState, usePaginationInfo } from '@openmrs/esm-patient-common-lib';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ClaimResponse } from '../../../types';
import styles from './claims-list-table.scss';
import capitalize from 'lodash-es/capitalize';
import { formatCurrency } from '../../../helpers/currency';

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
};

function getStatusBadge(claim: ClaimResponse) {
  const ws = claim.workflowState?.trim() || null;
  const cfg = (ws && WORKFLOW_STATE_CONFIG[ws]) ??
    STATUS_FALLBACK[claim.status ?? ''] ?? { label: claim.status ?? '—', type: 'gray' };
  return <Tag type={cfg.type as any}>{cfg.label}</Tag>;
}

const ShifExpandedRow: React.FC<{ claim: ClaimResponse }> = ({ claim }) => {
  const { t } = useTranslation();
  const ws = claim.workflowState?.trim() || null;
  const isInpatient = claim.serviceType === 'INPATIENT';
  const isDraft = ws === 'DRAFT' || (!ws && claim.status === 'DRAFT');
  const isPreauth = ws === 'PREAUTH_APPROVED';
  const isRejected = ws?.includes('REJECTED') || claim.status === 'REJECTED';
  const canSubmit = isDraft || isPreauth;

  const open = (modalName: string) => {
    const dispose = showModal(modalName, { closeModal: () => dispose(), claimId: claim.uuid });
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
        <Button kind="ghost" size="sm" renderIcon={Document} onClick={() => open('claim-summary-modal')}>
          {t('viewSummary', 'View summary')}
        </Button>
      </div>

      <div className={styles.billingLinesSection}>
        <p className={styles.billingLinesTitle}>{t('billingLines', 'Billing lines')}</p>
        {lines.length === 0 ? (
          <div className={styles.billingLinesEmpty}>
            <p>{t('noBillingLines', 'No billing lines added yet.')}</p>
            <Button kind="ghost" size="sm" renderIcon={Add} onClick={() => open('claim-add-line-modal')}>
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

const PhcExpandedRow: React.FC<{ claim: ClaimResponse }> = ({ claim }) => {
  const { t } = useTranslation();
  const open = (modalName: string) => {
    const dispose = showModal(modalName, { closeModal: () => dispose(), claimId: claim.uuid });
  };

  return (
    <div className={styles.expandedPanel}>
      <div className={styles.expandedInfo}>
        <span>
          <strong>{t('claimCode', 'Claim code')}:</strong> <code>{claim.claimCode ?? '—'}</code>
        </span>
        <span>
          <strong>{t('claimed', 'Claimed')}:</strong>{' '}
          {claim.claimedTotal ? formatCurrency(Number(claim.claimedTotal)) : '—'}
        </span>
        {claim.interventions?.length && (
          <span>
            <strong>{t('interventions', 'Interventions')}:</strong> {claim.interventions.join(', ')}
          </span>
        )}
      </div>
      <div className={styles.expandedButtons}>
        <Button kind="ghost" size="sm" renderIcon={Document} onClick={() => open('claim-summary-modal')}>
          {t('viewSummary', 'View summary')}
        </Button>
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

  const headers = [
    ...(includeClaimCode ? [{ key: 'claimCode', header: t('claimNo', 'Claim No.') }] : []),
    { key: 'patientName', header: t('patientName', 'Patient name') },
    { key: 'intervention', header: t('intervention', 'Intervention') },
    { key: 'tariff', header: t('tariff', 'Tariff (KES)') },
    { key: 'claimedTotal', header: t('claimed', 'Claimed (KES)') },
    { key: 'status', header: t('status', 'Status') },
    { key: 'provider', header: t('provider', 'Provider') },
    ...(!isPhc ? [{ key: 'serviceType', header: t('serviceType', 'Service type') }] : []),
    { key: 'dateCreated', header: t('dateCreated', 'Date created') },
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
    status: claim.workflowState?.trim() || claim.status || '',
    serviceType: claim.serviceType ?? '',
    provider: claim.provider?.display || '—',
    dateCreated: claim.dateFrom ? formatDate(new Date(claim.dateFrom)) : '—',
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
                        {claim ? isPhc ? <PhcExpandedRow claim={claim} /> : <ShifExpandedRow claim={claim} /> : null}
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
