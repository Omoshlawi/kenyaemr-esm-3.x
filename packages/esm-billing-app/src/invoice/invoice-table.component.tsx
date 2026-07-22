import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import fuzzy from 'fuzzy';
import {
  DataTable,
  DataTableSkeleton,
  Layer,
  Table,
  TableBody,
  TableContainer,
  TableHead,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  Tile,
} from '@carbon/react';
import { isDesktop, useConfig, useDebounce, useLayoutType } from '@openmrs/esm-framework';
import { LineItem, MappedBill, PaymentStatus } from '../types';
import { BillingConfig } from '../config-schema';
import { useCurrencyFormatting } from '../helpers/currency';
import { getOutstandingBalance } from './payments/payment-form/payment-submission.utils';
import InvoiceTableHeaderRow from './invoice-table-header-row.component';
import InvoiceTableRow from './invoice-table-row.component';
import styles from './invoice-table.scss';

type InvoiceTableProps = {
  bill: MappedBill;
  isSelectable?: boolean;
  isLoadingBill?: boolean;
  onSelectItem?: (selectedLineItems: LineItem[]) => void;
};

const InvoiceTable: React.FC<InvoiceTableProps> = ({ bill, isSelectable = true, isLoadingBill, onSelectItem }) => {
  const { t } = useTranslation();
  const { enablePartialBillPayment } = useConfig<BillingConfig>();
  const { format: formatCurrency } = useCurrencyFormatting();
  const allowPartial = Boolean(enablePartialBillPayment);
  const { lineItems } = bill;
  const paidLineItems = lineItems?.filter((item) => item.paymentStatus === 'PAID') ?? [];
  const layout = useLayoutType();
  const responsiveSize = isDesktop(layout) ? 'sm' : 'lg';
  const [selectedLineItems, setSelectedLineItems] = useState(paidLineItems ?? []);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm);
  const filteredLineItems = useMemo(() => {
    if (!debouncedSearchTerm) {
      return lineItems;
    }

    return debouncedSearchTerm
      ? fuzzy
          .filter(debouncedSearchTerm, lineItems, {
            extract: (lineItem: LineItem) => `${lineItem.item}`,
          })
          .sort((r1, r2) => r1.score - r2.score)
          .map((result) => result.original)
      : lineItems;
  }, [debouncedSearchTerm, lineItems]);

  const tableHeaders = [
    { header: t('numberAbbr', 'No'), key: 'no' },
    { header: t('billItem', 'Bill item'), key: 'billItem' },
    { header: t('billCode', 'Bill code'), key: 'billCode' },
    { header: t('status', 'Status'), key: 'status' },
    { header: t('paymentMethod', 'Payment method'), key: 'paymentMethod' },
    { header: t('quantity', 'Quantity'), key: 'quantity' },
    { header: t('price', 'Price'), key: 'price' },
    { header: t('total', 'Total'), key: 'total' },
  ];
  const processBillItem = (item) => (item?.item || item?.billableService)?.split(':')[1];

  const renderStatus = (item: LineItem) => {
    const label = t(item.paymentStatus);
    if (!allowPartial) {
      return label;
    }
    const amountPaid = item.amountPaid ?? 0;
    const balance = getOutstandingBalance(item);
    const isPartiallyPaid = item.settlementStatus === 'PARTIALLY_PAID' || (amountPaid > 0 && balance > 0);
    if (!isPartiallyPaid) {
      return label;
    }
    return (
      <div className={styles.statusCell}>
        <span>{t('partiallyPaid', 'Partially paid')}</span>
        <span className={styles.statusBreakdown}>
          {t('amountPaidVsBalance', '{{paid}} paid / {{balance}} balance', {
            paid: formatCurrency(amountPaid),
            balance: formatCurrency(balance),
          })}
        </span>
      </div>
    );
  };

  const tableRows = useMemo(
    () =>
      filteredLineItems?.map((item, index) => {
        const isPaidOrExempted =
          item.paymentStatus === PaymentStatus.PAID || item.paymentStatus === PaymentStatus.EXEMPTED;
        return {
          no: `${index + 1}`,
          id: `${item.uuid}`,
          billItem: processBillItem(item),
          billCode: bill.receiptNumber,
          status: renderStatus(item),
          paymentStatus: item.paymentStatus,
          paymentMethod: item.priceName,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
          disabled: isPaidOrExempted,
        };
      }) ?? [],
    [bill.receiptNumber, filteredLineItems, allowPartial, formatCurrency, t],
  );

  if (isLoadingBill) {
    return (
      <div className={styles.loaderContainer}>
        <DataTableSkeleton columnCount={tableHeaders.length} showHeader={false} showToolbar={false} zebra />
      </div>
    );
  }

  const handleRowSelection = (row, checked: boolean) => {
    const matchingRow = filteredLineItems.find((item) => item.uuid === row.id);
    let newSelectedLineItems;

    if (checked) {
      newSelectedLineItems = [...selectedLineItems, matchingRow];
    } else {
      newSelectedLineItems = selectedLineItems.filter((item) => item.uuid !== row.id);
    }
    setSelectedLineItems(newSelectedLineItems);
    onSelectItem(newSelectedLineItems);
  };

  return (
    <div className={styles.invoiceContainer}>
      <DataTable headers={tableHeaders} isSortable rows={tableRows} size={responsiveSize} useZebraStyles>
        {({ rows, headers, getRowProps, getSelectionProps, getTableProps, getToolbarProps }) => (
          <TableContainer
            useStaticWidth
            description={
              <span className={styles.tableDescription}>
                <span>{t('itemsToBeBilled', 'Items to be billed')}</span>
              </span>
            }
            title={t('lineItems', 'Line items')}>
            <div className={styles.toolbarWrapper}>
              <TableToolbar {...getToolbarProps()} className={styles.tableToolbar} size={responsiveSize}>
                <TableToolbarContent className={styles.headerContainer}>
                  <TableToolbarSearch
                    className={styles.searchbox}
                    expanded
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    placeholder={t('searchThisTable', 'Search this table')}
                    size={responsiveSize}
                  />
                </TableToolbarContent>
              </TableToolbar>
            </div>
            <Table {...getTableProps()} aria-label="Invoice line items" className={styles.table}>
              <TableHead>
                <InvoiceTableHeaderRow
                  rows={rows}
                  headers={headers}
                  isSelectable={isSelectable}
                  filteredLineItems={filteredLineItems}
                  selectedLineItems={selectedLineItems}
                  onSelectChange={setSelectedLineItems}
                  onSelectItem={onSelectItem}
                  getSelectionProps={getSelectionProps}
                />
              </TableHead>
              <TableBody>
                {rows.map((row, index) => (
                  <InvoiceTableRow
                    key={row.id}
                    row={row}
                    rowsCount={rows.length}
                    isSelectable={isSelectable}
                    rowStatus={tableRows[index].paymentStatus}
                    selectedLineItems={selectedLineItems}
                    getRowProps={getRowProps}
                    getSelectionProps={getSelectionProps}
                    onRowSelection={handleRowSelection}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
      {filteredLineItems?.length === 0 && (
        <div className={styles.filterEmptyState}>
          <Layer>
            <Tile className={styles.filterEmptyStateTile}>
              <p className={styles.filterEmptyStateContent}>
                {t('noMatchingItemsToDisplay', 'No matching items to display')}
              </p>
              <p className={styles.filterEmptyStateHelper}>{t('checkFilters', 'Check the filters above')}</p>
            </Tile>
          </Layer>
        </div>
      )}
    </div>
  );
};

export default InvoiceTable;
