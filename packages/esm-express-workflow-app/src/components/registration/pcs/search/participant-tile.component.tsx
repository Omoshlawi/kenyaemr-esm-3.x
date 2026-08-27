import React from 'react';
import { Button, Tag } from '@carbon/react';
import { GenderFemale, GenderMale, Link as LinkIcon } from '@carbon/react/icons';
import { age, formatDate, parseDate, showModal } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import styles from '../pcs.scss';
import {
  formatCompoundHeadName,
  formatMotherName,
  formatParticipantName,
  getPrimaryContact,
} from '../resources/pcs.resource';
import { type PcsMatchType, type PcsMatchedOn, type PcsParticipant, type PcsSearchSubject } from '../pcs.types';
import { registerOrLaunchHIEPatient } from '../../search-bar/search-bar.resource';

interface PCSParticipantTileProps {
  participant: PcsParticipant;
  subject: PcsSearchSubject;
  /** Lets the pane re-read the patient's study link once one has been written. */
  onLinked?: () => void;
}

const GENDER_ICONS = {
  F: <GenderFemale />,
  M: <GenderMale />,
} as const;

const SEX_LABELS: Record<PcsParticipant['sex'], string> = { F: 'Female', M: 'Male' };

const PCSParticipantTile: React.FC<PCSParticipantTileProps> = ({ participant, subject, onLinked }) => {
  const { t } = useTranslation();

  const name = formatParticipantName(participant);
  const contact = getPrimaryContact(participant);

  // The registry scores the name itself, tiered and per field, which beats comparing
  // strings here. Both are null when `name` was not one of the filters.
  const matchLabel = (matchType: PcsMatchType, matchedOn: PcsMatchedOn): string => {
    const field = {
      name: t('pcsFieldName', 'name'),
      motherName: t('pcsFieldMotherName', "mother's name"),
      compoundName: t('pcsFieldCompoundName', 'compound head'),
    }[matchedOn];

    switch (matchType) {
      case 'EXACT':
        return t('pcsMatchExact', 'Exact match on {{field}}', { field });
      case 'CONTAINS':
        return t('pcsMatchContains', 'Partial match on {{field}}', { field });
      case 'SOUNDEX':
        return t('pcsMatchSoundex', 'Sounds like {{field}}', { field });
    }
  };

  const matchTagType = participant.matchType === 'EXACT' ? 'green' : 'teal';

  // Linking creates the patient if needed and writes to their record, so it confirms first.
  const openLinkModal = () => {
    const dispose = showModal('pcs-link-participant-modal', {
      closeModal: () => dispose(),
      subject,
      participant,
      onLinked,
    });
  };

  return (
    <div className={styles.pcsTile}>
      <div className={styles.pcsRow}>
        <span className={styles.pcsName}>{name}</span>
      </div>

      {participant.matchType && participant.matchedOn && (
        <Tag className={styles.matchTag} type={matchTagType} size="sm">
          {matchLabel(participant.matchType, participant.matchedOn)}
        </Tag>
      )}

      <div className={styles.pcsRow}>
        <span className={styles.genderIcon}>
          {GENDER_ICONS[participant.sex]}
          <span>{SEX_LABELS[participant.sex]}</span>
        </span>
        {participant.dateOfBirth ? (
          <>
            <span className={styles.separator}>&middot;</span>
            <span>{age(participant.dateOfBirth)}</span>
            <span className={styles.separator}>&middot;</span>
            <span>{formatDate(parseDate(participant.dateOfBirth))}</span>
            <span className={styles.separator}>&middot;</span>
            <span>{contact?.phone || '--'}</span>
          </>
        ) : (
          <>
            <span className={styles.separator}>&middot;</span>
            <span>{t('unknownDateOfBirth', 'Unknown date of birth')}</span>
          </>
        )}
      </div>

      <div className={styles.pcsRow}>
        <span className={styles.pcsFieldLabel}>{t('individualId', 'Individual ID')}:</span>
        <span>{participant.individualId}</span>
        <span className={styles.separator}>&middot;</span>
        <span className={styles.pcsFieldLabel}>{t('nationalId', 'National ID')}:</span>
        <span>{contact?.nationalId || '--'}</span>
      </div>

      {participant.mother && (
        <div className={styles.pcsRow}>
          <span className={styles.pcsFieldLabel}>{t('mother', 'Mother')}:</span>
          <span>{formatMotherName(participant.mother)}</span>
          <span className={styles.separator}>&middot;</span>
          <span>{participant.mother.individualId}</span>
        </div>
      )}

      <div className={styles.pcsHousehold}>
        {t('pcsHousehold', '{{village}} village | Head: {{compoundHead}}', {
          village: participant.village?.name || '--',
          compoundHead: formatCompoundHeadName(participant.compound) || '--',
        })}
      </div>

      <div className={styles.pcsTileActions}>
        <Button kind="ghost" size="sm" renderIcon={LinkIcon} onClick={openLinkModal}>
          {t('linkRecords', 'Link records')}
        </Button>
      </div>
    </div>
  );
};

export default PCSParticipantTile;
