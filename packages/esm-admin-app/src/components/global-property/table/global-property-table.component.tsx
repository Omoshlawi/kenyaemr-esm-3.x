import React, { useCallback, useMemo, useState } from 'react';
import {
  Button,
  DataTable,
  DataTableSkeleton,
  Pagination,
  Search,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  type DataTableHeader,
} from '@carbon/react';
import { Add, Edit, TrashCan } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import {
  ErrorCard,
  isDesktop,
  launchWorkspace2,
  showModal,
  useDebounce,
  useLayoutType,
  usePaginationInfo,
} from '@openmrs/esm-framework';

import { useGlobalProperties } from '../hooks/useGlobalProperty';
import styles from './global-property-table.scss';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

type GlobalPropertyRow = {
  id: string;
  property: string;
  value: string;
};

const GlobalPropertyTable: React.FC = () => {
  const { t } = useTranslation();
  const layoutType = useLayoutType();
  const desktop = isDesktop(layoutType);

  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const {
    isLoading,
    data: globalProperties = [],
    error,
    goTo,
    currentPage,
    totalCount,
    mutate,
  } = useGlobalProperties(pageSize, debouncedSearchTerm);

  const { pageSizes } = usePaginationInfo(DEFAULT_PAGE_SIZE, totalCount, currentPage, globalProperties.length);

  const headers: Array<DataTableHeader> = useMemo(
    () => [
      { key: 'property', header: t('property', 'Property') },
      { key: 'value', header: t('value', 'Value') },
    ],
    [t],
  );

  const rows: Array<GlobalPropertyRow> = useMemo(
    () =>
      globalProperties.map((gp, idx) => ({
        id: gp?.uuid ?? `gp-${idx}`,
        property: gp?.property ?? '',
        value: gp?.value ?? '',
      })),
    [globalProperties],
  );

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(event.target.value);
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
    [pageSize, goTo],
  );

  const openWorkspace = useCallback(
    (systemSetting?: (typeof globalProperties)[number]) => {
      launchWorkspace2('global-property-workspace', {
        systemSetting,
        mutateGlobalProperty: mutate,
      });
    },
    [globalProperties, mutate],
  );

  const handleEdit = useCallback(
    (row: GlobalPropertyRow) => {
      const systemSetting = globalProperties.find((gp) => gp.uuid === row.id);
      openWorkspace(systemSetting);
    },
    [globalProperties, openWorkspace],
  );

  const handleDelete = useCallback(
    (row: GlobalPropertyRow) => {
      const dispose = showModal('delete-global-property-modal', {
        close: () => dispose(),
        property: row.property,
        uuid: row.id,
        onDeleted: () => mutate(),
      });
    },
    [mutate],
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <DataTableSkeleton
          aria-label={t('globalProperties', 'Global properties')}
          headers={headers}
          showHeader
          showToolbar
        />
      );
    }

    if (rows.length === 0) {
      return (
        <p className={styles.emptyState}>
          {debouncedSearchTerm
            ? t('noMatchingGlobalProperties', 'No global properties match your search')
            : t('noGlobalProperties', 'No global properties to display')}
        </p>
      );
    }

    return (
      <>
        <DataTable useZebraStyles size={desktop ? 'sm' : 'md'} rows={rows} headers={headers}>
          {({ rows: renderRows, headers: renderHeaders, getTableProps, getHeaderProps, getRowProps, getCellProps }) => (
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  {renderHeaders.map((header) => (
                    <TableHeader {...getHeaderProps({ header })}>{header.header}</TableHeader>
                  ))}
                  <TableHeader>
                    <span className={styles.visuallyHidden}>{t('actions', 'Actions')}</span>
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {renderRows.map((row) => {
                  const sourceRow = rows.find((r) => r.id === row.id)!;
                  return (
                    <TableRow {...getRowProps({ row })}>
                      {row.cells.map((cell) => (
                        <TableCell {...getCellProps({ cell })}>{cell.value}</TableCell>
                      ))}
                      <TableCell className={styles.actionsCell}>
                        <Button
                          kind="ghost"
                          size="sm"
                          renderIcon={Edit}
                          iconDescription={t('edit', 'Edit')}
                          hasIconOnly
                          onClick={() => handleEdit(sourceRow)}
                        />
                        <Button
                          kind="danger--ghost"
                          size="sm"
                          renderIcon={TrashCan}
                          iconDescription={t('delete', 'Delete')}
                          hasIconOnly
                          onClick={() => handleDelete(sourceRow)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </DataTable>

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
          totalItems={totalCount ?? 0}
          onChange={handlePaginationChange}
        />
      </>
    );
  };

  if (error) {
    return (
      <div className={styles.dataTableContainer}>
        <ErrorCard error={error} headerTitle={t('globalPropertyError', 'Global property')} />
      </div>
    );
  }

  return (
    <div className={styles.dataTableContainer}>
      <div className={styles.tableHeaderSection}>
        <Search
          id="global-property-search"
          labelText=""
          placeholder={t('searchGlobalPropertiesByName', 'Search global property by name')}
          closeButtonLabelText={t('clearSearchButton', 'Clear search button')}
          size={desktop ? 'md' : 'lg'}
          value={searchTerm}
          onChange={handleSearchChange}
          type="search"
        />
        <Button size={desktop ? 'md' : 'lg'} kind="ghost" renderIcon={Add} onClick={() => openWorkspace()}>
          {t('addGlobalProperty', 'Add new global property')}
        </Button>
      </div>

      {renderContent()}
    </div>
  );
};

export default GlobalPropertyTable;
