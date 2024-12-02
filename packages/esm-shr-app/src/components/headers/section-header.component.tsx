import { Tag, Tile } from '@carbon/react';
import { CarbonIconType } from '@carbon/react/icons';
import React from 'react';
import styles from './headers.scss';

type SectionHeaderProps = {
  title: string;
  reporter: string;
  icon: CarbonIconType;
  type?: string;
  time: string;
};

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, title, type = 'red', time, reporter }) => {
  return (
    <Tile className={styles.sectionHeader}>
      <div>
        <Tag renderIcon={icon} size="lg" type={type}>
          {title}
        </Tag>
        <span className={styles.mutateText}>{reporter}</span>
      </div>
      <span className={styles.mutateText}>{time}</span>
    </Tile>
  );
};

export default SectionHeader;
