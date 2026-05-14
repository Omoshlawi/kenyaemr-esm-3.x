import React, { useMemo, useState } from 'react';
import {
  DataTableSkeleton,
  Layer,
  Pagination,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
} from '@carbon/react';
import { ErrorState, ExtensionSlot, useOpenmrsPagination, useConfig } from '@openmrs/esm-framework';
import { EmptyState, type Order, usePaginationInfo } from '@openmrs/esm-patient-common-lib';
import { ExpressWorkflowConfig } from '../../config-schema';
import { useTranslation } from 'react-i18next';
import {
  formatAdministrationInstructions,
  formatOrderDate,
  formatTime,
  getDoseText,
  getDrugDisplay,
  useFormatAdministrationInstructions,
} from './admissions-dashboard.utils';

const drugOrderRepresentation =
  'custom:(uuid,action,dateActivated,dateStopped,drug:(display),drugNonCoded,dose,doseUnits:(display),route:(display),frequency:(display),quantity,quantityUnits:(display),duration,durationUnits:(display),orderer:(display,person:(display)))';

const defaultPageSize = 10;

type MedicationRow = {
  id: string;
  date: string;
  drug: string;
  dose: string;
  route: string;
  name: string;
  time: string;
};

type FluidRow = {
  id: string;
  date: string;
  instructions: string;
  name: string;
  reviewDate: string;
};

type AdmissionsDashboardProps = {
  patientUuid: string;
  patient: Record<string, unknown>;
};

const AdmissionsDashboard: React.FC<AdmissionsDashboardProps> = ({ patientUuid, patient }) => {
  const { t } = useTranslation();
  const formatAdministrationInstructionsWithTranslation = useFormatAdministrationInstructions();
  const { inpatientDrugOrderTypeUuid, inpatientCareSettingUuid } = useConfig<ExpressWorkflowConfig>();
  const state = useMemo(() => ({ patientUuid, patient }), [patientUuid, patient]);
  const [medicationPageSize, setMedicationPageSize] = useState(defaultPageSize);
  const [fluidPageSize, setFluidPageSize] = useState(defaultPageSize);

  const getOrderUrl = (status: string, representation: string) =>
    `/ws/rest/v1/order?patient=${patientUuid}&careSetting=${inpatientCareSettingUuid}&status=${status}&orderType=${inpatientDrugOrderTypeUuid}&v=${representation}`;

  const ordersApiUrl = getOrderUrl('any', drugOrderRepresentation);
  const minimalOrderRepresentation = 'custom:(uuid)';

  const {
    data: medicationOrderData,
    error: medicationOrdersError,
    isLoading: medicationOrdersLoading,
    totalCount: medicationTotalCount,
    currentPage: medicationPage,
    currentPageSize: medicationCurrentPageSize,
    goTo: goToMedicationPage,
  } = useOpenmrsPagination<Order>(ordersApiUrl, medicationPageSize, {
    swrConfig: {
      keepPreviousData: true,
      revalidateOnFocus: true,
    },
  });

  const {
    data: fluidOrderData,
    error: fluidOrdersError,
    isLoading: fluidOrdersLoading,
    totalCount: fluidTotalCount,
    currentPage: fluidPage,
    currentPageSize: fluidCurrentPageSize,
    goTo: goToFluidPage,
  } = useOpenmrsPagination<Order>(ordersApiUrl, fluidPageSize, {
    swrConfig: {
      keepPreviousData: true,
      revalidateOnFocus: true,
    },
  });

  const { totalCount: activeOrdersCount = 0 } = useOpenmrsPagination<Order>(
    getOrderUrl('ACTIVE', minimalOrderRepresentation),
    1,
    {
      swrConfig: {
        keepPreviousData: true,
        revalidateOnFocus: true,
      },
    },
  );

  const { totalCount: allOrdersCount = 0 } = useOpenmrsPagination<Order>(
    getOrderUrl('any', minimalOrderRepresentation),
    1,
    {
      swrConfig: {
        keepPreviousData: true,
        revalidateOnFocus: true,
      },
    },
  );

  const medicationOrders = useMemo(() => {
    const orders = medicationOrderData ?? [];

    return [...orders].sort((left, right) => {
      const leftTime = left.dateActivated ? new Date(left.dateActivated).getTime() : 0;
      const rightTime = right.dateActivated ? new Date(right.dateActivated).getTime() : 0;
      return rightTime - leftTime;
    });
  }, [medicationOrderData]);

  const fluidOrders = useMemo(() => {
    const orders = fluidOrderData ?? [];

    return [...orders].sort((left, right) => {
      const leftTime = left.dateActivated ? new Date(left.dateActivated).getTime() : 0;
      const rightTime = right.dateActivated ? new Date(right.dateActivated).getTime() : 0;
      return rightTime - leftTime;
    });
  }, [fluidOrderData]);

  const pastOrdersCount = Math.max(allOrdersCount - activeOrdersCount, 0);

  const { pageSizes: medicationPageSizes } = usePaginationInfo(
    medicationCurrentPageSize.current,
    medicationTotalCount || 0,
    medicationPage || 1,
    medicationOrders.length,
  );

  const { pageSizes: fluidPageSizes } = usePaginationInfo(
    fluidCurrentPageSize.current,
    fluidTotalCount || 0,
    fluidPage || 1,
    fluidOrders.length,
  );

  const medicationRows = useMemo<MedicationRow[]>(
    () =>
      medicationOrders.map((order) => ({
        id: order.uuid,
        date: formatOrderDate(order.dateActivated),
        drug: getDrugDisplay(order),
        dose: getDoseText(order),
        route: order.route?.display || '--',
        name: order.orderer?.person?.display || order.orderer?.display || '--',
        time: formatTime(order.dateActivated),
      })),
    [medicationOrders],
  );

  const fluidRows = useMemo<FluidRow[]>(
    () =>
      fluidOrders.map((order) => ({
        id: `${order.uuid}-fluid`,
        date: formatOrderDate(order.dateActivated),
        instructions: formatAdministrationInstructionsWithTranslation(order),
        name: order.orderer?.person?.display || order.orderer?.display || '--',
        reviewDate: formatOrderDate(order.dateStopped || order.dateActivated),
      })),
    [fluidOrders, formatAdministrationInstructionsWithTranslation],
  );

  const isLoading = medicationOrdersLoading || fluidOrdersLoading;
  const error = medicationOrdersError || fluidOrdersError;
  const hasNoOrders = (medicationTotalCount || 0) === 0 && (fluidTotalCount || 0) === 0;

  const renderInpatientDetail = () => {
    if (isLoading) {
      return <DataTableSkeleton rowCount={5} columnCount={6} zebra />;
    }

    if (error) {
      return <ErrorState headerTitle={t('failedToLoadDrugOrders', 'Failed to load drug orders')} error={error} />;
    }

    if (hasNoOrders) {
      return (
        <EmptyState
          displayText={t('orders', 'Orders')}
          headerTitle={t('noMedicationOrdersFound', 'No medication orders found')}
          launchForm={() => undefined}
        />
      );
    }

    return (
      <div style={{ overflowY: 'auto' }}>
        <p>
          {t('activeMedicationsCount', 'Active Medications')}: {activeOrdersCount} |{' '}
          {t('pastMedicationsCount', 'Past Medications')}: {pastOrdersCount}
        </p>

        <TableContainer title={t('nursingTreatmentSheet', 'Nursing Treatment Sheet')}>
          <Table size="sm" useZebraStyles>
            <TableHead>
              <TableRow>
                <TableHeader>{t('date', 'Date')}</TableHeader>
                <TableHeader>{t('drug', 'Drug')}</TableHeader>
                <TableHeader>{t('dose', 'Dose')}</TableHeader>
                <TableHeader>{t('route', 'Route')}</TableHeader>
                <TableHeader>{t('name', 'Name')}</TableHeader>
                <TableHeader>{t('time', 'Time')}</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {medicationRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>{t('noMedicationOrdersFound', 'No medication orders found')}</TableCell>
                </TableRow>
              ) : (
                medicationRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.drug}</TableCell>
                    <TableCell>{row.dose}</TableCell>
                    <TableCell>{row.route}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.time}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Pagination
          page={medicationPage}
          pageSize={medicationCurrentPageSize.current}
          pageSizes={medicationPageSizes}
          totalItems={medicationTotalCount || 0}
          onChange={({ page, pageSize }) => {
            goToMedicationPage(page);
            setMedicationPageSize(pageSize as number);
          }}
        />

        <div style={{ marginTop: '1rem' }}>
          <TableContainer title={t('fluidsAndParenteralNutritionSection', 'Fluids and Parenteral Nutrition Section')}>
            <Table size="sm" useZebraStyles>
              <TableHead>
                <TableRow>
                  <TableHeader>{t('date', 'Date')}</TableHeader>
                  <TableHeader>
                    {t(
                      'itemAdministrationInstructions',
                      'Item & Administration Instructions (Volume, Frequency, Rate, Duration)',
                    )}
                  </TableHeader>
                  <TableHeader>{t('name', 'Name')}</TableHeader>
                  <TableHeader>{t('date', 'Date')}</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {fluidRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>{t('noMedicationOrdersFound', 'No medication orders found')}</TableCell>
                  </TableRow>
                ) : (
                  fluidRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.date}</TableCell>
                      <TableCell>{row.instructions}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.reviewDate}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </div>

        <Pagination
          page={fluidPage}
          pageSize={fluidCurrentPageSize.current}
          pageSizes={fluidPageSizes}
          totalItems={fluidTotalCount || 0}
          onChange={({ page, pageSize }) => {
            goToFluidPage(page);
            setFluidPageSize(pageSize as number);
          }}
        />
      </div>
    );
  };

  return (
    <Layer>
      <Tabs>
        <TabList contained aria-label="admissions-tabs">
          <Tab>{t('admissionRequest', 'Admission request')}</Tab>
          <Tab>{t('inpatientDetail', 'Inpatient Detail')}</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <ExtensionSlot name="ewf-admissions-dashboard-slot" state={state} />
          </TabPanel>
          <TabPanel>{renderInpatientDetail()}</TabPanel>
        </TabPanels>
      </Tabs>
    </Layer>
  );
};

export default AdmissionsDashboard;
