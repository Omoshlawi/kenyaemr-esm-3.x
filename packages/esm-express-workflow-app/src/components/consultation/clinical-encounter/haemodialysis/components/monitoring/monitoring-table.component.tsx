import React from 'react';
import { useTranslation } from 'react-i18next';
import type { MonitoringDisplayRow } from '../../utils/monitoring-slots';
import styles from './monitoring-table.scss';

type Props = {
  rows: MonitoringDisplayRow[];
};

const MonitoringTable: React.FC<Props> = ({ rows }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Time</th>
            <th>BP (mmHg)</th>
            <th>Pulse (bpm)</th>
            <th>Temp (°C)</th>
            <th>UF Removed (mL)</th>
            <th>Heparin (Units)</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className={styles.empty}>
                No monitoring observations yet.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr
                key={row.uuid ?? `${row.slotMinute}-${index}`}
                className={`${row.skipped ? styles.skippedRow : ''} ${row.isActive ? styles.activeRow : ''}`.trim()}>
                <td>
                  <div className={styles.timeCell}>
                    <span>{row.time}</span>
                    {row.readingCount && row.readingCount > 1 ? (
                      <span className={styles.readingCountBadge}>
                        {t('haemodialysisSlotReadingCount', '{{count}} recorded', { count: row.readingCount })}
                      </span>
                    ) : null}
                    {row.skipped ? <span className={styles.skippedBadge}>Skipped</span> : null}
                  </div>
                </td>
                <td>{row.bp}</td>
                <td>{row.pulse}</td>
                <td>{row.temp}</td>
                <td>{row.ufRemoved}</td>
                <td>{row.heparin}</td>
                <td>{row.remarks}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default MonitoringTable;
