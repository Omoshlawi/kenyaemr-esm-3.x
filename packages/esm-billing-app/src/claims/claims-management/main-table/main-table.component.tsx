import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DataTable,
  DataTableSkeleton,
  DatePicker,
  DatePickerInput,
  Pagination,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from '@carbon/react';
import { ConfigurableLink, formatDate, useLayoutType } from '@openmrs/esm-framework';
import { useClaimsMetrics, type VirtualClaim } from '../../../hooks/useClaimsMetrics';
import {
  billingUrl,
  CLAIMS_PAGE_SIZE,
  STAGE_CONFIG,
  SERVICE_TYPE_TAG,
  SERVICE_TYPES,
  toTitleCase,
} from '../../../utils';
import styles from './main-table.scss';
import dayjs from 'dayjs';

const MainTable: React.FC = () => {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const responsiveSize = layout === 'tablet' ? 'lg' : 'sm';

  const [fromDate, setFromDate] = useState<string>(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
  const [toDate, setToDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [serviceType, setServiceType] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  const { claims, isLoading, error } = useClaimsMetrics(fromDate, toDate, serviceType || undefined);

  const headers = [
    { key: 'dateCreated', header: t('dateCreated', 'Date Created') },
    { key: 'patientName', header: t('patientName', 'Patient Name') },
    { key: 'authCode', header: t('authCode', 'Auth Code') },
    { key: 'serviceType', header: t('serviceType', 'Service Type') },
    { key: 'fund', header: t('fund', 'Fund') },
    { key: 'invoiceNumber', header: t('invoiceNumber', 'Invoice No.') },
    { key: 'stage', header: t('stage', 'Stage') },
  ];

  const start = (currentPage - 1) * CLAIMS_PAGE_SIZE;
  const pageResults: VirtualClaim[] = claims.slice(start, start + CLAIMS_PAGE_SIZE);

  const tableRows = pageResults.map((claim) => {
    const stageCfg = STAGE_CONFIG[claim.display_stage] ?? { label: claim.display_status, type: 'gray' };
    const serviceTagType = SERVICE_TYPE_TAG[claim.service_type] ?? 'gray';
    return {
      id: claim.virtual_claim_uuid,
      patientName: (
        <ConfigurableLink
          style={{ textDecoration: 'none', maxWidth: '50%' }}
          to={billingUrl}
          templateParams={{ patientUuid: claim.patient_uuid ?? '', uuid: claim.bill_uuid ?? '' }}>
          {claim.patient_name ? toTitleCase(claim.patient_name) : '—'}
        </ConfigurableLink>
      ),
      authCode: claim.authorization_code ?? '—',
      fund: claim.scheme_code ? claim.scheme_code : '—',
      serviceType: claim.service_type ? <Tag type={serviceTagType as any}>{toTitleCase(claim.service_type)}</Tag> : '—',
      invoiceNumber: claim.invoice_number ?? '—',
      stage: <Tag type={stageCfg.type as any}>{stageCfg.label}</Tag>,
      dateCreated: claim.date_created ? formatDate(new Date(claim.date_created)) : '—',
    };
  });

  return (
    <div className={styles.container}>
      <div className={styles.filterBar}>
        <DatePicker
          datePickerType="range"
          dateFormat="Y-m-d"
          value={[fromDate, toDate]}
          onChange={(dates) => {
            if (dates[0]) {
              setFromDate(dayjs(dates[0]).format('YYYY-MM-DD'));
            }
            if (dates[1]) {
              setToDate(dayjs(dates[1]).format('YYYY-MM-DD'));
              setCurrentPage(1);
            }
          }}>
          <DatePickerInput id="from-date" labelText={t('fromDate', 'From')} placeholder="YYYY-MM-DD" size="sm" />
          <DatePickerInput id="to-date" labelText={t('toDate', 'To')} placeholder="YYYY-MM-DD" size="sm" />
        </DatePicker>
        <Select
          id="service-type-filter"
          labelText={t('serviceType', 'Service Type')}
          size="sm"
          value={serviceType}
          className={styles.serviceTypeSelect}
          onChange={(e) => {
            setServiceType(e.target.value);
            setCurrentPage(1);
          }}>
          <SelectItem value="" text={t('all', 'All')} />
          {SERVICE_TYPES.map((type) => (
            <SelectItem key={type} value={type} text={type.charAt(0) + type.slice(1).toLowerCase()} />
          ))}
        </Select>
      </div>

      {isLoading ? (
        <DataTableSkeleton
          headers={headers}
          rowCount={CLAIMS_PAGE_SIZE}
          columnCount={headers.length}
          zebra
          showToolbar={false}
          showHeader={false}
        />
      ) : (
        <DataTable rows={tableRows} headers={headers} useZebraStyles isSortable size={responsiveSize}>
          {({ rows, headers, getHeaderProps, getRowProps, getTableProps }) => (
            <TableContainer>
              <Table {...getTableProps()}>
                <TableHead>
                  <TableRow>
                    {headers.map((header) => {
                      const { key, ...headerProps } = getHeaderProps({ header });
                      return (
                        <TableHeader key={header.key} {...headerProps}>
                          {header.header}
                        </TableHeader>
                      );
                    })}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {error && (
                    <TableRow>
                      <TableCell colSpan={headers.length}>{t('errorLoadingClaims', 'Error loading claims')}</TableCell>
                    </TableRow>
                  )}
                  {!error && rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={headers.length}>
                        {t('noClaimsFound', 'No claims found for the selected filters')}
                      </TableCell>
                    </TableRow>
                  )}
                  {!error &&
                    rows.map((row) => {
                      const { key, ...rowProps } = getRowProps({ row });
                      return (
                        <TableRow key={row.id} {...rowProps}>
                          {row.cells.map((cell) => (
                            <TableCell key={cell.id}>{cell.value}</TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataTable>
      )}

      <Pagination
        page={currentPage}
        pageSize={CLAIMS_PAGE_SIZE}
        pageSizes={[10, 20, 30]}
        totalItems={claims.length}
        onChange={({ page }) => setCurrentPage(page)}
        size={responsiveSize}
      />
    </div>
  );
};

export default MainTable;
