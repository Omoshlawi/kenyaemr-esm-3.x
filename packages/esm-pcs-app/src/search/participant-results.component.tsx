import React from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorState } from '@openmrs/esm-framework';
import styles from '../pcs.scss';
import { getPcsErrorMessage, isPcsUnavailable } from '../resources/pcs.resource';
import { type PcsParticipant, type PcsSearchSubject } from '../types';
import PCSParticipantTile from './participant-tile.component';
import PcsEmptyState from './pcs-empty-state.component';
import PcsResultsSkeleton from './pcs-results-skeleton.component';

interface ParticipantResultsProps {
  subject: PcsSearchSubject;
  participants: Array<PcsParticipant>;
  totalCount: number;
  /** False until a filter has actually been submitted — no search has been made yet. */
  hasCommittedFilters: boolean;
  isLoading: boolean;
  error: unknown;
  onReset: () => void;
  onLinked: () => void;
}

/** The body of the search pane: nothing asked yet, loading, failed, empty, or results. */
const ParticipantResults: React.FC<ParticipantResultsProps> = ({
  subject,
  participants,
  totalCount,
  hasCommittedFilters,
  isLoading,
  error,
  onReset,
  onLinked,
}) => {
  const { t } = useTranslation();

  if (!hasCommittedFilters) {
    return (
      <PcsEmptyState
        title={t('noFilters', 'No filters')}
        subtitle={t('pcsAddFilterToSearch', 'Add a filter to search the PCS registry')}
        onReset={onReset}
      />
    );
  }

  if (isLoading) {
    return <PcsResultsSkeleton />;
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        headerTitle={
          // A downed VPN to the SQL Server reads very differently to a bug, so it is named.
          isPcsUnavailable(error)
            ? t('pcsRegistryUnavailable', 'PCS registry unavailable')
            : getPcsErrorMessage(error) ?? t('errorLoadingPcsRecords', 'Error loading PCS records')
        }
      />
    );
  }

  if (participants.length === 0) {
    return (
      <PcsEmptyState
        title={t('noPcsRecordsFound', 'No PCS records found')}
        subtitle={t('noPcsRecordsForFilters', 'No participant matched these filters')}
        onReset={onReset}
      />
    );
  }

  return (
    <div className={styles.pcsResults}>
      <span className={styles.pcsResultsCount}>
        {totalCount > participants.length
          ? t('pcsShowingOf', 'Showing {{shown}} of {{total}} PCS records', {
              shown: participants.length,
              total: totalCount,
            })
          : t('pcsRecordsFound', 'PCS record(s) found ({{count}})', { count: participants.length })}
      </span>
      {participants.map((participant) => (
        <PCSParticipantTile
          key={participant.individualId}
          participant={participant}
          subject={subject}
          onLinked={onLinked}
        />
      ))}
    </div>
  );
};

export default ParticipantResults;
