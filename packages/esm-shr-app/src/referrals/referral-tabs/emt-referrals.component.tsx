import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  DataTable,
  DataTableSkeleton,
  Dropdown,
  InlineLoading,
  OverflowMenu,
  OverflowMenuItem,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  Tag,
  type DataTableHeader,
} from '@carbon/react';
import { Renew } from '@carbon/react/icons';
import {
  ErrorState,
  formatDatetime,
  navigate,
  parseDate,
  restBaseUrl,
  showModal,
  showSnackbar,
  useDebounce,
  usePagination,
} from '@openmrs/esm-framework';
import { EmptyDataIllustration, usePaginationInfo } from '@openmrs/esm-patient-common-lib';
import { useTranslation } from 'react-i18next';
import useSWRMutation from 'swr/mutation';
import { EmtCase } from '../../types';
import { pullEmmegencyCases, serveEmtClient, useEmtCases } from '../refferals.resource';
import styles from './emt-referrals.scss';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const STATUS_FILTER_ALL = 'All';

// Turns a raw status code such as `SUBMITTED_PROVIDER` into a readable label.
const humanizeStatus = (status: string) =>
  status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

type EmtCaseRow = {
  id: string;
  crId: string;
  status: string;
  ambulanceFrCode: string;
  facilityFrCode: string;
  requestedAt: string;
};

const EmtReferrals = () => {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<string>(STATUS_FILTER_ALL);
  const { error, isLoading, referrals, mutate } = useEmtCases(statusFilter);
  // Accumulate every status we have seen so the filter options stay available
  // even while the list is narrowed down to a single status server-side.
  const [knownStatuses, setKnownStatuses] = useState<Array<string>>([]);

  const { trigger: refreshEmtCases, isMutating: isRefreshing } = useSWRMutation(
    `${restBaseUrl}/kenyaemril/pull-emt-cases`,
    async () => pullEmmegencyCases(),
    {
      onSuccess: async () => {
        await mutate();
        showSnackbar({
          title: t('success', 'Success'),
          subtitle: t('emtCasesPulledSuccessfully', 'EMT cases pulled successfully'),
          kind: 'success',
          isLowContrast: true,
        });
      },
      onError: (err) => {
        console.error('Failed to pull EMT cases', err);
        showSnackbar({
          title: t('unableToPullEmtCases', 'Unable to pull EMT cases'),
          subtitle: t(
            'emtCasesPullFailedFriendly',
            'We could not pull EMT cases right now. Please try again in a moment.',
          ),
          kind: 'error',
          isLowContrast: true,
        });
      },
    },
  );

  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    setKnownStatuses((prev) => {
      const next = new Set(prev);
      referrals.forEach((referral) => referral.status && next.add(referral.status));
      return next.size === prev.length ? prev : Array.from(next).sort((a, b) => a.localeCompare(b));
    });
  }, [referrals]);

  const statusFilterItems = useMemo(() => [STATUS_FILTER_ALL, ...knownStatuses], [knownStatuses]);

  const handleStatusFilterChange = useCallback(({ selectedItem }: { selectedItem: string | null }) => {
    setStatusFilter(selectedItem ?? STATUS_FILTER_ALL);
  }, []);

  const headers: Array<DataTableHeader> = useMemo(
    () => [
      { key: 'crId', header: t('crId', 'CR ID') },
      { key: 'status', header: t('status', 'Status') },
      { key: 'ambulanceFrCode', header: t('ambulanceFrCode', 'Ambulance FR Code') },
      { key: 'facilityFrCode', header: t('facilityFrCode', 'Facility FR Code') },
      { key: 'evacuationScene', header: t('evacuationScene', 'Evacuation Scene') },
      { key: 'requestedAt', header: t('requested', 'Requested') },
    ],
    [t],
  );

  const filteredReferrals = useMemo(() => {
    if (!debouncedSearchTerm?.trim()) {
      return referrals;
    }

    const search = debouncedSearchTerm.toLowerCase();
    return referrals.filter((referral) =>
      [referral.crId, referral.status, referral.ambulanceFrCode, referral.facilityFrCode, referral.requestedAt].some(
        (value) => `${value ?? ''}`.toLowerCase().includes(search),
      ),
    );
  }, [debouncedSearchTerm, referrals]);

  const isEmpty = filteredReferrals.length === 0;
  const { results, goTo, currentPage, paginated } = usePagination(filteredReferrals, pageSize);
  const { pageSizes } = usePaginationInfo(DEFAULT_PAGE_SIZE, filteredReferrals.length, currentPage, results.length);

  // Reset to the first page whenever the status filter changes.
  useEffect(() => {
    goTo(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const tableRows: Array<EmtCaseRow> = useMemo(
    () =>
      results.map((referral) => ({
        id: referral.uuid,
        crId: referral.crId,
        status: referral.status,
        ambulanceFrCode: referral.ambulanceFrCode,
        facilityFrCode: referral.facilityFrCode,
        evacuationScene: referral.evacuationScene ?? '--',
        requestedAt: referral.requestedAt ? formatDatetime(parseDate(referral.requestedAt)) : '--',
      })),
    [results],
  );

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement> | '', value?: string) => {
      const searchValue = typeof event === 'string' ? value ?? '' : event.target.value;
      setSearchTerm(searchValue);
      if (currentPage !== 1) {
        goTo(1);
      }
    },
    [currentPage, goTo],
  );

  const handlePaginationChange = useCallback(
    ({ page, pageSize: newSize }: { page: number; pageSize: number }) => {
      if (newSize !== pageSize) {
        setPageSize(newSize);
      }
      goTo(page);
    },
    [goTo, pageSize],
  );

  const handleView = useCallback((item: EmtCase) => {
    const dismiss = showModal('emt-case-detail-modal', { onClose: () => dismiss(), item });
  }, []);

  const handleAccept = useCallback((item: EmtCase) => {
    const dismiss = showModal('accept-emt-case-modal', { onClose: () => dismiss(), item });
  }, []);

  // Onboards the already-accepted case as a patient and opens their chart. The
  // server reuses an existing patient for the case's CR ID, so this is safe to
  // retry.
  const handleServePatient = useCallback(
    async (item: EmtCase) => {
      try {
        const { uuid } = await serveEmtClient(item.caseNumber);
        navigate({ to: window.getOpenmrsSpaBase() + `patient/${uuid}/chart/Patient Summary` });
      } catch (err) {
        showSnackbar({
          title: t('errorServingPatient', 'Error serving patient'),
          subtitle:
            (err as { responseBody?: { message?: string }; message?: string })?.responseBody?.message ??
            (err as { message?: string })?.message ??
            t('patientRegistrationFailed', 'The patient could not be served'),
          kind: 'error',
          isLowContrast: true,
        });
      }
    },
    [t],
  );

  const getReferralByRowId = useCallback(
    (rowId: string) => filteredReferrals.find((referral) => referral.uuid === rowId),
    [filteredReferrals],
  );

  if (isLoading) {
    return <DataTableSkeleton headers={headers} columnCount={headers.length} />;
  }

  if (error) {
    return (
      <div className={styles.dataTableContainer}>
        <ErrorState headerTitle={t('emtCases', 'EMT Cases')} error={error} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <DataTable size="sm" rows={tableRows} headers={headers} isSortable useZebraStyles>
        {({
          rows,
          headers: tableHeaders,
          getHeaderProps,
          getRowProps,
          getBatchActionProps,
          getToolbarProps,
          getTableProps,
          getTableContainerProps,
        }) => {
          const batchActionProps = getBatchActionProps();

          return (
            <TableContainer
              title={t('emtCases', 'EMT Cases')}
              description={t(
                'emtCasesDescription',
                'A list of emergency medical transport cases. Filter by search term to find specific cases.',
              )}
              {...getTableContainerProps()}>
              <TableToolbar {...getToolbarProps()}>
                <TableToolbarContent aria-hidden={batchActionProps.shouldShowBatchActions}>
                  <TableToolbarSearch
                    persistent
                    onChange={handleSearchChange}
                    placeholder={t('searchForEmtCases', 'Search for EMT cases')}
                  />
                  <Dropdown
                    hideLabel
                    id="emt-status-filter"
                    className={styles.statusFilter}
                    size="sm"
                    type="inline"
                    titleText={t('status', 'Status')}
                    label={t('filterByStatus', 'Filter by status')}
                    items={statusFilterItems}
                    selectedItem={statusFilter}
                    itemToString={(item) => (item === STATUS_FILTER_ALL ? t('all', 'All') : humanizeStatus(item ?? ''))}
                    onChange={handleStatusFilterChange}
                  />
                  <div className={styles.refreshAction}>
                    {isRefreshing && (
                      <InlineLoading
                        className={styles.refreshStatus}
                        description={t('refreshing', 'Refreshing...')}
                        status={isRefreshing ? 'active' : 'inactive'}
                        style={{ visibility: isRefreshing ? 'visible' : 'hidden' }}
                        aria-hidden={!isRefreshing}
                      />
                    )}
                    <Button
                      kind="ghost"
                      size="sm"
                      renderIcon={Renew}
                      onClick={() => refreshEmtCases()}
                      disabled={isRefreshing}>
                      {t('refresh', 'Refresh')}
                    </Button>
                  </div>
                </TableToolbarContent>
              </TableToolbar>

              {isEmpty ? (
                <div className={styles.emptyState}>
                  <EmptyDataIllustration />
                  <p className={styles.emptyStateContent}>
                    {t('noEmtCasesToDisplay', 'There are no EMT cases to display')}
                  </p>
                </div>
              ) : (
                <Table {...getTableProps()} aria-label={t('emtCases', 'EMT Cases')}>
                  <TableHead>
                    <TableRow>
                      {tableHeaders.map((header) => (
                        <TableHeader {...getHeaderProps({ header })}>{header.header}</TableHeader>
                      ))}
                      <TableHeader aria-label={t('rowActions', 'Row actions')} />
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {rows.map((row) => {
                      const isSubmittedByProvider =
                        row.cells.find((cell) => cell.info.header === 'status')?.value === 'SUBMITTED_PROVIDER';
                      // A case can be accepted (consent verified) or still pending acceptance.
                      // "Accept" only applies while pending; "Serve Patient" only once accepted.
                      const isAccepted = getReferralByRowId(row.id)?.accepted ?? false;

                      return (
                        <React.Fragment key={row.id}>
                          <TableRow {...getRowProps({ row })}>
                            {row.cells.map((cell) => {
                              if (cell.info.header === 'status') {
                                return (
                                  <TableCell key={cell.id}>
                                    <Tag size="sm" type={isSubmittedByProvider ? 'green' : 'gray'}>
                                      {cell.value}
                                    </Tag>
                                  </TableCell>
                                );
                              }

                              return <TableCell key={cell.id}>{cell.value}</TableCell>;
                            })}
                            <TableCell className="cds--table-column-menu">
                              <OverflowMenu flipped size="sm" aria-label={t('rowActions', 'Row actions')}>
                                {!isAccepted && (
                                  <OverflowMenuItem
                                    itemText={t('viewDetails', 'Case Details')}
                                    onClick={() => {
                                      const referral = getReferralByRowId(row.id);
                                      if (referral) {
                                        handleView(referral);
                                      }
                                    }}
                                  />
                                )}
                                {!isAccepted && (
                                  <OverflowMenuItem
                                    itemText={t('accept', 'Accept')}
                                    onClick={() => {
                                      const referral = getReferralByRowId(row.id);
                                      if (referral) {
                                        handleAccept(referral);
                                      }
                                    }}
                                  />
                                )}
                                {isAccepted && (
                                  <OverflowMenuItem
                                    itemText={t('servePatient', 'Serve Patient')}
                                    onClick={() => {
                                      const referral = getReferralByRowId(row.id);
                                      if (referral) {
                                        handleServePatient(referral);
                                      }
                                    }}
                                  />
                                )}
                                {!isAccepted && (
                                  <OverflowMenuItem
                                    itemText={t('reject', 'Reject')}
                                    hasDivider={true}
                                    isDelete={true}
                                    onClick={() => {
                                      const referral = getReferralByRowId(row.id);
                                      if (referral) {
                                        showSnackbar({
                                          title: t('underDevelopment', 'Under development'),
                                          subtitle: t(
                                            'thisFeatureIsNotAvailableYet',
                                            'This feature is not available yet, coming soon.',
                                          ),
                                          kind: 'info',
                                          isLowContrast: true,
                                          timeoutInMs: 5000,
                                        });
                                      }
                                    }}
                                  />
                                )}
                              </OverflowMenu>
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </TableContainer>
          );
        }}
      </DataTable>
      {paginated && (
        <Pagination
          itemsPerPageText={t('itemsPerPage', 'Items per page:')}
          forwardText={t('nextPage', 'Next page')}
          backwardText={t('previousPage', 'Previous page')}
          itemRangeText={(min, max, total) =>
            t('minMaxItems', '{{min}}-{{max}} of {{total}} items', { min, max, total })
          }
          pageRangeText={(_current, total) => t('pageRangeText', 'of {{count}} pages', { count: total })}
          page={currentPage}
          pageSize={pageSize}
          pageSizes={pageSizes?.length > 0 ? pageSizes : PAGE_SIZE_OPTIONS}
          totalItems={filteredReferrals.length}
          onChange={handlePaginationChange}
        />
      )}
    </div>
  );
};

export default EmtReferrals;
