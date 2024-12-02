import { Button, Layer } from '@carbon/react';
import { ChevronRight, TextNewLine } from '@carbon/react/icons';
import { formatDate } from '@openmrs/esm-framework';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSHRSummary } from '../../hooks/useSHRSummary';
import { ExpansionPannel } from '../expansion-panel';
import styles from './navigation.scss';
import FilterHeader from '../headers/filters-header.component';

type VisitsNavigationProps = {
  patientUuid: string;
};

const VisitsNavigation: React.FC<VisitsNavigationProps> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const { data, isLoading, isError, visitDates } = useSHRSummary(patientUuid);
  const [currentVisitIndex, setCurrentVisitIndex] = useState(0);

  if (isLoading) {
    return <p>loading...</p>;
  }
  if (!data.visits.length) {
    return <p>empty...</p>;
  }

  return (
    <Layer className={styles.container}>
      <Layer className={styles.navContainer}>
        <p>{t('jumpToVisit', 'Jump to visit')}</p>
        <br />
        <ul className={styles.navLink}>
          {visitDates.map((date, index) => (
            <Button
              className={`${styles.navLinkItem} ${index === currentVisitIndex ? styles.activeNavLinkItem : ''}`}
              onClick={() => setCurrentVisitIndex(index)}
              kind="ghost"
              size="sm"
              key={index}>
              <TextNewLine />
              <span>{formatDate(date)}</span>
            </Button>
          ))}
        </ul>
        <br />
        <hr />
        <Button className={styles.navLinkItem} kind="ghost" size="sm">
          <span>{t('nextVisit', 'Next Visit')}</span>
          <ChevronRight />
        </Button>
        <br />
      </Layer>
      <Layer className={styles.navContent}>
        <FilterHeader />
        <ExpansionPannel visit={data.visits[currentVisitIndex]} />
      </Layer>
    </Layer>
  );
};

export default VisitsNavigation;
