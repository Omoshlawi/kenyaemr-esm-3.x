import React from 'react';
import { Tag } from '@carbon/react';
import styles from '../facility-info.scss';

export const StatusTag: React.FC<{ value?: string }> = ({ value }) => {
  if (!value || value === '--' || value.trim() === '') {
    return <span className={styles.emptyValue}>—</span>;
  }
  const upper = value.toUpperCase();
  const type =
    upper === 'ACTIVE' || upper === 'LICENSED'
      ? 'green'
      : upper === 'INACTIVE' || upper === 'SUSPENDED'
      ? 'red'
      : 'gray';
  const label = `${value.charAt(0).toUpperCase()}${value.slice(1).toLowerCase()}`;
  return (
    <Tag type={type} size="sm">
      {label}
    </Tag>
  );
};
