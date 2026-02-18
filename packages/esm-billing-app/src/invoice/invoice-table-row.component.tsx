import React from 'react';
import { TableCell, TableRow, TableSelectRow, type DataTableRow, type TableSelectRowProps } from '@carbon/react';
import { type LineItem, PaymentStatus } from '../types';

export type InvoiceTableRowProps = {
  row: DataTableRow<Array<unknown>>;
  rowsCount: number;
  isSelectable: boolean;
  rowStatus: string;
  selectedLineItems: Array<LineItem>;
  getRowProps: (options: { row: DataTableRow<Array<unknown>> }) => object;
  getSelectionProps: (options: { row: DataTableRow<Array<unknown>> }) => TableSelectRowProps;
  onRowSelection: (row: DataTableRow<Array<unknown>>, checked: boolean) => void;
};

const InvoiceTableRow: React.FC<InvoiceTableRowProps> = ({
  row,
  rowsCount,
  isSelectable,
  rowStatus,
  selectedLineItems,
  getRowProps,
  getSelectionProps,
  onRowSelection,
}) => {
  const selectionProps = getSelectionProps({ row });
  const isDisabled = rowStatus === PaymentStatus.PAID || rowStatus === PaymentStatus.EXEMPTED;
  const isChecked = isDisabled || Boolean(selectedLineItems?.find((item) => item?.uuid === row?.id));

  const showSelectRow = rowsCount > 1 && isSelectable;

  return (
    <TableRow {...getRowProps({ row })}>
      {showSelectRow && (
        <TableSelectRow
          aria-label="Select row"
          {...selectionProps}
          disabled={isDisabled}
          checked={isChecked}
          onSelect={(e) => {
            if (!isDisabled) {
              onRowSelection(row, !isChecked);
            }
            selectionProps.onSelect?.(e);
          }}
        />
      )}
      {row.cells.map((cell) => (
        <TableCell key={cell.id}>{cell.value as React.ReactNode}</TableCell>
      ))}
    </TableRow>
  );
};

export default InvoiceTableRow;
