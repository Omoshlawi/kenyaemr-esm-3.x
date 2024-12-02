import React from 'react';
import { Visit } from '../../hooks/useSHRSummary';
import { Tile } from '@carbon/react';
import styles from './sections.scss';

type PrescriptionSectionProps = { visit: Visit };

const PrescriptionSection: React.FC<PrescriptionSectionProps> = () => {
  return <Tile className={styles.sectionContent}>PrescriptionSection</Tile>;
};

export default PrescriptionSection;
