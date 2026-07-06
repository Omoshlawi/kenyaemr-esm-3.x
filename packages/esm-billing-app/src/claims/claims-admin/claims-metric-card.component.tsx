import React from 'react';
import { Tile } from '@carbon/react';
import styles from './claims-admin-dashboard.scss';

interface ClaimsMetricCardProps {
  label: string;
  count: number;
  amount?: string;
  icon: React.ReactNode;
  colorClass?: string;
}

const ClaimsMetricCard: React.FC<ClaimsMetricCardProps> = ({ label, count, amount, icon, colorClass }) => (
  <Tile className={`${styles.metricCard} ${colorClass ?? ''}`}>
    <div className={styles.metricIcon}>{icon}</div>
    <p className={styles.metricCount}>{count.toLocaleString()}</p>
    <p className={styles.metricLabel}>{label}</p>
    {amount && <p className={styles.metricAmount}>{amount}</p>}
  </Tile>
);

export default ClaimsMetricCard;
