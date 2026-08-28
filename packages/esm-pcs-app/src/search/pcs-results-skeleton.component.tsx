import React from 'react';
import { SkeletonText } from '@carbon/react';
import styles from '../pcs.scss';

interface PcsResultsSkeletonProps {
  /** How many placeholder tiles to show. */
  count?: number;
}

const PcsResultsSkeleton: React.FC<PcsResultsSkeletonProps> = ({ count = 3 }) => (
  <div className={styles.pcsLoading}>
    {Array.from({ length: count }).map((_, index) => (
      <div className={styles.pcsSkeletonTile} key={`pcs-skeleton-${index}`}>
        <SkeletonText heading width="60%" />
        <SkeletonText paragraph lineCount={3} />
      </div>
    ))}
  </div>
);

export default PcsResultsSkeleton;
