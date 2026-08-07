import {
  Button,
  DataTable,
  DataTableSkeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';
import { CardHeader, ErrorState, formatDatetime, parseDate, showModal } from '@openmrs/esm-framework';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { EmtCase } from '../../types';
import { useEmtCases } from '../refferals.resource';

const EmtReferrals = () => {
  const { t } = useTranslation();
  const { error, isLoading, referrals } = useEmtCases();
  const headers = [
    {
      header: t('crId', 'CR ID'),
      key: 'crId',
    },
    {
      header: t('status', 'Status'),
      key: 'status',
    },
    {
      header: t('ambulanceFrCode', 'Ambulance FR Code'),
      key: 'ambulanceFrCode',
    },
    {
      header: t('facilityFrCode', 'Facility FR Code'),
      key: 'facilityFrCode',
    },
    {
      header: t('requested', 'Requested'),
      key: 'requestedAt',
    },
    { header: t('actions', 'Actions'), key: 'actions' },
  ];
  const handleView = (item: EmtCase) => {
    const dismiss = showModal('emt-case-detail-modal', { onClose: () => dismiss(), item });
  };
  const handleAccept = (item: EmtCase) => {
    const dismiss = showModal('accept-emt-case-modal', { onClose: () => dismiss(), item });
  };

  const rows = referrals?.map((referral) => ({
    id: referral.uuid,
    crId: referral.crId,
    status: referral.status,
    ambulanceFrCode: referral.ambulanceFrCode,
    facilityFrCode: referral.facilityFrCode,
    requestedAt: referral.requestedAt ? formatDatetime(parseDate(referral.requestedAt)) : '--',
    actions: (
      <>
        <Button size="xs" onClick={() => handleView(referral)}>
          {t('viewDetails', 'Case Details')}
        </Button>
        <Button size="xs" onClick={() => handleAccept(referral)}>
          {t('accept', 'Accept')}
        </Button>
      </>
    ),
  }));
  if (isLoading) {
    return <DataTableSkeleton />;
  }

  if (error) {
    <ErrorState headerTitle={t('emtCases', 'EMT Cases')} error={error} />;
  }

  return (
    <div>
      <CardHeader title={t('emtCases', 'EMT Cases')}>
        <></>
      </CardHeader>
      <DataTable isSortable rows={rows} headers={headers} useZebraStyles={rows?.length > 1 ? true : false}>
        {({ rows, headers, getRowProps, getTableProps }) => (
          <TableContainer>
            <Table {...getTableProps()} aria-label="Referred Patients">
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
    </div>
  );
};

export default EmtReferrals;
