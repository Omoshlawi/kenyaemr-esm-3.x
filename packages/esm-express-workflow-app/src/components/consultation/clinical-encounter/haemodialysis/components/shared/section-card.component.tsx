import React from 'react';
import styles from './shared.scss';

type SectionCardProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
};

const SectionCard: React.FC<SectionCardProps> = ({ title, subtitle, children, actions }) => (
  <section className={styles.section}>
    <div className={styles.sectionHeader}>
      <div>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {subtitle ? <p className={styles.sectionSubtitle}>{subtitle}</p> : null}
      </div>
      {actions ? <div className={styles.sectionActions}>{actions}</div> : null}
    </div>
    {children}
  </section>
);

export default SectionCard;
