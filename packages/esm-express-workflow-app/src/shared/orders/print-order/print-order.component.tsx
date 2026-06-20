import React, { useRef, useState, useMemo } from 'react';
import { Button, ButtonSet, ModalBody, ModalFooter, InlineNotification } from '@carbon/react';
import { useReactToPrint } from 'react-to-print';
import { formatDatetime, parseDate, useSession } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import styles from './print-order.scss';
import { Order } from '../../../types/order/order';
import { documentId } from '../../utils';
export type OrderDocumentType = 'lab' | 'radiology' | 'procedure';

type PrintOrderPreviewModalProps = {
  onClose: () => void;
  orders: Array<Order>;
  orderType: OrderDocumentType;
  patientName?: string;
  patientId?: string;
  patientAge?: string | number;
};

const documentMeta = (
  orderType: OrderDocumentType,
  t: (k: string, d: string) => string,
): { title: string; orderLabel: string } => {
  switch (orderType) {
    case 'lab':
      return { title: t('labOrderForm', 'Laboratory Order Form'), orderLabel: t('test', 'Test') };
    case 'radiology':
      return { title: t('radiologyOrderForm', 'Radiology Order Form'), orderLabel: t('procedure', 'Procedure') };
    case 'procedure':
      return { title: t('procedureOrderForm', 'Procedure Order Form'), orderLabel: t('procedure', 'Procedure') };
    default:
      return { title: t('orderForm', 'Order Form'), orderLabel: t('order', 'Order') };
  }
};

const PrintOrderPreviewModal: React.FC<PrintOrderPreviewModalProps> = ({
  onClose,
  orders,
  orderType,
  patientName,
  patientId,
  patientAge,
}) => {
  const { t } = useTranslation();
  const [printError, setPrintError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const { sessionLocation, user } = useSession();
  const userDisplay = user ? user.display : '';
  const generationTimestamp = useMemo(() => new Date(), []);
  const { title, orderLabel } = documentMeta(orderType, t);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: title,
    onAfterPrint: () => setPrintError(null),
    onPrintError: (_, error) => {
      setPrintError(error?.message || t('errorOccurredWhilePrinting', 'An error occurred while printing'));
    },
    pageStyle: `
      @page {
        size: A4;
        margin: 15mm;
      }
    `,
  });

  return (
    <>
      <ModalBody>
        <div className={styles.container}>
          <div ref={printRef} className={styles.printableContent}>
            <div className={styles.printableHeader}>
              <div className={styles.facilityDetails}>
                <div className={styles.facilityName}>{sessionLocation?.display}</div>
                <div className={styles.heading}>{title}</div>
              </div>
            </div>

            <div className={styles.printableBody}>
              <div className={styles.topInfoRow}>
                <div className={styles.infoItem}>
                  <span className={styles.label}>{t('patientName', 'Patient Name:')}</span>
                  <span className={styles.value}>{patientName || ''}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.label}>{t('patientNo', 'Patient No:')}</span>
                  <span className={styles.value}>{patientId || ''}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.label}>{t('age', 'Age:')}</span>
                  <span className={styles.value}>{patientAge ?? ''}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.label}>{t('date', 'Date:')}</span>
                  <span className={styles.value}>{formatDatetime(generationTimestamp, { mode: 'standard' })}</span>
                </div>
              </div>

              <table className={styles.orderTable}>
                <thead>
                  <tr>
                    <th className={styles.th}>{t('orderNo', 'Order No')}</th>
                    <th className={styles.th}>{t('dateOrdered', 'Date Ordered')}</th>
                    <th className={styles.th}>{orderLabel}</th>
                    <th className={styles.th}>{t('priority', 'Priority')}</th>
                    <th className={styles.th}>{t('orderBy', 'Order By')}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.uuid}>
                      <td className={styles.td}>{order.orderNumber}</td>
                      <td className={styles.td}>
                        {order.dateActivated
                          ? formatDatetime(parseDate(order.dateActivated), { mode: 'standard' })
                          : '--'}
                      </td>
                      <td className={styles.td}>{order.concept?.display?.replace('_', ' ') ?? '--'}</td>
                      <td className={styles.td}>{order.urgency ?? '--'}</td>
                      <td className={styles.td}>{order.orderer?.display ?? '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className={styles.footer}>
                <div className={styles.footerDetails}>
                  <div>
                    {documentId()} | {t('generatedBy', 'Generated By')}: {userDisplay}
                  </div>
                  <div>
                    {t('generationTimestamp', 'Generated')}: {formatDatetime(generationTimestamp)} |{' '}
                    {t('facility', 'Facility')}: {sessionLocation?.display}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <ButtonSet className={styles.btnSet}>
          <Button kind="secondary" onClick={onClose} type="button">
            {t('cancel', 'Cancel')}
          </Button>
          <Button kind="primary" type="button" onClick={handlePrint}>
            {t('print', 'Print')}
          </Button>
        </ButtonSet>
      </ModalFooter>

      {printError && (
        <InlineNotification kind="error" title={t('printError', 'Error')} subtitle={printError} hideCloseButton />
      )}
    </>
  );
};

export default PrintOrderPreviewModal;
