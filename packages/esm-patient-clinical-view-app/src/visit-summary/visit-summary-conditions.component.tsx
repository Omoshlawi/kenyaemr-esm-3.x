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
import { formatDate, parseDate } from '@openmrs/esm-framework';
import type { VisitSummary } from './visit-summary.resource';
import styles from './visit-summary.scss';

type ConditionsProps = {
  conditions: VisitSummary['conditions'];
};

const VisitSummaryConditions: React.FC<ConditionsProps> = ({ conditions }) => {
  const { t } = useTranslation();

  if (!conditions?.length) {
    return null;
  }

  const headers = [
    { key: 'name', header: t('condition', 'Condition') },
    { key: 'onsetDate', header: t('dateNoted', 'Date Noted') },
    { key: 'status', header: t('status', 'Status') },
  ];

  const rows = conditions.map((c, i) => ({
    id: String(i),
    name: c.name,
    onsetDate: c.onsetDate ? formatDate(parseDate(c.onsetDate)) : '—',
    status: (
      <Tag type={c.status === 'ACTIVE' ? 'green' : 'gray'} size="sm">
        {c.status === 'ACTIVE' ? t('active', 'Active') : t('inactive', 'Inactive')}
      </Tag>
    ),
  }));

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>{t('conditions', 'Conditions')}</h2>
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

export default VisitSummaryConditions;
