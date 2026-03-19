import React from 'react';
import { Tile } from '@carbon/react';
import styles from '../facility-info.scss';

export const SectionCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Tile className={styles.sectionCard}>
    <p className={styles.sectionTitle}>{title}</p>
    <div className={styles.sectionBody}>{children}</div>
  </Tile>
);
