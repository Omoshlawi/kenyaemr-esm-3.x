import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  ButtonSet,
  DataTable,
  InlineLoading,
  ModalBody,
  ModalFooter,
  ModalHeader,
  OverflowMenu,
  OverflowMenuItem,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TextInput,
} from '@carbon/react';
import { ErrorState, formatDate, openmrsFetch, restBaseUrl, showModal, showToast } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { sendSHAOtp } from '../../../../billing-form/social-health-authority/sha-virtual-claim.resource';
import { ClaimPreview, useClaimPreview, useVisit } from '../../../dashboard/form/claims-form.resource';
import { type LineItem, type MappedBill } from '../../../../types';
import { Edit, TrashCan } from '@carbon/react/icons';

const formatAmount = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '-';
  }

  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
};

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

const getDispatchErrorMessage = (error: unknown, fallback: string): string => {
  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const err = error as {
    message?: string;
    upstream_error?: { message?: string; error?: string };
    responseBody?: unknown;
    response?: { data?: unknown };
    cause?: { responseBody?: unknown; response?: { data?: unknown } };
  };

  const parseMaybeJson = (value: unknown): any => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return undefined;
      }
    }

    if (value && typeof value === 'object') {
      return value;
    }

    return undefined;
  };

  const candidates = [err.responseBody, err.response?.data, err.cause?.responseBody, err.cause?.response?.data, err]
    .map(parseMaybeJson)
    .filter(Boolean);

  for (const candidate of candidates) {
    const message =
      candidate?.upstream_error?.message ||
      candidate?.responseBody?.upstream_error?.message ||
      candidate?.message ||
      candidate?.error?.message ||
      candidate?.upstream_error?.error ||
      candidate?.error;

    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  return err.message || fallback;
};

type ClaimPreviewModalProps = {
  onClose: () => void;
  title?: string;
  consentToken?: string;
  billNumber?: string;
  documentUrl?: string;
  visit_uuid?: string;
  receiptNumber?: string;
  patientUuid?: string;
};

type ClaimDiagnosis = {
  claim_diagnosis_id: number;
  diagnosis_code?: string;
  diagnosis_name?: string;
  is_flagged_diagnosis?: boolean;
  is_inpatient?: boolean;
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

const buildPreviewLineItem = (lineItem: any, index: number): LineItem => ({
  uuid: lineItem?.uuid ?? lineItem?.id ?? `line-item-${index}`,
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
  title,
  visit_uuid,
  receiptNumber,
  billNumber,
  patientUuid,
}) => {
  const { t } = useTranslation();
  const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState('');
  const [dischargeDate, setDischargeDate] = useState('');
  const [dischargeReason, setDischargeReason] = useState('ABSCONDED');
  const [claimOtp, setClaimOtp] = useState('');
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [hasRequestedOtp, setHasRequestedOtp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { visits: recentVisit, error: visitError, isLoading: visitLoading } = useVisit(patientUuid);

  // Use a consent token for fetching the preview that does not depend on preview data

  const { claimPreview: data, isLoading, error } = useClaimPreview(visit_uuid);

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
        id: 'claim-id',
        label: t('claimId', 'Claim ID'),
        value: data?.id ?? data?.member_number ?? '-',
      },
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
        id: 'claim-type',
        label: t('claimType', 'Claim Type'),
        value: isInpatientClaim ? t('inpatient', 'Inpatient') : t('outpatient', 'Outpatient'),
      },
      {
        id: 'authorization-status',
        label: t('authorizationStatus', 'Authorization Status'),
        value: data?.claim_auth_status ?? data?.status ?? '-',
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
    { key: 'inpatient', header: t('inpatient', 'Inpatient') },
    { key: 'flagged', header: t('flagged', 'Flagged') },
  ];

  const diagnosisRows = (data?.claim_diagnoses ?? []).map((diagnosis: ClaimDiagnosis, index: number) => ({
    id: `diagnosis-${diagnosis.claim_diagnosis_id ?? index}`,
    diagnosisCode: diagnosis.diagnosis_code || '-',
    diagnosisName: diagnosis.diagnosis_name || '-',
    inpatient: diagnosis.is_inpatient ? t('yes', 'Yes') : t('no', 'No'),
    flagged: diagnosis.is_flagged_diagnosis ? t('yes', 'Yes') : t('no', 'No'),
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
    { key: 'actions', header: t('actions', 'Actions') },
  ];

  const lineItemRows = useMemo(
    () =>
      (selectedInvoice?.lineItems ?? []).map((lineItem, index) => ({
        id: lineItem.uuid ?? `${selectedInvoice?.id ?? 'line'}-${index}`,
        item: lineItem.item || lineItem.display || lineItem.billableService || '-',
        qty: lineItem.quantity ?? 1,
        unitPrice: formatAmount(Number(lineItem.price ?? 0)),
        total: formatAmount(Number((lineItem.price ?? 0) * (lineItem.quantity ?? 1))),
        status: lineItem.paymentStatus || '-',
        actions: selectedInvoiceUuid ? (
          <ButtonSet aria-label={t('lineItemActions', 'Line item actions')}>
            <Button
              hasIconOnly
              kind="ghost"
              renderIcon={(props) => <Edit size={16} {...props} />}
              title={t('editLineItem', 'Edit line item')}
              onClick={() => {
                const dispose = showModal('edit-claim-line-modal', {
                  onClose: () => {
                    dispose();
                  },
                  billUuid: selectedInvoiceUuid,
                  claimLineId: lineItem.uuid,
                  quantity: lineItem.quantity,
                  scheme_code: lineItem.priceName ?? undefined,
                  unit_price: lineItem.price,
                  size: 'sm',
                });
              }}
            />
            <Button
              hasIconOnly
              kind="ghost"
              renderIcon={(props) => <TrashCan size={16} {...props} />}
              title={t('deleteLineItem', 'Delete line item')}
              style={{ paddingLeft: '0.5rem' }}
              onClick={async () => {
                const confirmed = window.confirm(
                  t('confirmDeleteLine', 'Are you sure you want to delete this line item?'),
                );
                if (!confirmed) {
                  return;
                }

                try {
                  await openmrsFetch(`${restBaseUrl}/bill/line/edit`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ line_guid: lineItem.uuid }),
                  });

                  showToast({
                    critical: false,
                    kind: 'success',
                    title: t('deleted', 'Deleted'),
                    description: t('lineDeleted', 'Line item deleted successfully'),
                  });
                  onClose();
                } catch (err) {
                  showToast({
                    critical: true,
                    kind: 'error',
                    title: t('deleteFailed', 'Delete failed'),
                    description: (err as any)?.message ?? t('deleteLineFailed', 'Failed to delete line item'),
                  });
                }
              }}
            />
          </ButtonSet>
        ) : null,
        lineItem,
      })),
    [onClose, selectedInvoice, selectedInvoiceUuid, t],
  );
  const patientId = data?.member_number;
  const interventionCodes = useMemo(
    () => (data?.interventions ?? []).map((i: any) => i.intervention_code).filter(Boolean) as string[],
    [data?.interventions],
  );

  const handleRequestOtp = async () => {
    if (!patientId || interventionCodes.length === 0) {
      showToast({
        critical: true,
        kind: 'error',
        title: t('otpRequestError', 'OTP request error'),
        description: t('otpRequestMissingData', 'Patient ID and intervention codes are required to request OTP.'),
      });
      return;
    }

    setIsRequestingOtp(true);

    try {
      const response = await sendSHAOtp(patientId, interventionCodes);
      setHasRequestedOtp(true);
      showToast({
        critical: false,
        kind: 'success',
        title: t('otpSent', 'OTP sent'),
        description: response?.raw_response?.message ?? t('otpSentDescription', 'An OTP has been sent to the patient.'),
      });
    } catch (err) {
      showToast({
        critical: true,
        kind: 'error',
        title: t('otpRequestError', 'OTP request error'),
        description: t('otpRequestFailed', 'Unable to request OTP. Please try again.'),
      });
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleDispatchClaim = async () => {
    if (!data || !selectedInvoiceNumber) {
      return;
    }

    if (isInpatientClaim && !hasRequestedOtp) {
      showToast({
        critical: true,
        kind: 'error',
        title: t('otpNotRequested', 'OTP not requested'),
        description: t('requestOtpBeforeSubmitting', 'Request OTP first before entering it and submitting.'),
      });
      return;
    }

    if (isInpatientClaim && !claimOtp.trim()) {
      showToast({
        critical: true,
        kind: 'error',
        title: t('otpRequired', 'OTP required'),
        description: t('otpRequiredDescription', 'Enter the OTP received before submitting the claim.'),
      });
      return;
    }

    if (isInpatientClaim && (!dischargeDate || !dischargeReason)) {
      showToast({
        critical: true,
        kind: 'error',
        title: t('inpatientDetailsRequired', 'Inpatient details required'),
        description: t('inpatientDetailsRequiredDescription', 'Discharge date and discharge reason are required.'),
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint = isInpatientClaim
        ? `${restBaseUrl}/insuranceclaims/bill/inpatient/submit`
        : `${restBaseUrl}/insuranceclaims/bill/outpatient/submit`;

      const body: any = {
        consent_token: data.authorization_code,
        invoice_number: receiptNumber,
        visit_uuid: visit_uuid,
      };

      if (isInpatientClaim) {
        body.otp = claimOtp;
        body.discharge_date = dischargeDate;
        body.discharge_reason = dischargeReason;
      }

      await openmrsFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      showToast({
        critical: false,
        kind: 'success',
        title: t('claimSubmitted', 'Claim submitted'),
        description: isInpatientClaim
          ? t('inpatientClaimSubmittedDescription', 'Inpatient claim submitted successfully.')
          : t('outpatientClaimSubmittedDescription', 'Outpatient claim submitted successfully.'),
      });

      onClose();
    } catch (err: unknown) {
      const errorDescription = getDispatchErrorMessage(
        err,
        t('claimDispatchErrorDescription', 'An error occurred while dispatching the claim. Please try again.'),
      );

      showToast({
        critical: true,
        kind: 'error',
        title: t('claimDispatchError', 'Claim Dispatch Error'),
        description: errorDescription,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResubmitClaim = async () => {
    onClose();

    window.setTimeout(() => {
      const dispose = showModal('resubmit-claim-modal', {
        title: t('resubmitClaim', 'Resubmit Claim'),
        visitUuid: visit_uuid,
        onClose: () => {
          dispose();
        },
        size: 'sm',
      });
    }, 0);
  };

  const handleCloseClaim = () => {
    onClose();

    window.setTimeout(() => {
      const dispose = showModal('close-claim-modal', {
        title: t('closeClaim', 'Close Claim'),
        billUuid: billNumber,
        billNumber: receiptNumber,
        visit_uuid: recentVisit?.uuid,
        onClose: () => {
          dispose();
        },
        size: 'sm',
      });
    }, 0);
  };

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

            <div style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
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
              <div style={{ marginTop: '1rem', overflow: 'visible' }}>
                <label style={{ marginTop: '1rem', fontWeight: 'bold' }}>{t('lineItems', 'Line Items')}</label>

                {lineItemRows.length === 0 ? (
                  <p style={{ marginTop: '0.5rem' }}>{t('noLineItems', 'No line items found for this invoice')}</p>
                ) : (
                  <div style={{ overflow: 'visible', width: '100%' }}>
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
                            <TableCell>{row.actions}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {isInpatientClaim && (
              <div style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <Button kind="secondary" onClick={handleRequestOtp} type="button" disabled={isRequestingOtp}>
                    {isRequestingOtp ? t('sendingOtp', 'Sending OTP...') : t('sendOtp', 'Send OTP')}
                  </Button>

                  <div style={{ minWidth: 220, flex: '1 1 auto' }}>
                    <TextInput
                      id="claim-otp"
                      labelText={t('otp', 'OTP')}
                      value={claimOtp}
                      onChange={(e) => {
                        setClaimOtp(e.target.value);
                        setHasRequestedOtp(true);
                      }}
                      placeholder={t('enterOtp', 'Enter OTP')}
                    />
                  </div>
                </div>
              </div>
            )}

            {isInpatientClaim && (
              <>
                <TextInput
                  id="discharge-date"
                  type="date"
                  labelText={t('dischargeDate', 'Discharge Date')}
                  value={dischargeDate}
                  onChange={(e) => setDischargeDate(e.target.value)}
                />

                <Select
                  id="discharge-reason"
                  labelText={t('dischargeReason', 'Discharge Reason')}
                  value={dischargeReason}
                  onChange={(e) => setDischargeReason((e.target as HTMLSelectElement).value)}>
                  <SelectItem value="ABSCONDED" text="ABSCONDED" />
                  <SelectItem value="DISCHARGED" text="DISCHARGED" />
                  <SelectItem value="DIED" text="DIED" />
                  <SelectItem value="REFERRED" text="REFERRED" />
                </Select>

                <p>
                  {t('dischargeOtpNote', 'The OTP entered above will be used when submitting the inpatient claim.')}
                </p>
              </>
            )}

            {diagnosisRows.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <label style={{ marginTop: '1rem', fontWeight: 'bold' }}>{t('diagnoses', 'Diagnoses')}</label>
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
              <div style={{ marginTop: '1rem' }}>
                <label style={{ marginTop: '1rem', fontWeight: 'bold' }}>{t('interventions', 'Interventions')}</label>
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
              <div style={{ marginTop: '1.25rem' }}>
                <label style={{ marginTop: '1rem', fontWeight: 'bold' }}>{t('invoices', 'Invoices')}</label>
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
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose} type="button">
          {t('closeModal', 'Close modal')}
        </Button>
        <Button kind="danger" onClick={handleCloseClaim} style={{ marginBottom: '1rem' }}>
          {t('closeClaim', 'Close Claim')}
        </Button>
        <Button kind="tertiary" onClick={handleResubmitClaim} style={{ marginBottom: '1rem' }}>
          {t('resubmitClaim', 'Resubmit Claim')}
        </Button>
        <Button
          kind="primary"
          onClick={() => handleDispatchClaim()}
          // disabled={
          //   !data ||
          //   !selectedInvoiceNumber ||
          //   isSubmitting ||
          //   !hasRequestedOtp ||
          //   !claimOtp.trim() ||
          //   (isInpatientClaim && (!dischargeDate || !dischargeReason))
          // }
          type="button">
          {isSubmitting ? t('submitting', 'Submitting...') : t('submitClaim', 'Submit Claim')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default ClaimPreviewModal;
