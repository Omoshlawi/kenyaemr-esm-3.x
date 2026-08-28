import React, { useEffect, useState } from 'react';
import { Button, DismissibleTag, IconButton, Search, SkeletonText, TextInput } from '@carbon/react';
import { FilterEdit, Reset, Search as SearchIcon } from '@carbon/react/icons';
import { useConfig } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import styles from '../pcs.scss';
import { type PcsConfig } from '../config-schema';
import LinkedParticipant from '../linked/linked-participant.component';
import { usePatientStudyLink } from '../resources/link-participant.resource';
import ParticipantResults from './participant-results.component';
import { hasAnyFilter, toPcsParticipantFilters, usePcsParticipantSearch } from '../resources/pcs.resource';
import { type PcsParticipantFilters, type PcsSearchSubject } from '../types';

interface PCSSearchResultsProps {
  /** The authorized patient the registry is being cross-checked against. */
  subject: PcsSearchSubject;
}

const PCSSearchResults: React.FC<PCSSearchResultsProps> = ({ subject }) => {
  const { t } = useTranslation();

  // `draft` is what the form shows; `filters` is what the registry has actually been asked.
  // Committing on submit rather than per keystroke keeps these server round-trips deliberate.
  const [draft, setDraft] = useState<PcsParticipantFilters>(() => toPcsParticipantFilters(subject));
  const [filters, setFilters] = useState<PcsParticipantFilters>(() => toPcsParticipantFilters(subject));
  const [isEditingFilters, setIsEditingFilters] = useState(false);
  const { pcsIdentifiers } = useConfig<PcsConfig>();
  const {
    studyParticipantId,
    localPatient,
    isLoading: isCheckingLink,
    mutate: mutateStudyLink,
  } = usePatientStudyLink(subject, pcsIdentifiers.studyParticipantID);

  const { participants, totalCount, isLoading, error } = usePcsParticipantSearch(filters);

  // Authorizing a patient searches on their own demographics straight away.
  useEffect(() => {
    const defaults = toPcsParticipantFilters(subject);
    setDraft(defaults);
    setFilters(defaults);
    setIsEditingFilters(false);
  }, [subject]);

  const canSearch = hasAnyFilter(draft);
  const hasCommittedFilters = hasAnyFilter(filters);

  // Dismissing the last tag while the name is empty leaves nothing to search; open the
  // panel so there are fields to type into rather than stranding the pane.
  useEffect(() => {
    if (!hasCommittedFilters) {
      setIsEditingFilters(true);
    }
  }, [hasCommittedFilters]);

  const updateFilter = (filter: keyof PcsParticipantFilters) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((previous) => ({ ...previous, [filter]: event.target.value }));

  const submit = (event: React.SyntheticEvent) => {
    event.preventDefault();
    if (canSearch) {
      setFilters(draft);
    }
  };

  const resetToPatient = () => {
    const defaults = toPcsParticipantFilters(subject);
    setDraft(defaults);
    setFilters(defaults);
  };

  const toggleEditingFilters = () => {
    if (isEditingFilters) {
      // Collapsing discards uncommitted edits, so the tags can never advertise a query
      // that was never run.
      setDraft(filters);
    }
    setIsEditingFilters(!isEditingFilters);
  };

  /** Dismissing a tag commits immediately — it is an edit and a search in one gesture. */
  const clearFilter = (filter: keyof PcsParticipantFilters) => {
    setDraft((previous) => ({ ...previous, [filter]: '' }));
    setFilters((previous) => ({ ...previous, [filter]: '' }));
  };

  // Built from the committed filters, so they always describe the results on screen.
  const activeTags = (
    [
      ['name', t('pcsNameTag', 'Name: {{value}}', { value: filters.name })],
      ['phone', t('pcsPhoneTag', 'Phone: {{value}}', { value: filters.phone })],
    ] as const
  ).filter(([filter]) => filters[filter].trim());

  // A patient already carrying a study participant ID gives us a unique key into PCS, so the
  // pane reports on that participant instead of searching for candidates.
  const isLinked = Boolean(studyParticipantId);

  if (isCheckingLink) {
    return (
      <div className={styles.pcsColumn}>
        <div className={styles.pcsHeader}>
          <span className={styles.pcsTitle}>{t('pcsRegistry', 'PCS registry')}</span>
        </div>
        <div className={styles.pcsSkeletonTile}>
          <SkeletonText heading width="60%" />
          <SkeletonText paragraph lineCount={3} />
        </div>
      </div>
    );
  }

  if (isLinked) {
    return (
      <div className={styles.pcsColumn}>
        <div className={styles.pcsHeader}>
          <span className={styles.pcsTitle}>{t('pcsRegistry', 'PCS registry')}</span>
        </div>
        <LinkedParticipant
          subject={subject}
          studyParticipantId={studyParticipantId!}
          localPatient={localPatient}
          onDelinked={() => mutateStudyLink()}
        />
      </div>
    );
  }

  return (
    <div className={styles.pcsColumn}>
      <div className={styles.pcsHeader}>
        <span className={styles.pcsTitle}>{t('pcsRegistry', 'PCS registry')}</span>
      </div>

      <form className={styles.pcsFilters} onSubmit={submit}>
        <div className={styles.pcsFilterRow}>
          <Search
            id="pcsFilterVillage"
            size="sm"
            labelText={t('village', 'Village')}
            placeholder={t('pcsVillagePlaceholder', 'Village name')}
            value={draft.village}
            onChange={updateFilter('village')}
            onClear={() => setDraft((previous) => ({ ...previous, village: '' }))}
            // Implicit form submission would work here, but only by way of a subtle rule
            // about lone text fields; being explicit is cheaper than depending on it.
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                submit(event);
              }
            }}
          />
          <IconButton
            kind="tertiary"
            size="sm"
            align="left"
            label={isEditingFilters ? t('hideFilters', 'Hide filters') : t('editFilters', 'Edit filters')}
            onClick={toggleEditingFilters}>
            <FilterEdit />
          </IconButton>
        </div>

        {!isEditingFilters && activeTags.length > 0 && (
          <div className={styles.pcsFilterTags}>
            {activeTags.map(([filter, label]) => (
              <DismissibleTag
                key={filter}
                type="blue"
                text={label}
                // Without this every tag's dismiss button is announced as just "Dismiss".
                title={t('removeFilter', 'Remove {{label}}', { label })}
                onClose={() => clearFilter(filter)}
              />
            ))}
          </div>
        )}

        {isEditingFilters && (
          <>
            <TextInput
              id="pcsFilterName"
              size="sm"
              labelText={t('name', 'Name')}
              helperText={t('pcsNameHelper', 'Matches the participant, their mother or their compound head')}
              value={draft.name}
              onChange={updateFilter('name')}
            />
            <TextInput
              id="pcsFilterPhone"
              size="sm"
              labelText={t('phone', 'Phone')}
              value={draft.phone}
              onChange={updateFilter('phone')}
            />

            {!canSearch && (
              <span className={styles.pcsFilterHint}>
                {t('pcsFilterRequired', 'Enter at least one of name, village or phone')}
              </span>
            )}

            <div className={styles.pcsFilterActions}>
              <Button kind="ghost" size="sm" renderIcon={Reset} onClick={resetToPatient}>
                {t('resetToPatient', 'Reset to patient details')}
              </Button>
              <Button kind="primary" size="sm" type="submit" renderIcon={SearchIcon} disabled={!canSearch}>
                {t('search', 'Search')}
              </Button>
            </div>
          </>
        )}
      </form>

      <ParticipantResults
        subject={subject}
        participants={participants}
        totalCount={totalCount}
        hasCommittedFilters={hasCommittedFilters}
        isLoading={isLoading}
        error={error}
        onReset={resetToPatient}
        onLinked={() => mutateStudyLink()}
      />
    </div>
  );
};

export default PCSSearchResults;
