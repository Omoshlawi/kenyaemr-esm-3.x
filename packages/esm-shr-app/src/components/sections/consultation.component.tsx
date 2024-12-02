import React from 'react';
import { Visit } from '../../hooks/useSHRSummary';
import { Tile } from '@carbon/react';
import styles from './sections.scss';

type ConsultationSectionProps = {
  visit: Visit;
};

const ConsultationSection: React.FC<ConsultationSectionProps> = ({ visit }) => {
  return <Tile className={styles.sectionContent}>ConsultationSection</Tile>;
};

export default ConsultationSection;
