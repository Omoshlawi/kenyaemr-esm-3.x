import {
  Button,
  DataTable,
  DataTableSkeleton,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableSelectAll,
  TableSelectRow,
} from '@carbon/react';
import { Add, ArrowRight } from '@carbon/react/icons';
import { ConfigurableLink, ErrorState, showModal, showNotification, usePagination } from '@openmrs/esm-framework';
import { CardHeader, EmptyState, usePaginationInfo } from '@openmrs/esm-patient-common-lib';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useActiveRequests from '../hooks/useActiveRequests';
import useLabManifest from '../hooks/useLabManifest';
import { ActiveRequestOrder } from '../types';
import {
  getActiveRequestPatientIdentifier,
  getPatientIdentifierColumnLabel,
  inferIsEidManifest,
  isCd4Manifest,
  isDrtManifest,
  isHpvManifest,
} from '../utils/patient-identifier-display';
import styles from './lab-manifest-table.scss';
import PatientCCCNumbercell from './patient-ccc-no-cell.component';

interface LabManifestActiveRequestsProps {
  manifestUuid: string;
}

const getDefaultProblemMessage = (manifestType?: number | string | null) => {
  if (inferIsEidManifest(manifestType)) {
    return 'Patient requires HEI number (13887-2026-0020) and CWC (MCHCS) enrollment.';
  }
  if (isCd4Manifest(manifestType)) {
    return 'Patient requires HIV program enrollment and CCC/KDOD number (complete HIV initial form if CCC is missing).';
  }
  if (isHpvManifest(manifestType)) {
    return 'Patient requires Human Papillomavirus Vaccine (HPV) documented in immunizations.';
  }
  if (isDrtManifest(manifestType)) {
    return 'Patient requires CCC/KDOD, initial VL >1000 copies/ml, 3 EAC sessions, and repeat VL >1000 after EAC.';
  }
  return 'Patient requires CCC/KDOD number, HIV care enrollment, and an active ARV regimen.';
};

const getSkippedOrdersMessage = (manifestType?: number | string | null, isEid = false) => {
  if (isCd4Manifest(manifestType)) {
    return 'Orders with missing requirements were skipped. Complete HIV enrollment and CCC/KDOD assignment before adding.';
  }
  if (isHpvManifest(manifestType)) {
    return 'Orders with missing requirements were skipped. Document HPV immunization before adding.';
  }
  if (isDrtManifest(manifestType)) {
    return 'Orders with missing requirements were skipped. Complete DRT eligibility (VL, EAC, CCC/KDOD) before adding.';
  }
  if (isEid) {
    return 'Orders with missing requirements were skipped. Complete HEI/CWC enrollment before adding.';
  }
  return 'Orders with missing requirements were skipped. Complete HEI/CWC enrollment or VL HIV/ARV requirements before adding.';
};

const LabManifestActiveRequests: React.FC<LabManifestActiveRequestsProps> = ({ manifestUuid }) => {
  const { error: requestError, isLoading: isLoadingRequests, request: request } = useActiveRequests(manifestUuid);
  const { manifest, isLoading: isLoadingManifest } = useLabManifest(manifestUuid);

  const { t } = useTranslation();
  const [pageSize, setPageSize] = useState(10);
  const headerTitle = t('activeRequests', 'Active Requests');
  const manifestType = request?.manifestType ?? manifest?.manifestType;
  const isEid = inferIsEidManifest(manifestType, request?.Orders ?? []);
  const identifierHeader = getPatientIdentifierColumnLabel(
    manifestType,
    request?.identifierColumnLabel || (isEid ? 'HEI Number' : undefined),
    t,
  );
  const isLoading = isLoadingRequests || (request?.manifestType == null && isLoadingManifest);
  const error = requestError;
  const { results, totalPages, currentPage, goTo } = usePagination(request?.Orders ?? [], pageSize);
  const { pageSizes } = usePaginationInfo(pageSize, totalPages, currentPage, results.length);
  const ordersByUuid = useMemo(
    () => new Map((request?.Orders ?? []).map((order) => [order.orderUuid, order])),
    [request?.Orders],
  );

  const headers = [
    {
      header: t('patientName', 'Patient name'),
      key: 'patientName',
    },
    {
      header: identifierHeader,
      key: 'cccKdod',
    },
    {
      header: t('dateRequested', 'Date Requested'),
      key: 'dateRequested',
      isSortable: true,
    },
    {
      header: t('actions', 'Actions'),
      key: 'actions',
    },
  ];

  const openAddToManifestModal = (selectedOrders: ActiveRequestOrder[]) => {
    if (selectedOrders.length === 0) {
      return;
    }

    const eligibleOrders = selectedOrders.filter((order) => !order.hasProblem);
    if (eligibleOrders.length === 0) {
      showNotification({
        title: t('cannotAddToManifest', 'Cannot add to manifest'),
        kind: 'error',
        description: selectedOrders[0]?.problemMessage || getDefaultProblemMessage(manifestType),
      });
      return;
    }

    if (eligibleOrders.length < selectedOrders.length) {
      showNotification({
        title: t('someOrdersSkipped', 'Some orders were skipped'),
        kind: 'warning',
        description: t('skippedInvalidOrders', getSkippedOrdersMessage(manifestType, isEid)),
      });
    }

    const dispose = showModal('lab-manifest-order-modal-form', {
      onClose: () => dispose(),
      props: {
        title: eligibleOrders.length > 1 ? 'Add Multiple Orders To Manifest' : undefined,
        manifestType: request?.manifestType ?? manifest?.manifestType,
        selectedOrders: eligibleOrders.map((order) => ({
          labManifest: {
            uuid: manifestUuid,
          },
          order: {
            uuid: order.orderUuid,
          },
          payload: order.payload,
        })),
        orders: eligibleOrders,
      },
    });
  };

  const tableRows =
    results?.map((activeRequest) => {
      const patientChartUrl = '${openmrsSpaBase}/patient/${patientUuid}/chart/Patient Summary';
      const problemMessage =
        activeRequest.problemMessage?.trim() ||
        (activeRequest.hasProblem ? getDefaultProblemMessage(manifestType) : '');

      return {
        id: `${activeRequest.orderUuid}`,
        patientName: activeRequest.patientName ? (
          <ConfigurableLink
            to={patientChartUrl}
            templateParams={{ patientUuid: activeRequest.patientUuid }}
            style={{ textDecoration: 'none' }}>
            {activeRequest.patientName}
          </ConfigurableLink>
        ) : (
          '--'
        ),
        cccKdod: (() => {
          const patientIdentifier = getActiveRequestPatientIdentifier(activeRequest, isEid);
          if (patientIdentifier) {
            return patientIdentifier;
          }
          if (activeRequest?.patientUuid) {
            return <PatientCCCNumbercell patientUuid={activeRequest.patientUuid} useHeiNumber={isEid} />;
          }
          return '--';
        })(),
        dateRequested: activeRequest.dateRequested,
        actions: activeRequest.hasProblem ? (
          <span className={styles.warningText}>{problemMessage}</span>
        ) : (
          <Button
            kind="ghost"
            iconDescription={t('addToManifest', 'Add To manifest')}
            renderIcon={Add}
            hasIconOnly
            onClick={() => openAddToManifestModal([activeRequest])}>
            Add To manifest
          </Button>
        ),
      };
    }) ?? [];

  if (isLoading) {
    return <DataTableSkeleton rowCount={5} />;
  }
  if (error) {
    return <ErrorState headerTitle={headerTitle} error={error} />;
  }

  if ((request?.Orders ?? []).length === 0) {
    return (
      <EmptyState
        headerTitle={t('activeRequests', 'Active Requests')}
        displayText={t('notLabManifetToDisplay', 'There is no lab manifets data to display.')}
      />
    );
  }
  return (
    <div className={styles.widgetContainer}>
      <DataTable
        useZebraStyles
        size="sm"
        rows={tableRows ?? []}
        headers={headers}
        render={({
          rows,
          headers,
          getHeaderProps,
          getRowProps,
          getSelectionProps,
          getTableProps,
          getTableContainerProps,
          selectedRows,
        }) => (
          <>
            <CardHeader title={headerTitle}>
              <Button
                onClick={() => {
                  const selectedOrders = selectedRows
                    .map(({ id }) => ordersByUuid.get(id))
                    .filter((order): order is ActiveRequestOrder => Boolean(order));

                  openAddToManifestModal(selectedOrders);
                }}
                renderIcon={ArrowRight}
                kind="ghost">
                {t('addSelectedSamples', 'Add Selected Samples')}
              </Button>
            </CardHeader>
            <TableContainer {...getTableContainerProps()}>
              <Table {...getTableProps()}>
                <TableHead>
                  <TableRow>
                    <TableSelectAll {...getSelectionProps()} />
                    {headers.map((header, i) => (
                      <TableHeader key={i} {...getHeaderProps({ header, isSortable: true })}>
                        {header.header}
                      </TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i} {...getRowProps({ row })} onClick={(evt) => {}}>
                      <TableSelectRow {...getSelectionProps({ row })} disabled={ordersByUuid.get(row.id)?.hasProblem} />
                      {row.cells.map((cell) => (
                        <TableCell key={cell.id}>{cell.value}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      />

      <Pagination
        page={currentPage}
        pageSize={pageSize}
        pageSizes={pageSizes}
        totalItems={(request?.Orders ?? []).length}
        onChange={({ page, pageSize }) => {
          goTo(page);
          setPageSize(pageSize);
        }}
      />
    </div>
  );
};

export default LabManifestActiveRequests;
