import React from 'react';
import {
  TableHeader,
  TableRow,
  TableSelectAll,
  type DataTableHeader,
  type DataTableRow,
  type TableSelectAllProps,
} from '@carbon/react';
import { LineItem, PaymentStatus } from '../types';

export type InvoiceTableHeaderRowProps = {
  rows: Array<DataTableRow<Array<unknown>>>;
  headers: Array<DataTableHeader>;
  isSelectable: boolean;
  filteredLineItems: Array<LineItem>;
  selectedLineItems: Array<LineItem>;
  onSelectChange: (newSelected: Array<LineItem>) => void;
  onSelectItem?: (selectedLineItems: Array<LineItem>) => void;
  getSelectionProps: () => TableSelectAllProps;
};

const InvoiceTableHeaderRow: React.FC<InvoiceTableHeaderRowProps> = ({
  rows,
  headers,
  isSelectable,
  filteredLineItems,
  selectedLineItems,
  onSelectChange,
  onSelectItem,
  getSelectionProps,
}) => {
  if (!isSelectable) {
    return (
      <TableRow>
        {headers.map((header) => (
          <TableHeader key={header.key}>{header.header}</TableHeader>
        ))}
      </TableRow>
    );
  }

  const selectAllProps = getSelectionProps();

  const handleSelectAll = (e: React.MouseEvent<HTMLInputElement>) => {
    const selectableLineItems = filteredLineItems.filter(
      (item) => item.paymentStatus !== PaymentStatus.PAID && item.paymentStatus !== PaymentStatus.EXEMPTED,
    );
    const allSelectableSelected = selectableLineItems.every((item) =>
      selectedLineItems.some((s) => s.uuid === item.uuid),
    );
    const paidOrExempted = (s: LineItem) =>
      s.paymentStatus === PaymentStatus.PAID || s.paymentStatus === PaymentStatus.EXEMPTED;

    const newSelected = allSelectableSelected
      ? selectedLineItems.filter(paidOrExempted)
      : [...selectedLineItems.filter(paidOrExempted), ...selectableLineItems];

    onSelectChange(newSelected);
    onSelectItem?.(newSelected);
    selectAllProps.onSelect?.(e);
  };

  return (
    <TableRow>
      <TableSelectAll {...selectAllProps} onSelect={handleSelectAll} />
      {headers.map((header) => (
        <TableHeader key={header.key}>{header.header}</TableHeader>
      ))}
    </TableRow>
  );
};

export default InvoiceTableHeaderRow;
