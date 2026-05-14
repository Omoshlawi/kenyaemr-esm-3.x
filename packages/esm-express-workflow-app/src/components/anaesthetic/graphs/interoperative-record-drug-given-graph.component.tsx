import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../anaesthetic.scss';

export interface InteroperativeRecordDrugGivenData {
  maintenanceAgent?: string;
  concentrationRate?: string;
  medicationGiven?: string;
  fluidsGiven?: string;
  index?: number;
}

interface InteroperativeRecordDrugGivenGraphProps {
  data: InteroperativeRecordDrugGivenData[];
}

const InteroperativeRecordDrugGivenGraph: React.FC<InteroperativeRecordDrugGivenGraphProps> = ({ data }) => {
  const { t } = useTranslation();
  const getColumns = () => {
    const emptyColumns = Array.from({ length: 20 }, (_, i) => `grid-${i + 1}`);

    if (data.length === 0) {
      return emptyColumns;
    }
    if (data.length <= 20) {
      const dataColumns = data.map((_, index) => `data-${index}`);
      const remainingEmpty = Array.from({ length: 20 - data.length }, (_, i) => `empty-${i + 1}`);
      return [...dataColumns, ...remainingEmpty];
    }
    return data.map((_, index) => `data-${index}`);
  };

  const columns = getColumns();
  const rows = [
    { id: 'maintenanceAgent', label: t('maintenanceOfAnaesthesia', 'Maintenance of Anaesthesia') },
    { id: 'concentrationRate', label: t('concentrationRate', 'Concentration rate') },
    { id: 'medicationGiven', label: t('medicationsGiven', 'Medications given') },
    { id: 'fluidsGiven', label: t('fluidsGiven', 'Fluids given') },
  ];

  const getDataForColumn = (column: string): InteroperativeRecordDrugGivenData | undefined => {
    if (column.startsWith('grid-') || column.startsWith('empty-')) {
      return undefined;
    }
    const index = parseInt(column.replace('data-', ''), 10);
    return data[index];
  };

  const getCellContent = (column: string, rowId: string) => {
    const dataItem = getDataForColumn(column);

    if (!dataItem) {
      return '';
    }

    if (rowId === 'maintenanceAgent') {
      return dataItem.maintenanceAgent || '';
    } else if (rowId === 'concentrationRate') {
      return dataItem.concentrationRate || '';
    } else if (rowId === 'medicationGiven') {
      return dataItem.medicationGiven || '';
    } else if (rowId === 'fluidsGiven') {
      return dataItem.fluidsGiven || '';
    }

    return '';
  };

  return (
    <div className={styles.drugsIVFluidsGraph}>
      <div className={styles.membraneGrid}>
        <div className={styles.gridContainer}>
          {rows.map((row) => (
            <div key={row.id} className={styles.gridRow}>
              <div className={styles.gridRowLabel}>{row.label}</div>
              {columns.map((column) => (
                <div
                  key={`${row.id}-${column}`}
                  className={`${styles.gridCell} ${styles.drugsCell}`}
                  data-column={column}
                  data-row={row.id}>
                  {getCellContent(column, row.id)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InteroperativeRecordDrugGivenGraph;
