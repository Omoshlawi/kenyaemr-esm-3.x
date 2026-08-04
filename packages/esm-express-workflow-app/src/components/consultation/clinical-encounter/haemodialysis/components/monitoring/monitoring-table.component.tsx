import React from 'react';
import type { MonitoringDisplayRow } from '../../utils/monitoring-slots';
import styles from './monitoring-table.scss';

type Props = {
  rows: MonitoringDisplayRow[];
};

const MonitoringTable: React.FC<Props> = ({ rows }) => (
  <table className={styles.table}>
    <thead>
      <tr>
        <th>Time</th>
        <th>BP</th>
        <th>Pulse</th>
        <th>Temp</th>
        <th>UF Removed</th>
        <th>Heparin</th>
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
          <tr key={row.uuid ?? `${row.slotMinute}-${index}`} className={row.skipped ? styles.skippedRow : undefined}>
            <td>
              {row.time}
              {row.skipped ? <span className={styles.skippedBadge}>Skipped</span> : null}
              {row.scheduled ? <span className={styles.scheduledBadge}>Scheduled</span> : null}
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
);

export default MonitoringTable;
