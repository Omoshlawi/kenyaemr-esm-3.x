import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Pagination } from '@carbon/react';
import { Add, ChartColumn, Table as TableIcon } from '@carbon/react/icons';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import { usePaginationInfo } from '@openmrs/esm-patient-common-lib';
import InteroperativeRecordDrugGivenGraph, {
  InteroperativeRecordDrugGivenData,
} from './interoperative-record-drug-given-graph.component';
import type { InteroperativeRecordDrugGivenWorkspaceProps } from '../forms/interoperative-record-drug-given-form.component';
import styles from '../anaesthetic.scss';

interface InteroperativeRecordDrugGivenGraphWrapperProps {
  data: InteroperativeRecordDrugGivenData[];
  tableData?: Array<{
    date: string;
    maintenanceAgent?: string;
    concentrationRate?: string;
    medicationGiven?: string;
    fluidsGiven?: string;
    source?: string;
  }>;
  viewMode?: 'graph' | 'table';
  currentPage?: number;
  pageSize?: number;
  totalItems?: number;
  controlSize?: 'sm' | 'md' | 'lg';
  onAddData?: () => void;
  onViewModeChange?: (mode: 'graph' | 'table') => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  isAddButtonDisabled?: boolean;
  patient?: {
    uuid: string;
    name: string;
    gender: string;
    age: string;
  };
  onInteroperativeRecordDrugGivenSubmit?: (data: {
    maintenanceAgent: string;
    concentrationRate: string;
    medicationGiven: string;
    fluidsGiven: string;
  }) => Promise<void> | void;
  onDataSaved?: () => void;
}

const InteroperativeRecordDrugGivenGraphWrapper: React.FC<InteroperativeRecordDrugGivenGraphWrapperProps> = ({
  data = [],
  tableData = [],
  viewMode = 'graph',
  currentPage = 1,
  pageSize = 5,
  totalItems = 0,
  controlSize = 'sm',
  onAddData,
  onViewModeChange,
  onPageChange,
  onPageSizeChange,
  isAddButtonDisabled = false,
  patient,
  onInteroperativeRecordDrugGivenSubmit,
  onDataSaved,
}) => {
  const { t } = useTranslation();
  const [internalPage, setInternalPage] = useState(currentPage);
  const [internalPageSize, setInternalPageSize] = useState(pageSize);

  React.useEffect(() => {
    setInternalPage(currentPage);
  }, [currentPage]);

  React.useEffect(() => {
    setInternalPageSize(pageSize);
  }, [pageSize]);

  const { pageSizes: calculatedPageSizes, itemsDisplayed } = usePaginationInfo(
    internalPageSize,
    Math.ceil((totalItems || 0) / internalPageSize),
    internalPage,
    totalItems || 0,
  );

  const paginatedTableData = tableData.slice((internalPage - 1) * internalPageSize, internalPage * internalPageSize);

  const handleAddData = () => {
    onAddData?.();
    launchWorkspace2<InteroperativeRecordDrugGivenWorkspaceProps, {}, {}>('interoperative-drug-given-workspace-form', {
      onSubmit: async (formData) => {
        await onInteroperativeRecordDrugGivenSubmit?.(formData);
      },
      patient,
      onDataSaved,
    });
  };

  return (
    <div className={styles.fetalHeartRateSection}>
      <div className={styles.fetalHeartRateContainer}>
        <div className={styles.fetalHeartRateHeader}>
          <div className={styles.fetalHeartRateTitle}>
            <h3 className={styles.fetalHeartRateHeading}>
              {t('interoperativeRecordDrugGiven', 'Interoperative record')}
            </h3>
          </div>
          <div className={styles.fetalHeartRateControls}>
            <div className={styles.viewToggle}>
              <Button
                kind={viewMode === 'graph' ? 'primary' : 'secondary'}
                size={controlSize}
                hasIconOnly
                iconDescription={t('graphView', 'Graph View')}
                onClick={() => onViewModeChange?.('graph')}
                className={styles.viewButton}>
                <ChartColumn />
              </Button>
              <Button
                kind={viewMode === 'table' ? 'primary' : 'secondary'}
                size={controlSize}
                hasIconOnly
                iconDescription={t('tableView', 'Table View')}
                onClick={() => onViewModeChange?.('table')}
                className={styles.viewButton}>
                <TableIcon />
              </Button>
            </div>
            <Button
              kind="primary"
              size={controlSize}
              renderIcon={Add}
              iconDescription="Add interoperative record data"
              disabled={isAddButtonDisabled}
              onClick={handleAddData}
              className={styles.addButton}>
              Add
            </Button>
          </div>
        </div>

        {viewMode === 'graph' ? (
          <InteroperativeRecordDrugGivenGraph data={data} />
        ) : (
          <div className={styles.tableContainer}>
            {tableData && tableData.length > 0 ? (
              <>
                <div className={styles.drugsIVFluidsTable}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>{t('date', 'Date')}</th>
                        <th>{t('maintenanceOfAnaesthesia', 'Maintenance of Anaesthesia')}</th>
                        <th>{t('concentrationRate', 'Concentration rate')}</th>
                        <th>{t('medicationsGiven', 'Medications given')}</th>
                        <th>{t('fluidsGiven', 'Fluids given')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTableData.map((item, index) => (
                        <tr key={index}>
                          <td>{item.date}</td>
                          <td>{item.maintenanceAgent || '-'}</td>
                          <td>{item.concentrationRate || '-'}</td>
                          <td>{item.medicationGiven || '-'}</td>
                          <td>{item.fluidsGiven || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={internalPage}
                  pageSize={internalPageSize}
                  pageSizes={calculatedPageSizes}
                  totalItems={totalItems || tableData.length}
                  onChange={({ page, pageSize }) => {
                    setInternalPage(page);
                    setInternalPageSize(pageSize);
                    onPageChange?.(page);
                    onPageSizeChange?.(pageSize);
                  }}
                  className={styles.pagination}
                />
                {(totalItems || tableData.length) > 0 && <div className={styles.paginationInfo}>{itemsDisplayed}</div>}
              </>
            ) : (
              <div className={styles.emptyTable}>
                <p>{t('noInteroperativeRecordDrugGivenData', 'No interoperative record data available')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InteroperativeRecordDrugGivenGraphWrapper;
