import React, { useCallback, useMemo, useState } from 'react';
import {
  Button,
  DataTable,
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
import { Add, Upload } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import { ErrorCard, launchWorkspace2, showModal, useDebounce, usePaginationInfo } from '@openmrs/esm-framework';

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

  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const {
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

  const tableRows: Array<GlobalPropertyRow> = useMemo(
    () =>
      globalProperties.map((gp, idx) => ({
        id: gp?.uuid ?? `gp-${idx}`,
        property: gp?.property ?? '',
        value: gp?.value ?? '',
      })),
    [globalProperties],
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

  const openUploadImageWorkspace = useCallback(() => {
    launchWorkspace2('upload-logo-workspace', {
      mutateGlobalProperty: mutate,
    });
  }, [mutate]);

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

  if (error) {
    return (
      <div className={styles.dataTableContainer}>
        <ErrorCard error={error} headerTitle={t('globalPropertyError', 'Global property')} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <DataTable size="sm" rows={tableRows} headers={headers} isSortable useZebraStyles>
        {({
          rows,
          headers,
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
              title={t('globalProperty', 'Global Property')}
              description={t(
                'globalPropertyDescription',
                'A list of all global properties for the system. Filter by search term to find specific properties.',
              )}
              {...getTableContainerProps()}>
              <TableToolbar {...getToolbarProps()}>
                <TableToolbarContent aria-hidden={batchActionProps.shouldShowBatchActions}>
                  <TableToolbarSearch
                    persistent
                    onChange={handleSearchChange}
                    placeholder={t('searchForGlobalProperties', 'Search for global properties')}
                  />
                  <Button renderIcon={Add} onClick={() => openWorkspace()} size="sm" kind="primary">
                    {t('addGlobalProperty', 'Add global property')}
                  </Button>
                  <Button renderIcon={Upload} onClick={openUploadImageWorkspace} size="sm" kind="tertiary">
                    {t('uploadImage', 'Upload image')}
                  </Button>
                </TableToolbarContent>
              </TableToolbar>

              <Table {...getTableProps()} aria-label="Global properties">
                <TableHead>
                  <TableRow>
                    {headers.map((header) => (
                      <TableHeader {...getHeaderProps({ header })}>{header.header}</TableHeader>
                    ))}
                    <TableHeader aria-label={t('rowActions', 'Row actions')} />
                  </TableRow>
                </TableHead>

                <TableBody>
                  {rows.map((row, index) => {
                    return (
                      <React.Fragment key={row.id}>
                        <TableRow {...getRowProps({ row })}>
                          {row.cells.map((cell) => {
                            if (cell.info.header === 'status') {
                              return (
                                <TableCell key={cell.id}>
                                  <Tag size="sm">{cell.value}</Tag>
                                </TableCell>
                              );
                            }
                            return <TableCell key={cell.id}>{cell.value}</TableCell>;
                          })}
                          <TableCell className="cds--table-column-menu">
                            <OverflowMenu flipped aria-label="overflow-menu">
                              <OverflowMenuItem
                                onClick={() => handleEdit(tableRows[index])}
                                itemText={t('edit', 'Edit')}
                              />
                              <OverflowMenuItem
                                isDelete
                                onClick={() => handleDelete(tableRows[index])}
                                itemText={t('delete', 'Delete')}
                              />
                            </OverflowMenu>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          );
        }}
      </DataTable>
      <Pagination
        itemsPerPageText={t('itemsPerPage', 'Items per page:')}
        forwardText={t('nextPage', 'Next page')}
        backwardText={t('previousPage', 'Previous page')}
        itemRangeText={(min, max, total) => t('minMaxItems', '{{min}}-{{max}} of {{total}} items', { min, max, total })}
        pageRangeText={(_current, total) => t('pageRangeText', 'of {{count}} pages', { count: total })}
        page={currentPage}
        pageSize={pageSize}
        pageSizes={pageSizes?.length > 0 ? pageSizes : PAGE_SIZE_OPTIONS}
        totalItems={totalCount ?? 0}
        onChange={handlePaginationChange}
      />
    </div>
  );
};

export default GlobalPropertyTable;
