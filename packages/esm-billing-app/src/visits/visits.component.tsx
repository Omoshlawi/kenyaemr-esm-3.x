import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DataTable,
  DataTableSkeleton,
  Layer,
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
  Tile,
  type DataTableHeader,
} from '@carbon/react';
import { FilterRemove } from '@carbon/react/icons';
import {
  ErrorState,
  formatDatetime,
  isDesktop,
  launchWorkspace2,
  parseDate,
  useLayoutType,
} from '@openmrs/esm-framework';
import { EmptyDataIllustration, usePaginationInfo } from '@openmrs/esm-patient-common-lib';
import { useActiveVisits } from './visits.resource';
import VisitFilters, { getDateRange, type VisitFilterValues } from './visits-filters.component';
import styles from './visits.scss';

const DEFAULT_FILTERS: VisitFilterValues = {
  dateRangePreset: 'today',
};

const headers: Array<DataTableHeader> = [
  { key: 'patientName', header: 'Patient name' },
  { key: 'visitType', header: 'Visit type' },
  { key: 'location', header: 'Location' },
  { key: 'startDatetime', header: 'Start date' },
];

const ActiveVisit: React.FC = () => {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const responsiveSize = isDesktop(layout) ? 'sm' : 'lg';

  const [filters, setFilters] = useState<VisitFilterValues>(DEFAULT_FILTERS);
  const [pageSize, setPageSize] = useState(10);

  const [fromDate, toDate] = getDateRange(filters);
  const { visits, isLoading, error, pagination } = useActiveVisits({ fromDate, toDate, pageSize });
  const { goTo, currentPage, totalCount } = pagination;
  const { pageSizes } = usePaginationInfo(pageSize, totalCount, currentPage, visits.length);

  const rows = useMemo(
    () =>
      visits.map((visit) => ({
        id: visit.uuid,
        patientName: visit.patient?.display?.split('-')?.slice(1)?.join('-')?.trim() || visit.patient?.display || '--',
        visitType: visit.visitType?.display ?? '--',
        location: visit.location?.display ?? '--',
        startDatetime: visit.startDatetime ? formatDatetime(parseDate(visit.startDatetime), { mode: 'wide' }) : '--',
      })),
    [visits, t],
  );

  const visitsByUuid = useMemo(() => new Map(visits.map((visit) => [visit.uuid, visit])), [visits]);

  if (isLoading) {
    return (
      <div className={styles.loaderContainer}>
        <DataTableSkeleton
          rowCount={pageSize}
          showHeader={false}
          showToolbar={false}
          zebra
          columnCount={headers.length}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <Layer>
          <ErrorState error={error} headerTitle={t('activeVisits', 'Active visits')} />
        </Layer>
      </div>
    );
  }

  if (visits.length === 0) {
    return (
      <div className={styles.visitsListContainer}>
        <VisitFilters values={filters} onChange={setFilters} />
        <Layer className={styles.emptyStateContainer}>
          <Tile className={styles.tile}>
            <div className={styles.illo}>
              <EmptyDataIllustration />
            </div>
            <p className={styles.content}>
              {t('noActiveVisitsInRange', 'There are no active visits within the selected date range.')}
            </p>
            <Button kind="ghost" size="sm" renderIcon={FilterRemove} onClick={() => setFilters(DEFAULT_FILTERS)}>
              {t('clearFilters', 'Clear filters')}
            </Button>
          </Tile>
        </Layer>
      </div>
    );
  }

  return (
    <div className={styles.visitsListContainer}>
      <VisitFilters values={filters} onChange={setFilters} />
      <DataTable isSortable rows={rows} headers={headers} size={responsiveSize} useZebraStyles>
        {({
          rows: tableRows,
          headers: tableHeaders,
          getHeaderProps,
          getRowProps,
          getToolbarProps,
          getTableProps,
          getTableContainerProps,
          onInputChange,
        }) => (
          <TableContainer
            title={t('activeVisits', 'Active visits')}
            description={t('activeVisitsDescription', 'Patients with an ongoing visit within the selected date range.')}
            {...getTableContainerProps()}>
            <TableToolbar {...getToolbarProps()}>
              <TableToolbarContent>
                <TableToolbarSearch
                  persistent
                  onChange={(e) => onInputChange(e as React.ChangeEvent<HTMLInputElement>)}
                  placeholder={t('searchVisits', 'Search visits')}
                />
              </TableToolbarContent>
            </TableToolbar>
            <Table {...getTableProps()} aria-label={t('activeVisits', 'Active visits')}>
              <TableHead>
                <TableRow>
                  {tableHeaders.map((header) => (
                    <TableHeader {...getHeaderProps({ header })}>{header.header}</TableHeader>
                  ))}
                  <TableHeader aria-label={t('visitActions', 'Visit actions')} />
                </TableRow>
              </TableHead>
              <TableBody>
                {tableRows.map((row) => {
                  const visit = visitsByUuid.get(row.id);
                  if (!visit) {
                    return null;
                  }

                  return (
                    <TableRow {...getRowProps({ row })} key={row.id}>
                      {row.cells.map((cell) => (
                        <TableCell key={cell.id}>{cell.value}</TableCell>
                      ))}
                      <TableCell className="cds--table-column-menu">
                        <div className={styles.overflowMenuItemContainer}>
                          <OverflowMenu aria-label={t('visitActions', 'Visit actions')} size="sm" flipped>
                            <OverflowMenuItem
                              itemText={t('manageVisit', 'Manage visit')}
                              onClick={() =>
                                launchWorkspace2(
                                  'visit-attributes-workspace',
                                  {
                                    patientUuid: visit.patient?.uuid,
                                    visit,
                                    workspaceTitle: t('manageVisit', 'Manage visit'),
                                  },
                                  {},
                                  {},
                                )
                              }
                            />
                          </OverflowMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
      <Pagination
        forwardText={t('nextPage', 'Next page')}
        backwardText={t('previousPage', 'Previous page')}
        page={currentPage ?? 1}
        pageSize={pageSize}
        pageSizes={pageSizes}
        totalItems={totalCount}
        className={styles.pagination}
        size={responsiveSize}
        onChange={({ pageSize: newPageSize, page: newPage }) => {
          if (newPageSize !== pageSize) {
            setPageSize(newPageSize);
          }
          if (newPage !== currentPage) {
            goTo(newPage);
          }
        }}
      />
    </div>
  );
};

export default ActiveVisit;
