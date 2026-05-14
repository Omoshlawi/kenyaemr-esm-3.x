import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@carbon/react';
import { Add, ChartColumn, Table as TableIcon } from '@carbon/react/icons';
import { launchWorkspace2 } from '@openmrs/esm-framework';
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
  controlSize = 'sm',
  onAddData,
  onViewModeChange,
  isAddButtonDisabled = false,
  patient,
  onInteroperativeRecordDrugGivenSubmit,
  onDataSaved,
}) => {
  const { t } = useTranslation();

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
                    {tableData.map((item, index) => (
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
