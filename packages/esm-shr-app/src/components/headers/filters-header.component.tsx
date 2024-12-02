import React from 'react';
import { Layer, Tile } from '@carbon/react';
import styles from './headers.scss';
const FilterHeader = () => {
  return (
    <Layer className={styles.filterHeader}>
      <Tile>Filter by encounter type</Tile>
      <Tile>Filter by date</Tile>
    </Layer>
  );
};

export default FilterHeader;
