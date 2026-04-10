import React from 'react';
import styles from '../facility-info.scss';

export const InfoRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className={styles.infoRow}>
    <span className={styles.infoLabel}>{label}</span>
    <span className={styles.infoValue}>{value ?? <span className={styles.emptyValue}>—</span>}</span>
  </div>
);
