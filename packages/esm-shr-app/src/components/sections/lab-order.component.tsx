import React from 'react';
import { extractLabResults, Visit } from '../../hooks/useSHRSummary';
import { Tile } from '@carbon/react';
import styles from './sections.scss';
type LabOrdersectionProps = {
  visit: Visit;
};
const LabOrdersection: React.FC<LabOrdersectionProps> = ({ visit }) => {
  const labOrder = extractLabResults([visit]);
  return (
    <Tile className={styles.sectionContent}>
      <pre>{JSON.stringify(labOrder, null, 2)}</pre>
    </Tile>
  );
};

export default LabOrdersection;
