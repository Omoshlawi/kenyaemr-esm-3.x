import React from 'react';
import styles from './shared.scss';

export type FieldItem = {
  label: string;
  value: string;
  span?: 1 | 2;
};

type FieldGridProps = {
  fields: FieldItem[];
};

const FieldGrid: React.FC<FieldGridProps> = ({ fields }) => (
  <div className={styles.fieldGrid}>
    {fields.map((field, index) => (
      <div key={`${field.label}-${index}`} className={`${styles.fieldCell} ${field.span === 2 ? styles.span2 : ''}`}>
        {field.label ? <span className={styles.fieldLabel}>{field.label}</span> : null}
        <span className={styles.fieldValue}>{field.value || '\u00A0'}</span>
      </div>
    ))}
  </div>
);

export default FieldGrid;
