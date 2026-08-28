import React from 'react';
import { Tag } from '@carbon/react';
import { GenderFemale, GenderMale } from '@carbon/react/icons';
import { age, formatDate, parseDate } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import styles from '../pcs.scss';
import { formatCompoundHeadName, formatMotherName, formatParticipantName } from '../resources/pcs.resource';
import { type PcsParticipant } from '../types';

interface ParticipantDetailsProps {
  participant: PcsParticipant;
}

export const GENDER_ICONS = {
  F: <GenderFemale />,
  M: <GenderMale />,
} as const;

export const SEX_LABELS: Record<PcsParticipant['sex'], string> = { F: 'Female', M: 'Male' };

/** The linked participant's full PCS record. Read-only. */
const ParticipantDetails: React.FC<ParticipantDetailsProps> = ({ participant }) => {
  const { t } = useTranslation();

  const row = (label: string, value?: string | null) => (
    <div className={styles.pcsRow} key={label}>
      <span className={styles.pcsFieldLabel}>{label}:</span>
      <span>{value || '--'}</span>
    </div>
  );

  const contacts = participant.contacts?.length ? participant.contacts : [{}];

  return (
    <div className={styles.pcsTile}>
      <div className={styles.pcsRow}>
        <span className={styles.pcsName}>{formatParticipantName(participant)}</span>
      </div>

      <div className={styles.pcsRow}>
        <span className={styles.genderIcon}>
          {GENDER_ICONS[participant.sex]}
          <span>{SEX_LABELS[participant.sex]}</span>
        </span>
        {participant.dateOfBirth && (
          <>
            <span className={styles.separator}>&middot;</span>
            <span>{age(participant.dateOfBirth)}</span>
            <span className={styles.separator}>&middot;</span>
            <span>{formatDate(parseDate(participant.dateOfBirth))}</span>
          </>
        )}
      </div>

      <div className={styles.pcsRow}>
        {participant.pbidsEnrolled && (
          <Tag className={styles.enrollmentTag} type="green" size="sm">
            {t('pbidsEnrolled', 'PBIDS enrolled')}
          </Tag>
        )}
        {participant.cardse && (
          <Tag className={styles.enrollmentTag} type="purple" size="sm">
            {t('cardse', 'CARDSE')}
          </Tag>
        )}
      </div>

      {row(t('individualId', 'Individual ID'), participant.individualId)}
      {participant.mother && row(t('mother', 'Mother'), formatMotherName(participant.mother))}
      {row(
        t('compound', 'Compound'),
        `${participant.compound.compoundId} · ${formatCompoundHeadName(participant.compound)}`,
      )}
      {row(t('village', 'Village'), `${participant.village.name} (${participant.village.code})`)}

      <div className={styles.pcsContacts}>
        {contacts.map((contact, index) => (
          <div key={`contact-${index}`}>
            {row(t('phone', 'Phone'), contact.phone)}
            {row(t('nationalId', 'National ID'), contact.nationalId)}
            {row(t('email', 'Email'), contact.email)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParticipantDetails;
