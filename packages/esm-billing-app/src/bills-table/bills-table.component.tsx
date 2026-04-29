import React, { useCallback, useId, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import {
  DataTable,
  DataTableSkeleton,
  Dropdown,
  InlineLoading,
  Layer,
  Pagination,
  Search,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tile,
} from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { useLayoutType, isDesktop, useConfig, ErrorState, ConfigurableLink } from '@openmrs/esm-framework';
import { EmptyDataIllustration, usePaginationInfo } from '@openmrs/esm-patient-common-lib';
import { usePaginatedBills } from '../billing.resource';
import styles from './bills-table.scss';

type BillTableProps = {
  defaultBillPaymentStatus?: string;
  isOnActiveTab?: boolean;
};

const BillsTable: React.FC<BillTableProps> = ({ defaultBillPaymentStatus = '', isOnActiveTab = true }) => {
  const { t } = useTranslation();
  const id = useId();
  const config = useConfig();
  const layout = useLayoutType();
  const responsiveSize = isDesktop(layout) ? 'sm' : 'lg';
  const filterItems = [
    { id: '', text: t('allBills', 'All bills') },
    { id: 'PENDING', text: t('pendingBills', 'Pending bills') },
    { id: 'PAID', text: t('paidBills', 'Paid bills') },
    { id: 'POSTED', text: t('postedBills', 'Posted bills') },
  ];
  const [billPaymentStatus, setBillPaymentStatus] = useState(defaultBillPaymentStatus);
  const [pageSize, setPageSize] = useState(config?.bills?.pageSize ?? 10);
  const { bills, isLoading, isValidating, error, pagination } = usePaginatedBills(isOnActiveTab, {
    billStatus: billPaymentStatus,
    pageSize: pageSize,
  });
  const { goTo, currentPage, totalCount } = pagination;
  const { pageSizes } = usePaginationInfo(pageSize, totalCount, currentPage, bills.length);

  const [searchString, setSearchString] = useState('');
  const hasLoadedOnce = useRef(false);
  if (!isLoading) {
    hasLoadedOnce.current = true;
  }

  const headerData = [
    {
      header: t('visitTime', 'Visit time'),
      key: 'visitTime',
    },
    {
      header: t('identifier', 'Identifier'),
      key: 'identifier',
    },
    {
      header: t('name', 'Name'),
      key: 'patientName',
    },
    {
      header: t('billedItems', 'Billed Items'),
      key: 'billedItems',
    },
    {
      header: t('status', 'Status'),
      key: 'status',
    },
  ];

  const searchResults = useMemo(() => {
    if (bills !== undefined && bills.length > 0) {
      if (searchString && searchString.trim() !== '') {
        const search = searchString.toLowerCase();
        return bills?.filter((activeBillRow) =>
          Object.entries(activeBillRow).some(([header, value]) => {
            if (header === 'patientUuid') {
              return false;
            }
            return `${value}`.toLowerCase().includes(search);
          }),
        );
      }
    }

    return bills;
  }, [searchString, bills]);

  const setBilledItems = (bill) =>
    bill?.lineItems?.reduce(
      (acc, item) => acc + (acc ? ' & ' : '') + (item?.billableService.split(':')[1] || item?.item.split(':')[1] || ''),
      '',
    );

  const billingUrl = '${openmrsSpaBase}/home/accounting/patient/${patientUuid}/${uuid}';

  const rowData = searchResults?.map((bill, index) => ({
    id: `${index}`,
    uuid: bill.uuid,
    patientName: (
      <ConfigurableLink
        style={{ textDecoration: 'none', maxWidth: '50%' }}
        to={billingUrl}
        templateParams={{ patientUuid: bill.patientUuid, uuid: bill.uuid }}>
        {bill.patientName}
      </ConfigurableLink>
    ),
    visitTime: bill.dateCreated,
    identifier: bill.identifier,
    department: '--',
    billedItems: setBilledItems(bill),
    billingPrice: '--',
    status: t(bill.status),
  }));

  const handleSearch = useCallback(
    (e) => {
      goTo(1);
      setSearchString(e.target.value);
    },
    [goTo, setSearchString],
  );

  const handleFilterChange = ({ selectedItem }) => setBillPaymentStatus(selectedItem.id);

  if (isLoading) {
    return (
      <div className={styles.loaderContainer}>
        <DataTableSkeleton
          rowCount={pageSize}
          showHeader={false}
          showToolbar={false}
          zebra
          columnCount={headerData?.length}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <Layer>
          <ErrorState error={error} headerTitle={t('billsList', 'Bill list')} />
        </Layer>
      </div>
    );
  }

  return (
    <>
      <div className={styles.filterContainer}>
        <Dropdown
          className={styles.filterDropdown}
          direction="bottom"
          id={`filter-${id}`}
          initialSelectedItem={filterItems.find((item) => item.id === billPaymentStatus)}
          items={filterItems}
          itemToString={(item) => (item ? item.text : '')}
          label=""
          onChange={handleFilterChange}
          size={responsiveSize}
          titleText={t('filterBy', 'Filter by') + ':'}
          type="inline"
        />
      </div>

      {bills?.length > 0 ? (
        <div className={styles.billListContainer}>
          <FilterableTableHeader
            handleSearch={handleSearch}
            isValidating={isValidating}
            layout={layout}
            responsiveSize={responsiveSize}
            t={t}
          />
          <DataTable
            isSortable
            rows={rowData}
            headers={headerData}
            size={responsiveSize}
            useZebraStyles={rowData?.length > 1}>
            {({ rows, headers, getRowProps, getTableProps }) => (
              <TableContainer>
                <Table {...getTableProps()} aria-label="bill list">
                  <TableHead>
                    <TableRow>
                      {headers.map((header) => (
                        <TableHeader key={header.key}>{header.header}</TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow
                        key={row.id}
                        {...getRowProps({
                          row,
                        })}>
                        {row.cells.map((cell) => (
                          <TableCell key={cell.id}>{cell.value}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DataTable>
          {searchResults?.length === 0 && (
            <div className={styles.filterEmptyState}>
              <Layer level={0}>
                <Tile className={styles.filterEmptyStateTile}>
                  <p className={styles.filterEmptyStateContent}>
                    {t('noMatchingBillsToDisplay', 'No matching bills to display')}
                  </p>
                  <p className={styles.filterEmptyStateHelper}>{t('checkFilters', 'Check the filters above')}</p>
                </Tile>
              </Layer>
            </div>
          )}

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
      ) : (
        <Layer className={styles.emptyStateContainer}>
          <Tile className={styles.tile}>
            <div className={styles.illo}>
              <EmptyDataIllustration />
            </div>
            <p className={styles.content}>{t('noBillsToDisplay', 'There are no bills to display.')}</p>
          </Tile>
        </Layer>
      )}
    </>
  );
};

function FilterableTableHeader({ layout, handleSearch, isValidating, responsiveSize, t }) {
  return (
    <>
      <div className={styles.headerContainer}>
        <div
          className={classNames({
            [styles.tabletHeading]: !isDesktop(layout),
            [styles.desktopHeading]: isDesktop(layout),
          })}>
          <h4>{t('billList', 'Bill list')}</h4>
        </div>
        <div className={styles.backgroundDataFetchingIndicator}>
          <span>
            {isValidating && <InlineLoading status="active" description={t('refreshingData', 'Refreshing data')} />}
          </span>
        </div>
      </div>
      <Search
        labelText=""
        placeholder={t('filterTable', 'Filter table')}
        onChange={handleSearch}
        size={responsiveSize}
      />
    </>
  );
}

export default BillsTable;
