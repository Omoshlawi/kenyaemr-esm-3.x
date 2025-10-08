import React from 'react';
import styles from './card.scss';

type CardProps = {
  title: string;
  value: string;
  subMetrics?: Array<{ subtitle: string; subValue: string }>;
};

const Card: React.FC<CardProps> = ({ title, value, subMetrics = [] }) => {
  return (
    <div className={styles.card}>
      <div className={styles.title}>{title}</div>
      <div className={styles.valuesContainer}>
        <div className={styles.value}>{value}</div>
        <div className={styles.subMetricscontainer}>
          {subMetrics?.map(({ subtitle, subValue }, i) => (
            <div className={styles.subMetrics} key={i}>
              <span className={styles.subtitle}>{subtitle}</span>
              <span className={styles.subvalue}>{subValue}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Card;
