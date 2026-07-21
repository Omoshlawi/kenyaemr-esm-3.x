import React from 'react';
import styles from '../pre-auth-form.scss';

export const ClaimBanner: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className={styles.claimBanner}>{children}</div>
);

export const BannerItem: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className={styles.bannerItem}>
    <span className={styles.bannerLabel}>{label}</span>
    <span className={styles.bannerValue}>{children}</span>
  </div>
);
