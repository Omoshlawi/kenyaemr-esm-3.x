import { OverflowMenu, OverflowMenuItem, Tag, Tile } from '@carbon/react';
import { formatDate, parseDate } from '@openmrs/esm-framework';
import React from 'react';
import { Visit } from '../../hooks/useSHRSummary';
import styles from './headers.scss';

type VisitHeaderProps = {
  visit: Visit;
};

const VisitHeader: React.FC<VisitHeaderProps> = ({ visit }) => {
  return (
    <Tile className={styles.visitHeaderTile}>
      <div>
        <Tag>{visit.facility.Display}</Tag>
        <span>{formatDate(parseDate(visit.startDate), { day: true, time: true })}</span>
        <br />
        <p>
          <span>{visit.visit_type}</span>
          <span>&bull;</span>
          <span>Walk in</span>
          <span>&bull;</span>
          <span>Started 48 minutes ago</span>
        </p>
      </div>
      <OverflowMenu flipped={document?.dir === 'rtl'} aria-label="overflow-menu">
        <OverflowMenuItem itemText="Stop app" />
        <OverflowMenuItem itemText="Restart app" />
        <OverflowMenuItem itemText="Rename app" />
        <OverflowMenuItem itemText="Clone and move app" disabled requireTitle />
        <OverflowMenuItem itemText="Edit routes and access" requireTitle />
        <OverflowMenuItem hasDivider isDelete itemText="Delete app" />
      </OverflowMenu>
    </Tile>
  );
};

export default VisitHeader;
