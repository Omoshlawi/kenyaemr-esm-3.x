import React from 'react';
import type { PatientBiodata } from '../../types';
import { displayValue, formatSessionDateTime } from '../../utils/formatters';
import styles from './patient-biodata.scss';

type Props = {
  biodata: PatientBiodata;
};

const PatientBiodataView: React.FC<Props> = ({ biodata }) => (
  <section className={styles.grid}>
    <div>
      <div className={styles.columnTitle}>Patient Details</div>
      <div className={styles.row}>
        <span className={styles.label}>Patient Name:</span>
        <span className={styles.value}>{displayValue(biodata.name)}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>SHA No:</span>
        <span className={styles.value}>{displayValue(biodata.shaNo)}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Age:</span>
        <span className={styles.value}>{displayValue(biodata.age)}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Contact:</span>
        <span className={styles.value}>{displayValue(biodata.contact)}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Diagnosis:</span>
        <span className={styles.value}>{displayValue(biodata.diagnosis)}</span>
      </div>
    </div>
    <div>
      <div className={styles.columnTitle}>Encounter Details</div>
      <div className={styles.row}>
        <span className={styles.label}>OP No:</span>
        <span className={styles.value}>{displayValue(biodata.opNo)}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Date:</span>
        <span className={styles.value}>{formatSessionDateTime(biodata.date)}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Sex:</span>
        <span className={styles.value}>{displayValue(biodata.sex)}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Clinic:</span>
        <span className={styles.value}>{displayValue(biodata.clinic)}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Address:</span>
        <span className={styles.value}>{displayValue(biodata.address)}</span>
      </div>
    </div>
  </section>
);

export default PatientBiodataView;
