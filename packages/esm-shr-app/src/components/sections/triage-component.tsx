import React from 'react';
import { extractVitals, Visit } from '../../hooks/useSHRSummary';
import { Tile } from '@carbon/react';
import styles from './sections.scss';
export type TriageSectionProps = {
  visit: Visit;
};

const TriageSection: React.FC<TriageSectionProps> = ({ visit }) => {
  const triage = extractVitals([visit]);
  return (
    <Tile className={styles.sectionContent}>
      <pre>{JSON.stringify(triage, null, 2)}</pre>
    </Tile>
  );
};

export default TriageSection;
