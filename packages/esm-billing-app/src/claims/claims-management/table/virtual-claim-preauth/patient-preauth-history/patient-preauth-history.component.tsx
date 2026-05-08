import {
  Button,
  ContentSwitcher,
  DataTable,
  DataTableSkeleton,
  IconButton,
  InlineNotification,
  Switch,
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
import { ArrowRight, CheckmarkFilled, Copy, CopyLink, WarningFilled } from '@carbon/react/icons';
import { ErrorState, formatDate, formatTime, usePagination, useVisit } from '@openmrs/esm-framework';
import { CardHeader, EmptyState, PatientChartPagination } from '@openmrs/esm-patient-common-lib';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './patient-preauth-history.scss';
import { PatientPreauth } from './type';
import { usePatientPreauths } from './patient-preauth-history.resource';

// ── Constants ─────────────────────────────────────────────────────────────────
const WORKFLOW_STATE_COLORS: Record<string, string> = {
  DRAFT: 'warm-gray',
  PREAUTH_PENDING: 'blue',
  PREAUTH_APPROVED: 'green',
  PREAUTH_REJECTED: 'red',
  ELECTIVE_DRAFT: 'warm-gray',
  ELECTIVE_PENDING: 'purple',
  ELECTIVE_APPROVED: 'green',
  ELECTIVE_REJECTED: 'red',
};

const DEFAULT_PAGE_SIZE = 5;

// ── Types ─────────────────────────────────────────────────────────────────────
interface PreauthTableRow {
  id: string;
  intervention: string;
  interventionCode: string;
  serviceType: string;
  status: string;
  tariff: string;
  date: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function safeParse(dateStr: string | null | undefined): Date | null {
  if (!dateStr) {
    return null;
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d;
  }
  const ts = Date.parse(dateStr);
  return isNaN(ts) ? null : new Date(ts);
}

function formatShaDate(dateStr?: string | null): string {
  if (!dateStr) {
    return '—';
  }
  const d = safeParse(dateStr);
  return d ? `${formatDate(d)} · ${formatTime(d)}` : dateStr;
}

function formatTariff(tariff?: string | number | null): string {
  if (tariff === null || tariff === undefined || tariff === '') {
    return '—';
  }
  const n = Number(tariff);
  if (isNaN(n)) {
    return '—';
  }
  return n.toLocaleString('en-KE', { minimumFractionDigits: 2 });
}

function toTableRow(p: PatientPreauth): PreauthTableRow {
  return {
    id: p.claimUuid,
    intervention: p.interventionName ?? '—',
    interventionCode: p.interventionCode ?? '—',
    serviceType: p.serviceType ?? '—',
    status: p.workflowState ?? '',
    tariff: formatTariff(p.tariff),
    date: formatShaDate(p.dateCreated),
  };
}

// ── Status cell ───────────────────────────────────────────────────────────────
const StatusCell: React.FC<{ workflowState?: string | null }> = ({ workflowState }) => {
  const color = WORKFLOW_STATE_COLORS[workflowState ?? ''] ?? 'warm-gray';
  return (
    <Tag type={color as any} size="sm">
      {workflowState || '—'}
    </Tag>
  );
};

// ── Service type cell ─────────────────────────────────────────────────────────
const ServiceTypeCell: React.FC<{ serviceType?: string | null }> = ({ serviceType }) => {
  if (!serviceType || serviceType === '—') {
    return <>—</>;
  }
  return (
    <Tag type={serviceType === 'INPATIENT' ? 'blue' : 'gray'} size="sm">
      {serviceType}
    </Tag>
  );
};

// ── Workflow state policy ─────────────────────────────────────────────────────
// CRUD is BLOCKED only when SHA is actively reviewing or the visit doesn't exist yet:
//   PREAUTH_PENDING    → SHA reviewing, don't touch
//   ELECTIVE_PENDING   → SHA reviewing, don't touch
//   ELECTIVE_APPROVED  → patient not checked in yet, visit doesn't exist
// Everything else is CRUD-allowed.
const CRUD_BLOCKED_STATES = new Set(['PREAUTH_PENDING', 'ELECTIVE_PENDING', 'ELECTIVE_APPROVED']);

type NotificationKind = 'info' | 'success' | 'warning' | 'error';

interface StateGuidance {
  kind: NotificationKind;
  title: string;
  subtitle: string;
}

// ── Expanded detail panel ─────────────────────────────────────────────────────
const ExpandedDetail: React.FC<{
  preauth: PatientPreauth;
  onSelectAuthCode?: (p: PatientPreauth) => void;
}> = ({ preauth, onSelectAuthCode }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(preauth.authorizationCode ?? '').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [preauth.authorizationCode]);

  const workflowState = preauth.workflowState ?? '';
  const crudAllowed = !CRUD_BLOCKED_STATES.has(workflowState);

  const guidance: StateGuidance | null = useMemo(() => {
    switch (workflowState) {
      case 'PREAUTH_PENDING':
        return {
          kind: 'info',
          title: t('preauthPendingTitle', 'Awaiting SHA review'),
          subtitle: t('preauthPendingGuidance', 'Interventions cannot be modified while under review.'),
        };
      case 'ELECTIVE_PENDING':
        return {
          kind: 'info',
          title: t('electivePendingTitle', 'Awaiting elective approval'),
          subtitle: t('electivePendingGuidance', 'Interventions cannot be modified while under review.'),
        };
      case 'ELECTIVE_APPROVED':
        return {
          kind: 'success',
          title: t('electiveApprovedTitle', 'Approved for check-in'),
          subtitle: t('electiveApprovedGuidance', 'Interventions can be modified once the patient is checked in.'),
        };
      case 'PREAUTH_APPROVED':
        return {
          kind: 'success',
          title: t('preauthApprovedTitle', 'SHA approved'),
          subtitle: t('preauthApprovedGuidance', 'Interventions may still be added, switched, or retired.'),
        };
      case 'PREAUTH_REJECTED':
        return {
          kind: 'error',
          title: t('preauthRejectedTitle', 'Rejected by SHA'),
          subtitle: t('preauthRejectedGuidance', 'Review and resubmit interventions as needed.'),
        };
      case 'ELECTIVE_REJECTED':
        return {
          kind: 'error',
          title: t('electiveRejectedTitle', 'Elective request rejected'),
          subtitle: t('electiveRejectedGuidance', 'Modify interventions and resubmit.'),
        };
      case 'DRAFT':
      case 'ELECTIVE_DRAFT':
        return {
          kind: 'warning',
          title: t('draftTitle', 'Draft preauthorization'),
          subtitle: t('draftGuidance', 'Add or modify interventions before submission.'),
        };
      default:
        return null;
    }
  }, [workflowState, t]);

  return (
    <div className={styles.expandedPanel}>
      <div className={styles.expandedGrid}>
        <div className={styles.expandedCard}>
          <p className={styles.expandedCardTitle}>{t('preauthDetails', 'Preauth details')}</p>

          <div className={styles.kvRow}>
            <span className={styles.kvLabel}>{t('authCode', 'Auth code')}</span>
            <span className={styles.kvValueMono}>
              {preauth.authorizationCode}
              {preauth.isElective && (
                <IconButton
                  size="sm"
                  kind="ghost"
                  label={copied ? t('copied', 'Copied!') : t('copy', 'Copy')}
                  onClick={copyCode}
                  className={styles.copyBtn}>
                  {copied ? <CopyLink size={14} className={styles.copyIconSuccess} /> : <Copy size={14} />}
                </IconButton>
              )}
            </span>
          </div>

          <div className={styles.kvRow}>
            <span className={styles.kvLabel}>{t('visitLinked', 'Visit linked')}</span>
            <span className={styles.kvValue}>{preauth.visitLinked ? t('yes', 'Yes') : t('no', 'No')}</span>
          </div>

          <div className={styles.kvRow}>
            <span className={styles.kvLabel}>{t('elective', 'Elective')}</span>
            <span className={styles.kvValue}>{preauth.isElective ? t('yes', 'Yes') : t('no', 'No')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
interface Props {
  patientUuid: string;
  onSelectAuthCode?: (preauth: PatientPreauth) => void;
}

const PatientPreauthWidget: React.FC<Props> = ({ patientUuid, onSelectAuthCode }) => {
  const { t } = useTranslation();
  const { preauths, total, isLoading, error } = usePatientPreauths(patientUuid);
  const { activeVisit } = useVisit(patientUuid);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const handleViewChange = useCallback(({ index }: { index: number }) => {
    setActiveTabIndex(index);
  }, []);

  const headers = useMemo(
    () => [
      { key: 'intervention', header: t('intervention', 'Intervention') },
      { key: 'interventionCode', header: t('interventionCode', 'Intervention code') },
      { key: 'serviceType', header: t('serviceType', 'Service type') },
      { key: 'status', header: t('status', 'Status') },
      { key: 'tariff', header: t('tariff', 'Tariff (KES)') },
      { key: 'date', header: t('date', 'Date') },
    ],
    [t],
  );

  const { todayPreauths, pastPreauths, readyCount } = useMemo(() => {
    const today = preauths.filter((p) => p.isToday);
    const past = preauths.filter((p) => !p.isToday);
    return {
      todayPreauths: today,
      pastPreauths: past,
      readyCount: today.filter((p) => p.canUseForCheckin).length,
    };
  }, [preauths]);

  const activeList = activeTabIndex === 0 ? todayPreauths : pastPreauths;

  const { results: paginatedList, currentPage, goTo } = usePagination(activeList, pageSize);

  useEffect(() => {
    goTo(1);
  }, [activeTabIndex, goTo]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(activeList.length / pageSize));
    if (currentPage > maxPage) {
      goTo(1);
    }
  }, [activeList.length, pageSize, currentPage, goTo]);

  const renderTable = useCallback(
    (list: PatientPreauth[], emptyContent: React.ReactNode) => {
      if (isLoading) {
        return (
          <DataTableSkeleton
            headers={headers}
            rowCount={DEFAULT_PAGE_SIZE}
            columnCount={headers.length}
            zebra
            showToolbar={false}
            showHeader={false}
          />
        );
      }

      if (list.length === 0) {
        return <>{emptyContent}</>;
      }

      const rows = list.map(toTableRow);
      const rawById = new Map(list.map((p) => [p.claimUuid, p]));

      return (
        <DataTable rows={rows} headers={headers} isSortable useZebraStyles size="sm">
          {({
            rows: tableRows,
            headers: tableHeaders,
            getTableProps,
            getHeaderProps,
            getRowProps,
            getExpandedRowProps,
            getExpandHeaderProps,
          }) => (
            <TableContainer>
              <Table {...getTableProps()}>
                <TableHead>
                  <TableRow>
                    <TableExpandHeader enableToggle {...getExpandHeaderProps()} />
                    {tableHeaders.map((h) => (
                      <TableHeader key={h.key} {...getHeaderProps({ header: h })}>
                        {h.header}
                      </TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tableRows.map((row) => {
                    const raw = rawById.get(row.id);
                    return (
                      <React.Fragment key={row.id}>
                        <TableExpandRow
                          {...getRowProps({ row })}
                          className={raw?.canUseForCheckin ? styles.rowReady : undefined}>
                          {row.cells.map((cell) => {
                            switch (cell.info.header) {
                              case 'status':
                                return (
                                  <TableCell key={cell.id}>
                                    <StatusCell workflowState={raw?.workflowState} />
                                  </TableCell>
                                );
                              case 'serviceType':
                                return (
                                  <TableCell key={cell.id}>
                                    <ServiceTypeCell serviceType={raw?.serviceType} />
                                  </TableCell>
                                );
                              default:
                                return <TableCell key={cell.id}>{cell.value ?? '—'}</TableCell>;
                            }
                          })}
                        </TableExpandRow>
                        <TableExpandedRow colSpan={tableHeaders.length + 1} {...getExpandedRowProps({ row })}>
                          {raw && <ExpandedDetail preauth={raw} onSelectAuthCode={onSelectAuthCode} />}
                        </TableExpandedRow>
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataTable>
      );
    },
    [isLoading, headers, onSelectAuthCode],
  );

  if (error) {
    return (
      <div className={styles.errorRow}>
        <ErrorState headerTitle={t('errorLoadingPreauths', 'Could not load preauthorization history.')} error={error} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <CardHeader title={t('benefitPackages', 'Benefit packages')}>
        <ContentSwitcher
          size="sm"
          className={styles.switcher}
          selectedIndex={activeTabIndex}
          onChange={handleViewChange}>
          <Switch name="today">{t('todayPreauths', "Today's preauths")}</Switch>
          <Switch name="past">{t('capitation', 'Capitation')}</Switch>
          <Switch name="past">{t('pastPreauths', 'Past preauths')}</Switch>
        </ContentSwitcher>
      </CardHeader>

      {readyCount > 0 && activeTabIndex === 0 && (
        <div className={styles.readyBanner}>
          <CheckmarkFilled size={16} className={styles.readyBannerIcon} />
          <span className={styles.readyBannerText}>
            <strong>{readyCount}</strong>{' '}
            {readyCount === 1
              ? t('readyForCheckinSingle', 'elective preauth ready for check-in')
              : t('readyForCheckinPlural', 'elective preauths ready for check-in')}
          </span>
        </div>
      )}

      {renderTable(
        paginatedList,
        activeTabIndex === 0 ? (
          <EmptyState
            headerTitle={t('noPreauths', 'No preauthorizations for today')}
            displayText={t('preauthsToday', 'preauthorizations for today')}
          />
        ) : (
          <EmptyState
            headerTitle={t('noPastPreauths', 'No past preauthorizations')}
            displayText={t('pastPreauthorizations', 'past preauthorizations')}
          />
        ),
      )}

      {activeList.length > 0 && (
        <PatientChartPagination
          currentItems={paginatedList.length}
          totalItems={activeList.length}
          pageNumber={currentPage}
          pageSize={pageSize}
          onPageNumberChange={({ page, pageSize: ps }) => {
            setPageSize(ps);
            goTo(page);
          }}
        />
      )}

      {activeVisit && (
        <div className={styles.visitContext}>
          <span className={styles.visitContextLabel}>
            {t('activeVisit', 'Active visit')}: <strong>{activeVisit.visitType?.display ?? t('visit', 'Visit')}</strong>
          </span>
        </div>
      )}
    </div>
  );
};

export default PatientPreauthWidget;
