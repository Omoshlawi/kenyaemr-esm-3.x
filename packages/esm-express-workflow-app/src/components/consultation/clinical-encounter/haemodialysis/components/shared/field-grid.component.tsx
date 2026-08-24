import React from 'react';
import {
  Activity,
  Chemistry,
  Favorite,
  Hospital,
  Identification,
  Medication,
  Temperature,
  Time,
  User,
  View,
  Search,
} from '@carbon/react/icons';
import styles from './shared.scss';

export type FieldItem = {
  label: string;
  value: string;
  span?: 1 | 2;
};

type FieldGridProps = {
  fields: FieldItem[];
};

const iconForLabel = (label: string) => {
  const key = label.toLowerCase();
  if (key.includes('blood group') || key.includes('blood pressure') || key.includes('bp')) {
    return Favorite;
  }
  if (key.includes('pulse') || key.includes('heart')) {
    return Favorite;
  }
  if (key.includes('temp')) {
    return Temperature;
  }
  if (key.includes('weight') || key.includes('height') || key.includes('bmi') || key.includes('mass')) {
    return Activity;
  }
  if (key.includes('heparin') || key.includes('medication') || key.includes('drug') || key.includes('dose')) {
    return Medication;
  }
  if (key.includes('duration') || key.includes('date') || key.includes('time') || key.includes('frequency')) {
    return Time;
  }
  if (key.includes('doctor') || key.includes('nurse') || key.includes('nephrologist')) {
    return User;
  }
  if (key.includes('hospital') || key.includes('clinic') || key.includes('access')) {
    return Hospital;
  }
  if (
    key.includes('kt/v') ||
    key.includes('conductivity') ||
    key.includes('composition') ||
    key.includes('dialysate')
  ) {
    return Chemistry;
  }
  if (key.includes('machine') || key.includes('detector') || key.includes('leak')) {
    return Search;
  }
  if (key.includes('condition') || key.includes('complication') || key.includes('remark')) {
    return View;
  }
  return Identification;
};

const FieldGrid: React.FC<FieldGridProps> = ({ fields }) => (
  <div className={styles.fieldGrid}>
    {fields.map((field, index) => {
      const Icon = iconForLabel(field.label);
      return (
        <div key={`${field.label}-${index}`} className={`${styles.fieldCell} ${field.span === 2 ? styles.span2 : ''}`}>
          <span className={styles.fieldIcon} aria-hidden="true">
            <Icon size={16} />
          </span>
          <div className={styles.fieldCopy}>
            {field.label ? <span className={styles.fieldLabel}>{field.label}</span> : null}
            <span className={styles.fieldValue}>{field.value || '\u00A0'}</span>
          </div>
        </div>
      );
    })}
  </div>
);

export default FieldGrid;
