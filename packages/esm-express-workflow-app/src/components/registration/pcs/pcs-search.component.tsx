import React, { useEffect, useMemo, useState } from 'react';
import { Button, Search, SkeletonText } from '@carbon/react';
import { ErrorState } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import styles from './pcs.scss';
import { EmptySvg } from '../empty-svg/empty-svg.component';
import PCSPatientTile from './pcs-patient.component';
import { filterPcsPatients, usePcsPatientSearch } from './pcs.resource';
import { type PcsSearchSubject } from './pcs.types';

interface PCSSearchResultsProps {
  /** The authorized patient the registry is being cross-checked against. */
  subject: PcsSearchSubject;
}

const PCSSearchResults: React.FC<PCSSearchResultsProps> = ({ subject }) => {
  const { t } = useTranslation();
  const [filterQuery, setFilterQuery] = useState('');
  const { pcsPatients, isLoading, error } = usePcsPatientSearch(subject);

  // The registry is only queried when a patient is selected; the box below narrows what
  // came back, so a filter left over from the previous patient must not hide the new one.
  useEffect(() => {
    setFilterQuery('');
  }, [subject.id]);

  const visiblePatients = useMemo(() => filterPcsPatients(pcsPatients, filterQuery), [pcsPatients, filterQuery]);

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className={styles.pcsLoading}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div className={styles.pcsSkeletonTile} key={`pcs-skeleton-${index}`}>
              <SkeletonText heading width="60%" />
              <SkeletonText paragraph lineCount={3} />
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return <ErrorState error={error} headerTitle={t('errorLoadingPcsRecords', 'Error loading PCS records')} />;
    }

    if (pcsPatients.length === 0) {
      return (
        <div className={styles.pcsEmptyState}>
          <EmptySvg />
          <p className={styles.pcsEmptyTitle}>{t('noPcsRecordsFound', 'No PCS records found')}</p>
          <p className={styles.pcsEmptySubtitle}>
            {t('noPcsRecordsForPatient', 'The PCS registry has no candidates for this patient')}
          </p>
        </div>
      );
    }

    if (visiblePatients.length === 0) {
      return (
        <div className={styles.pcsEmptyState}>
          <EmptySvg />
          <p className={styles.pcsEmptyTitle}>{t('noRecordsMatchFilter', 'No records match this filter')}</p>
          <p className={styles.pcsEmptySubtitle}>
            {t('pcsFilterHiddenCount', '{{count}} record(s) hidden', { count: pcsPatients.length })}
          </p>
          <Button kind="ghost" size="sm" onClick={() => setFilterQuery('')}>
            {t('clearFilter', 'Clear filter')}
          </Button>
        </div>
      );
    }

    return (
      <div className={styles.pcsResults}>
        <span className={styles.pcsResultsCount}>
          {t('pcsRecordsFound', 'PCS record(s) found ({{count}})', { count: visiblePatients.length })}
        </span>
        {visiblePatients.map((pcsPatient) => (
          <PCSPatientTile key={pcsPatient.individualId} pcsPatient={pcsPatient} subject={subject} />
        ))}
      </div>
    );
  };

  return (
    <div className={styles.pcsColumn}>
      <div className={styles.pcsHeader}>
        <span className={styles.pcsTitle}>{t('pcsRegistry', 'PCS registry')}</span>
        <span className={styles.pcsSubtitle}>
          {t('pcsMatchesFor', 'Possible matches for {{patientName}}', { patientName: subject.name })}
        </span>
      </div>

      <Search
        className={styles.pcsSearch}
        size="sm"
        id="pcsFilter"
        labelText={t('filterPcsResults', 'Filter PCS results')}
        placeholder={t('filterByNameVillageOrId', 'Filter by name, village or ID')}
        value={filterQuery}
        onChange={(event) => setFilterQuery(event.target.value)}
        onClear={() => setFilterQuery('')}
      />

      {renderBody()}
    </div>
  );
};

export default PCSSearchResults;
