import React from 'react';
import type { FacilityHeader } from '../../types';
import styles from './facility-header.scss';

type Props = {
  facility: FacilityHeader;
};

const FacilityHeaderView: React.FC<Props> = ({ facility }) => (
  <header className={styles.header}>
    <h1 className={styles.title}>Renal Unit Haemodialysis Notes</h1>
    {facility.hospitalName ? <p className={styles.hospitalName}>{facility.hospitalName}</p> : null}
  </header>
);

export default FacilityHeaderView;
