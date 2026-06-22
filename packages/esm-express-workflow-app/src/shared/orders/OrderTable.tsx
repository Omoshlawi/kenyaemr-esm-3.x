import React, { useCallback, useMemo } from 'react';
import { DataTable, Table, TableHead, TableRow, TableHeader, TableBody, TableCell, Layer, Button } from '@carbon/react';
import { Add, Printer } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import { parseDate, formatDatetime, translateFrom, showModal, useVisit, OpenmrsResource } from '@openmrs/esm-framework';
import { PriorityPill, StatusPill } from './OrderPills';
import { type Order } from '../../types/order/order';
import { CardHeader } from '@openmrs/esm-patient-common-lib';
import styles from './OrderTable.scss';

export type OrderDocumentType = 'lab' | 'radiology' | 'procedure';

type OrderTableProps = {
  title: string;
  orders: Order[];
  onAdd: () => void;
  containerClassName: string;
  tableCellClassName: string;
  priorityPillClassName: string;
  statusPillClassName: string;
  module: string;
  orderType: OrderDocumentType;
  patientName?: string;
  patientId?: string;
  patientAge?: string | number;
};

const defaultHeaders = (t: (k: string, d: string) => string) => [
  { header: t('orderNo', 'Order No'), key: 'orderNo' },
  { header: t('dateOrdered', 'Date Ordered'), key: 'dateOrdered' },
  { header: t('order', 'Order'), key: 'order' },
  { header: t('orderReason', 'Order reason'), key: 'orderReason' },
  { header: t('priority', 'Priority'), key: 'priority' },
  { header: t('orderBy', 'Order By'), key: 'orderBy' },
  { header: t('status', 'Status'), key: 'status' },
  { header: t('actions', 'Actions'), key: 'actions' },
];

export const OrderTable: React.FC<OrderTableProps> = ({
  title,
  orders,
  onAdd,
  containerClassName,
  tableCellClassName,
  priorityPillClassName,
  statusPillClassName,
  module,
  orderType,
  patientName,
  patientId,
  patientAge,
}) => {
  const { t } = useTranslation();

  const ordersByUuid = useMemo(() => new Map(orders.map((o) => [o.uuid, o])), [orders]);

  const handlePrintOrder = useCallback(
    (uuid: string) => {
      const order = ordersByUuid.get(uuid);
      if (!order) {
        return;
      }
      const dispose = showModal('print-order-preview-modal', {
        onClose: () => dispose(),
        orders: [order],
        orderType,
        patientName,
        patientId,
        patientAge,
      });
    },
    [ordersByUuid, orderType, patientName, patientId, patientAge],
  );

  const rows = orders.map((order) => ({
    id: order.uuid,
    orderNo: order.orderNumber,
    dateOrdered: formatDatetime(parseDate(order.dateActivated), { mode: 'standard' }),
    order: order.concept?.display?.replace('_', ' ') ?? '--',
    priority: (
      <PriorityPill
        value={translateFrom(module, order.urgency, order.urgency)}
        className={priorityPillClassName}
        dataAttrName="priority"
      />
    ),
    orderBy: order.orderer?.display ?? '--',
    orderReason: (order.orderReason as unknown as OpenmrsResource)?.display,
    status: (
      <StatusPill
        value={translateFrom(module, order.fulfillerStatus, order.fulfillerStatus)}
        className={statusPillClassName}
        dataAttrName="status"
      />
    ),
    actions: (
      <Button
        kind="ghost"
        size="sm"
        hasIconOnly
        iconDescription={t('printOrder', 'Print Order')}
        renderIcon={Printer}
        onClick={() => handlePrintOrder(order.uuid)}
      />
    ),
  }));

  if (orders?.length === 0) {
    return <Layer />;
  }

  return (
    <div className={containerClassName}>
      <CardHeader title={title}>
        <div className={styles.buttonGroup}>
          <Button onClick={onAdd} kind="ghost" renderIcon={Add}>
            {t('addOrder', 'Add Order')}
          </Button>
        </div>
      </CardHeader>
      <DataTable size="sm" useZebraStyles headers={defaultHeaders(t)} isSortable rows={rows}>
        {({ getHeaderProps, getRowProps, getTableProps, headers, rows }) => (
          <Table {...getTableProps()}>
            <TableHead>
              <TableRow>
                {headers.map((header) => (
                  <TableHeader {...getHeaderProps({ header })}>{header.header}</TableHeader>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow {...getRowProps({ row })}>
                  {row.cells.map((cell) => (
                    <TableCell className={tableCellClassName} key={cell.id}>
                      {cell.value?.['content'] ?? cell.value}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DataTable>
    </div>
  );
};

export default OrderTable;
