import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  DataTable,
  InlineLoading,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from '@carbon/react';
import { ErrorState, formatDate, useLayoutType } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { ClaimPreview, ClaimPreviewInvoiceLine, useClaimPreview } from '../../../dashboard/form/claims-form.resource';
import styles from './claim-modals.scss';
import { type LineItem, type MappedBill } from '../../../../types';
import { Document } from '@carbon/react/icons';
import { formatAmount } from '../../../../helpers';

const formatDateValue = (value?: string | number) => {
  if (value === undefined || value === null) {
    return '-';
  }
  if (typeof value === 'string' && value.trim() === 'undefined') {
    return '-';
  }

  let date: Date | null = null;

  if (typeof value === 'number' && !Number.isNaN(value)) {
    date = new Date(value);
  } else if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      date = new Date(parsed);
    }
  }

  if (!date || Number.isNaN(date.getTime())) {
    return String(value);
  }

  return formatDate(date);
};

type ClaimPreviewModalProps = {
  onClose: () => void;
  title?: string;
  consentToken?: string;
  billNumber?: string;
  documentUrl?: string;
  patient_uuid?: string;
  receiptNumber?: string;
  patientUuid?: string;
};

type ClaimDiagnosis = {
  claim_diagnosis_id: number;
  diagnosis_code?: string;
  diagnosis_name?: string;
  intervention_code?: string;
};

type PreviewInvoice = {
  uuid: string;
  id: string;
  invoiceNumber: string;
  provider?: string;
  scheme?: string;
  status?: string;
  gross: string;
  net: string;
  lineItems: LineItem[];
};

const buildPreviewLineItem = (lineItem: ClaimPreviewInvoiceLine, index: number): LineItem => ({
  uuid: lineItem?.id ?? `line-item-${index}`,
  display: lineItem?.display ?? lineItem?.item_name ?? lineItem?.item?.display ?? lineItem?.billableService ?? '',
  voided: Boolean(lineItem?.voided),
  voidReason: lineItem?.voidReason ?? null,
  item: lineItem?.item ?? lineItem?.item_name ?? lineItem?.itemName ?? lineItem?.display ?? '',
  billableService: lineItem?.billableService ?? lineItem?.service_name ?? lineItem?.serviceName ?? '',
  quantity: Number(lineItem?.quantity ?? lineItem?.qty ?? 1),
  price: Number(lineItem?.price ?? lineItem?.unit_price ?? lineItem?.unitPrice ?? 0),
  priceName: lineItem?.priceName ?? lineItem?.price_name ?? lineItem?.display ?? '',
  priceUuid: lineItem?.priceUuid ?? lineItem?.price_uuid ?? '',
  lineItemOrder: Number(lineItem?.lineItemOrder ?? lineItem?.order ?? index),
  resourceVersion: lineItem?.resourceVersion ?? '1',
  paymentStatus: lineItem?.paymentStatus ?? lineItem?.workflow_state ?? 'PENDING',
  itemOrServiceConceptUuid: lineItem?.itemOrServiceConceptUuid ?? lineItem?.item_or_service_concept_uuid ?? '',
  serviceTypeUuid: lineItem?.serviceTypeUuid ?? lineItem?.service_type_uuid ?? '',
  order: lineItem?.order ?? ({} as any),
  is_return: lineItem?.is_return,
  is_cancellation: lineItem?.is_cancellation,
});

const buildPreviewBill = (claim: ClaimPreview, invoice: any, lineItems: LineItem[]): MappedBill =>
  ({
    uuid: invoice?.uuid ?? invoice?.id ?? claim.uuid ?? claim.id?.toString?.() ?? claim.id?.toString?.() ?? '',
    id: Number(invoice?.id ?? claim.id ?? 0),
    patientUuid: claim.patient_uuid ?? claim.patientUuid ?? claim.patient?.uuid ?? '',
    patientName: claim.patient_name ?? claim.patientName ?? '',
    cashPointUuid: claim.cashPointUuid ?? invoice?.cash_point_uuid ?? '',
    cashPointName: claim.cashPointName ?? invoice?.cash_point_name ?? claim.provider_name ?? '',
    cashPointLocation: claim.cashPointLocation ?? '',
    cashier: (claim.cashier ?? invoice?.cashier ?? { uuid: '', display: '', links: [] }) as any,
    receiptNumber: invoice?.invoice_number ?? claim.receiptNumber ?? '',
    status: (invoice?.workflow_state ?? invoice?.dispatch_status ?? claim.status ?? 'PENDING') as any,
    identifier: invoice?.invoice_number ?? invoice?.id ?? claim.authorization_code ?? '',
    dateCreated: invoice?.date_created ?? claim.dateCreated ?? '',
    dateCreatedUnformatted: invoice?.date_created ?? claim.dateCreated ?? '',
    lineItems,
    billingService: invoice?.scheme_name ?? claim.scheme_name ?? '',
    payments: (claim.payments ?? []) as any,
    totalAmount: Number(
      invoice?.total_inv_amount ?? invoice?.total_inv_net_amount ?? claim.total_claim_net_amount ?? 0,
    ),
    display: invoice?.invoice_number ?? claim.display,
    closed: Boolean(invoice?.closed ?? claim.closed),
  } as MappedBill);

const ClaimPreviewModal: React.FC<ClaimPreviewModalProps> = ({
  onClose,
  consentToken,
  receiptNumber,
  patient_uuid,
}) => {
  const { t } = useTranslation();
  const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState('');

  const { claimPreview: data, isLoading, error } = useClaimPreview(consentToken);

  const invoiceNumbers = useMemo(() => {
    if (!data) {
      return [];
    }
    // prefer claim_preview invoices -> invoice_number
    const anyData = data as any;
    if (Array.isArray(anyData.invoices) && anyData.invoices.length > 0) {
      return anyData.invoices.map((inv: any) => inv.invoice_number).filter(Boolean) as string[];
    }
    if (data.receiptNumber) {
      return [data.receiptNumber];
    }
    if (Array.isArray(data.lineItems) && data.lineItems.length > 0) {
      return data.lineItems.map((li: any) => li.uuid ?? li.id).filter(Boolean) as string[];
    }
    return [];
  }, [data]);

  useEffect(() => {
    if (!selectedInvoiceNumber && invoiceNumbers.length > 0) {
      setSelectedInvoiceNumber(invoiceNumbers[0]);
    }
  }, [invoiceNumbers, selectedInvoiceNumber]);

  const isInpatientClaim = useMemo(
    () =>
      String(data?.service_type ?? '')
        .trim()
        .toUpperCase() === 'INPATIENT',
    [data?.service_type],
  );

  const isClosed = useMemo(
    () =>
      String(data?.claim_auth_status ?? data?.status ?? '')
        .trim()
        .toUpperCase() === 'CLOSED',
    [data?.claim_auth_status, data?.status],
  );

  const summaryHeaders = useMemo(
    () => [
      { key: 'label', header: t('field', 'Field') },
      { key: 'value', header: t('value', 'Value') },
    ],
    [t],
  );
  const summaryRows = useMemo(
    () => [
      {
        id: 'patient',
        label: t('patient', 'Patient'),
        value: data?.patient_name || data?.patientName || '-',
      },
      {
        id: 'provider',
        label: t('provider', 'Provider'),
        value: data?.provider_name || '-',
      },
      {
        id: 'member-number',
        label: t('memberNumber', 'Member Number'),
        value: data?.member_number || '-',
      },
      {
        id: 'scheme',
        label: t('scheme', 'Scheme'),
        value: data?.scheme_name || '-',
      },
      {
        id: 'service-type',
        label: t('serviceType', 'Service Type'),
        value: data?.service_type || '-',
      },
      {
        id: 'consent-token',
        label: t('consentToken', 'Consent Token'),
        value: data?.authorization_code || '-',
      },
      {
        id: 'authorization-status',
        label: t('authorizationStatus', 'Authorization Status'),
        value: data?.claim_auth_status ?? data?.workflow_state ?? '-',
      },
      {
        id: 'visit-start',
        label: t('visitStart', 'Visit Start'),
        value: formatDateValue(data?.visit_start),
      },
      {
        id: 'visit-end',
        label: t('visitEnd', 'Visit End'),
        value: formatDateValue(data?.visit_end),
      },
      {
        id: 'diagnoses',
        label: t('diagnoses', 'Diagnoses'),
        value: data?.diagnoses_count ?? '-',
      },
      {
        id: 'total-claim-net-amount',
        label: t('totalClaimNetAmount', 'Total Claim Net Amount'),
        value: formatAmount(Number(data?.total_claim_net_amount ?? 0)),
      },
    ],
    [data, isInpatientClaim, t],
  );

  const diagnosisHeaders = [
    { key: 'diagnosisCode', header: t('diagnosisCode', 'Code') },
    { key: 'diagnosisName', header: t('diagnosisName', 'Diagnosis') },
    { key: 'interventionCode', header: t('interventionCode', 'Intervention Code') },
  ];

  const diagnosisRows = (data?.claim_diagnoses ?? []).map((diagnosis: ClaimDiagnosis, index: number) => ({
    id: `diagnosis-${diagnosis.claim_diagnosis_id ?? index}`,
    diagnosisCode: diagnosis.diagnosis_code || '-',
    diagnosisName: diagnosis.diagnosis_name || '-',
    interventionCode: diagnosis.intervention_code || '-',
  }));

  const interventionHeaders = [
    { key: 'code', header: t('code', 'Code') },
    { key: 'name', header: t('name', 'Name') },
    { key: 'fund', header: t('fund', 'Fund') },
    { key: 'status', header: t('status', 'Status') },
    { key: 'tariff', header: t('tariff', 'Tariff') },
  ];

  const interventionRows = (data?.interventions ?? []).map((intervention: any, index: number) => ({
    id: `intervention-${intervention.id ?? index}`,
    code: intervention.intervention_code || '-',
    name: intervention.intervention_name || '-',
    fund: intervention.intervention_fund || '-',
    status: intervention.workflow_state || '-',
    tariff: intervention.keph_level_tarrif,
  }));

  const invoiceHeaders = [
    { key: 'invoiceNumber', header: t('invoiceNumber', 'Invoice Number') },
    { key: 'provider', header: t('provider', 'Provider') },
    { key: 'scheme', header: t('scheme', 'Scheme') },
    { key: 'status', header: t('status', 'Status') },
    { key: 'gross', header: t('grossAmount', 'Gross') },
    { key: 'net', header: t('netAmount', 'Net') },
  ];

  const invoiceEntries = useMemo<PreviewInvoice[]>(() => {
    if (!data) {
      return [];
    }
    const anyD = data as any;
    if (Array.isArray(anyD.invoices) && anyD.invoices.length > 0) {
      return anyD.invoices.map((inv: any, index: number) => {
        const rawLineItems = Array.isArray(inv.lines)
          ? inv.lines
          : Array.isArray(inv.lineItems)
          ? inv.lineItems
          : Array.isArray(inv.items)
          ? inv.items
          : Array.isArray(anyD.lineItems) && anyD.invoices.length === 1
          ? anyD.lineItems
          : [];

        return {
          uuid: inv.uuid ?? inv.id ?? data.uuid ?? data.id?.toString?.() ?? `invoice-${index}`,
          id: inv.id ?? `${index}`,
          invoiceNumber: inv.invoice_number || inv.id,
          provider: inv.provider_name,
          scheme: inv.scheme_name || inv.scheme_code,
          status: inv.workflow_state || inv.dispatch_status || '-',
          gross: formatAmount(Number(inv.total_inv_amount ?? inv.total_inv_net_amount ?? 0)),
          net: formatAmount(Number(inv.total_inv_net_amount ?? inv.total_inv_amount ?? 0)),
          lineItems: rawLineItems.map((lineItem: any, lineIndex: number) => buildPreviewLineItem(lineItem, lineIndex)),
        };
      });
    }

    if (Array.isArray(data.lineItems) && data.lineItems.length > 0) {
      return [
        {
          uuid: data.uuid ?? data.id?.toString?.() ?? 'invoice-1',
          id: data.id?.toString?.() ?? data.uuid ?? '0',
          invoiceNumber: data.receiptNumber || data.id?.toString?.() || 'invoice-1',
          provider: data.cashPointName || data.cashier?.display,
          scheme: data.scheme_name || data.scheme_code,
          status: data.status || '-',
          gross: formatAmount(Number(data.total_claim_net_amount ?? 0)),
          net: formatAmount(Number(data.total_claim_net_amount ?? 0)),
          lineItems: data.lineItems.map((lineItem: any, index: number) => buildPreviewLineItem(lineItem, index)),
        },
      ];
    }

    return [];
  }, [data]);

  const invoiceRows = useMemo(
    () =>
      invoiceEntries.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        provider: invoice.provider,
        scheme: invoice.scheme,
        status: invoice.status,
        gross: invoice.gross,
        net: invoice.net,
      })),
    [invoiceEntries],
  );

  const claimAttachments = useMemo(
    () => (Array.isArray(data?.claim_attachments) ? data.claim_attachments : []),
    [data?.claim_attachments],
  );

  const selectedInvoice = useMemo(
    () =>
      invoiceEntries.find(
        (invoice) => invoice.invoiceNumber === selectedInvoiceNumber || invoice.id === selectedInvoiceNumber,
      ),
    [invoiceEntries, selectedInvoiceNumber],
  );

  const selectedInvoiceBill = useMemo(
    () => (data && selectedInvoice ? buildPreviewBill(data, selectedInvoice, selectedInvoice.lineItems) : null),
    [data, selectedInvoice],
  );
  const selectedInvoiceUuid = selectedInvoiceBill?.uuid ?? selectedInvoice?.uuid;

  const lineItemHeaders = [
    { key: 'item', header: t('item', 'Item') },
    { key: 'qty', header: t('qty', 'Qty') },
    { key: 'unitPrice', header: t('unitPrice', 'Unit Price') },
    { key: 'total', header: t('total', 'Total') },
    { key: 'status', header: t('status', 'Status') },
  ];

  const lineItemRows = useMemo(
    () =>
      (selectedInvoice?.lineItems ?? []).map((lineItem: LineItem, index) => {
        const isLineItemCancelled = lineItem?.is_cancellation === true;

        return {
          id: lineItem.uuid ?? `${selectedInvoice?.id ?? 'line'}-${index}`,
          item: lineItem.item || lineItem.display || lineItem.billableService || '-',
          qty: lineItem.quantity ?? 1,
          unitPrice: formatAmount(Number(lineItem.price ?? 0)),
          total: formatAmount(Number((lineItem.price ?? 0) * (lineItem.quantity ?? 1))),
          status: isLineItemCancelled ? t('cancelled', 'Cancelled') : lineItem.paymentStatus || '-',
          lineItem,
        };
      }),
    [isClosed, onClose, selectedInvoice, selectedInvoiceUuid, t, patient_uuid],
  );

  return (
    <>
      <ModalHeader closeModal={onClose}>{t('claimPreview', 'Claim Preview')}</ModalHeader>
      <ModalBody>
        {isLoading && (
          <InlineLoading
            status="active"
            iconDescription={t('loading', 'Loading')}
            description={t('loadingClaimPreview', 'Loading claim preview')}
          />
        )}

        {error && <ErrorState error={error} headerTitle={t('previewError', 'Preview Error')} />}

        {data && !isLoading && (
          <div>
            <DataTable rows={summaryRows} headers={summaryHeaders} size="sm" useZebraStyles>
              {({ rows, headers, getHeaderProps, getRowProps }) => (
                <Table aria-label={t('claimSummary', 'Claim Summary')} size="sm" useZebraStyles>
                  <TableHead>
                    <TableRow>
                      {headers.map((header) => (
                        <TableHeader {...getHeaderProps({ header })}>{header.header}</TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.filter(Boolean).map((row) => (
                      <TableRow {...getRowProps({ row })}>
                        {Array.isArray(row.cells) &&
                          row.cells.map((cell, ci) => (
                            <TableCell key={cell?.id ?? `${row.id ?? 'row'}-cell-${ci}`}>
                              {cell?.value as React.ReactNode}
                            </TableCell>
                          ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </DataTable>

            <div className={styles.sectionSpacing}>
              <Select
                id="invoice-number"
                labelText={t('invoiceNumber', 'Invoice Number')}
                value={selectedInvoiceNumber}
                onChange={(e) => setSelectedInvoiceNumber((e.target as HTMLSelectElement).value)}>
                {invoiceNumbers.length === 0 ? (
                  <SelectItem value="" text={t('noInvoicesFound', 'No invoices found')} />
                ) : (
                  invoiceNumbers.map((invoiceNumber) => (
                    <SelectItem key={invoiceNumber} value={invoiceNumber} text={invoiceNumber} />
                  ))
                )}
              </Select>
            </div>

            {selectedInvoice && (
              <div className={styles.lineItemsSection}>
                <label className={styles.lineItemsTitle}>{t('lineItems', 'Line Items')}</label>

                {lineItemRows.length === 0 ? (
                  <p className={styles.noLineItems}>{t('noLineItems', 'No line items found for this invoice')}</p>
                ) : (
                  <div className={styles.lineItemsTableWrapper}>
                    <Table aria-label={t('lineItems', 'Line Items')} size="sm" useZebraStyles>
                      <TableHead>
                        <TableRow>
                          {lineItemHeaders.map((header) => (
                            <TableHeader key={header.key}>{header.header}</TableHeader>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {lineItemRows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>{row.item}</TableCell>
                            <TableCell>{row.qty}</TableCell>
                            <TableCell>{row.unitPrice}</TableCell>
                            <TableCell>{row.total}</TableCell>
                            <TableCell>{row.status}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {diagnosisRows.length > 0 && (
              <div className={styles.claimDetails}>
                <label className={styles.sectionLabel}>{t('diagnoses', 'Diagnoses')}</label>
                <DataTable rows={diagnosisRows} headers={diagnosisHeaders} size="sm" useZebraStyles>
                  {({ rows, headers, getHeaderProps, getRowProps }) => (
                    <Table aria-label={t('diagnoses', 'Diagnoses')} size="sm" useZebraStyles>
                      <TableHead>
                        <TableRow>
                          {headers.map((header) => (
                            <TableHeader {...getHeaderProps({ header })}>{header.header}</TableHeader>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.filter(Boolean).map((row) => (
                          <TableRow {...getRowProps({ row })}>
                            {Array.isArray(row.cells) &&
                              row.cells.map((cell, ci) => (
                                <TableCell key={cell?.id ?? `${row.id ?? 'row'}-cell-${ci}`}>
                                  {cell?.value as React.ReactNode}
                                </TableCell>
                              ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </DataTable>
              </div>
            )}

            {interventionRows.length > 0 && (
              <div className={styles.claimDetails}>
                <label className={styles.sectionLabel}>{t('interventions', 'Interventions')}</label>
                <DataTable rows={interventionRows} headers={interventionHeaders} size="sm" useZebraStyles>
                  {({ rows, headers, getHeaderProps, getRowProps }) => (
                    <Table aria-label={t('interventions', 'Interventions')} size="sm" useZebraStyles>
                      <TableHead>
                        <TableRow>
                          {headers.map((header) => (
                            <TableHeader {...getHeaderProps({ header })}>{header.header}</TableHeader>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.filter(Boolean).map((row) => (
                          <TableRow {...getRowProps({ row })}>
                            {Array.isArray(row.cells) &&
                              row.cells.map((cell, ci) => (
                                <TableCell key={cell?.id ?? `${row.id ?? 'row'}-cell-${ci}`}>
                                  {cell?.value as React.ReactNode}
                                </TableCell>
                              ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </DataTable>
              </div>
            )}

            {invoiceRows.length > 0 && (
              <div className={styles.invoicesSection}>
                <label className={styles.sectionLabel}>{t('invoices', 'Invoices')}</label>
                <DataTable rows={invoiceRows} headers={invoiceHeaders} size="sm" useZebraStyles>
                  {({ rows, headers, getHeaderProps, getRowProps }) => (
                    <Table aria-label={t('invoices', 'Invoices')} size="sm" useZebraStyles>
                      <TableHead>
                        <TableRow>
                          {headers.map((header) => (
                            <TableHeader {...getHeaderProps({ header })}>{header.header}</TableHeader>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.filter(Boolean).map((row) => (
                          <TableRow {...getRowProps({ row })}>
                            {Array.isArray(row.cells) &&
                              row.cells.map((cell, ci) => (
                                <TableCell key={cell?.id ?? `${row.id ?? 'row'}-cell-${ci}`}>
                                  {cell?.value as React.ReactNode}
                                </TableCell>
                              ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </DataTable>
              </div>
            )}

            {claimAttachments.length > 0 && (
              <div className={styles.documentsSection}>
                <label className={styles.sectionLabel}>{t('submittedDocuments', 'Submitted documents')}</label>
                <div className={styles.documentList}>
                  {claimAttachments.map((attachment, index: number) => {
                    const previewUrl =
                      attachment.data ?? attachment.uploaded_file ?? attachment.file_url ?? attachment.url ?? '';
                    const attachmentLabel =
                      attachment.title ?? attachment.document_title ?? attachment.attachment ?? `Document ${index + 1}`;
                    const attachmentType = attachment.attachment_type ?? attachment.document_type ?? 'FILE';

                    return (
                      <div
                        key={attachment.uuid ?? attachment.id ?? `${attachmentLabel}-${index}`}
                        className={styles.documentRow}>
                        <Tag type="blue" size="sm">
                          {attachmentType}
                        </Tag>
                        <span className={styles.documentTitle}>{attachmentLabel}</span>
                        {previewUrl ? (
                          <Button
                            kind="ghost"
                            size="sm"
                            className={styles.documentPreviewButton}
                            href={previewUrl}
                            renderIcon={Document}
                            iconDescription={t('previewAttachment', 'Preview attachment')}
                            rel="noopener noreferrer"
                            target="_blank"
                            type="button">
                            {t('preview', 'Preview')}
                          </Button>
                        ) : (
                          <span className={styles.muted}>—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose} type="button">
          {t('closeModal', 'Close modal')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default ClaimPreviewModal;
