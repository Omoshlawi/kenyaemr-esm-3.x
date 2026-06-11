import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from '@carbon/react';
import type { VisitSummary } from './visit-summary.resource';
import styles from './visit-summary.scss';

type MedicationsProps = {
  medications: VisitSummary['medications'];
};

const VisitSummaryMedications: React.FC<MedicationsProps> = ({ medications }) => {
  const { t } = useTranslation();

  if (!medications?.length) {
    return null;
  }

  const headers = [
    { key: 'drug', header: t('drug', 'Drug') },
    { key: 'dosage', header: t('dosageFrequencyRouteInstructions', 'Dose / Freq / Route') },
    { key: 'status', header: t('status', 'Status') },
  ];

  const rows = medications.map((med, i) => {
    const isActive = !med.autoExpireDate || new Date(med.autoExpireDate) >= new Date();
    const dosageParts = [med.dose, med.frequency, med.route, med.duration].filter(Boolean).join(' · ');
    return {
      id: String(i),
      drug: med.drug ?? '—',
      dosage: dosageParts || '—',
      status: (
        <Tag type={isActive ? 'green' : 'gray'} size="sm">
          {isActive ? t('active', 'Active') : t('stopped', 'Stopped')}
        </Tag>
      ),
    };
  });

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>{t('pharmacyOrders', 'PHARMACY ORDERS')}</h2>
      </div>
      <div className={styles.tableContainer}>
        <DataTable rows={rows} headers={headers} size="sm" useZebraStyles>
          {({ rows: tableRows, headers: tableHeaders, getTableProps, getHeaderProps, getRowProps, getCellProps }) => (
            <TableContainer>
              <Table {...getTableProps()} className={styles.table}>
                <TableHead>
                  <TableRow>
                    {tableHeaders.map((h) => (
                      <TableHeader {...getHeaderProps({ header: h })} key={h.key}>
                        {h.header}
                      </TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tableRows.map((row) => (
                    <TableRow {...getRowProps({ row })} key={row.id}>
                      {row.cells.map((cell) => (
                        <TableCell {...getCellProps({ cell })} key={cell.id}>
                          {cell.value}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataTable>
      </div>
    </div>
  );
};

export default VisitSummaryMedications;
