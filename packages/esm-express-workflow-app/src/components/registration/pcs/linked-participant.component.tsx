import React from 'react';
import { Button, InlineLoading, SkeletonText, Tag } from '@carbon/react';
import { GenderFemale, GenderMale, Renew, Unlink } from '@carbon/react/icons';
import { age, formatDate, parseDate, showModal, showSnackbar, useConfig } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { type ExpressWorkflowConfig } from '../../../config-schema';
import styles from './pcs.scss';
import { formatCompoundHeadName, formatMotherName, formatParticipantName, usePcsParticipant } from './pcs.resource';
import { type StudyAttributeFlag, useSyncStudyAttributes } from './link-participant.resource';
import { type PcsParticipant, type PcsSearchSubject } from './pcs.types';

interface LinkedParticipantProps {
  subject: PcsSearchSubject;
  /** The study participant ID already stamped on the patient — the key into PCS. */
  studyParticipantId: string;
  localPatient: any;
  onDelinked: () => void;
}

const GENDER_ICONS = {
  F: <GenderFemale />,
  M: <GenderMale />,
} as const;

const SEX_LABELS: Record<PcsParticipant['sex'], string> = { F: 'Female', M: 'Male' };

const LinkedParticipant: React.FC<LinkedParticipantProps> = ({
  subject,
  studyParticipantId,
  localPatient,
  onDelinked,
}) => {
  const { t } = useTranslation();
  const { pcsAttributeTypes } = useConfig<ExpressWorkflowConfig>();
  const { participant, isLoading, error, mutate } = usePcsParticipant(studyParticipantId);

  const flagLabels: Record<StudyAttributeFlag, string> = {
    pbids: t('pbidsEnrollment', 'PBIDS enrollment'),
    cardse: t('cardseEnrollment', 'CARDSE enrollment'),
  };

  // PCS owns these two flags, so every pull by id reconciles the patient record with them.
  const { syncNow } = useSyncStudyAttributes({
    participant,
    localPatient,
    pbidsEnrollmentAttributeType: pcsAttributeTypes.pbidsEnrollmentStatus,
    cardseEnrollmentAttributeType: pcsAttributeTypes.cardseEnrollmentStatus,
    onSynced: (changed) =>
      showSnackbar({
        title: t('studyAttributesUpdated', 'Study attributes updated'),
        subtitle: t('studyAttributesUpdatedSubtitle', 'Updated from PCS: {{fields}}', {
          fields: changed.map((flag) => flagLabels[flag]).join(', '),
        }),
        kind: 'success',
        isLowContrast: true,
      }),
    onSyncError: (syncError: any) =>
      showSnackbar({
        title: t('studyAttributesSyncFailed', 'Could not sync study attributes'),
        subtitle: syncError?.responseBody?.error?.message ?? syncError?.message,
        kind: 'error',
      }),
  });

  const refresh = async () => {
    await mutate();
    // Bypasses the sync guard: the PCS values may be identical while the patient's own
    // attributes have drifted, and Refresh should mean "reconcile now".
    syncNow();
  };

  const openDelinkModal = () => {
    const dispose = showModal('pcs-delink-participant-modal', {
      closeModal: () => dispose(),
      localPatient,
      studyParticipantId,
      participantName: participant ? formatParticipantName(participant) : undefined,
      onDelinked,
    });
  };

  const row = (label: string, value?: string | null) => (
    <div className={styles.pcsRow} key={label}>
      <span className={styles.pcsFieldLabel}>{label}:</span>
      <span>{value || '--'}</span>
    </div>
  );

  const renderParticipant = () => {
    if (isLoading) {
      return (
        <div className={styles.pcsSkeletonTile}>
          <SkeletonText heading width="60%" />
          <SkeletonText paragraph lineCount={5} />
        </div>
      );
    }

    // A PCS record that cannot be resolved must not strand the patient — the delink action
    // stays available above, so a stale or mistyped study ID can always be removed.
    if (error || !participant) {
      return (
        <div className={styles.pcsLinkError}>
          <p className={styles.pcsEmptyTitle}>{t('pcsParticipantUnavailable', 'Participant could not be loaded')}</p>
          <p className={styles.pcsEmptySubtitle}>
            {t('pcsParticipantUnavailableSubtitle', 'PCS did not return a record for {{individualId}}.', {
              individualId: studyParticipantId,
            })}
          </p>
        </div>
      );
    }

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

  return (
    <>
      <div className={styles.pcsLinkedBanner}>
        <span className={styles.pcsLinkedTitle}>{t('linkedToPcs', 'Linked to PCS')}</span>
        <span className={styles.pcsLinkedSubtitle}>
          {t('linkedAs', '{{patientName}} is linked as {{individualId}}', {
            patientName: subject.name,
            individualId: studyParticipantId,
          })}
        </span>
        <div className={styles.pcsLinkedActions}>
          <Button kind="ghost" size="sm" renderIcon={Renew} disabled={isLoading} onClick={refresh}>
            {isLoading ? <InlineLoading description={t('refreshing', 'Refreshing...')} /> : t('refresh', 'Refresh')}
          </Button>
          <Button kind="danger--ghost" size="sm" renderIcon={Unlink} onClick={openDelinkModal}>
            {t('delink', 'Delink')}
          </Button>
        </div>
      </div>

      {renderParticipant()}
    </>
  );
};

export default LinkedParticipant;
