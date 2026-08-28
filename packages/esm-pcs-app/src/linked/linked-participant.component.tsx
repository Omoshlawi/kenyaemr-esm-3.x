import React from 'react';
import { Button, InlineLoading } from '@carbon/react';
import { ArrowRight, Renew, Unlink } from '@carbon/react/icons';
import { launchWorkspace2, showModal, showSnackbar, useConfig } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { type PcsConfig } from '../config-schema';
import styles from '../pcs.scss';
import { formatParticipantName, usePcsDependants, usePcsParticipant } from '../resources/pcs.resource';
import { useSyncStudyAttributes } from '../resources/link-participant.resource';
import { useStudySyncSnackbars } from './use-study-sync-snackbars';
import { type PcsSearchSubject } from '../types';
import LinkedParticipantBody from './linked-participant-body.component';

interface LinkedParticipantProps {
  subject: PcsSearchSubject;
  /** The study participant ID already stamped on the patient — the key into PCS. */
  studyParticipantId: string;
  localPatient: any;
  onDelinked: () => void;
}

const LinkedParticipant: React.FC<LinkedParticipantProps> = ({
  subject,
  studyParticipantId,
  localPatient,
  onDelinked,
}) => {
  const { t } = useTranslation();
  const { pcsAttributeTypes } = useConfig<PcsConfig>();
  const { participant, isLoading, error, mutate } = usePcsParticipant(studyParticipantId);
  // Same key as the list inside the panel, so SWR issues one request and the tab can show a
  // real count without anyone opening it.
  const {
    totalCount: dependantCount,
    isLoading: isLoadingDependants,
    mutate: mutateDependants,
  } = usePcsDependants(participant?.individualId ?? null);

  // PCS owns these two flags, so every pull by id reconciles the patient record with them.
  const { syncNow } = useSyncStudyAttributes({
    participant,
    localPatient,
    pbidsEnrollmentAttributeType: pcsAttributeTypes.pbidsEnrollmentStatus,
    cardseEnrollmentAttributeType: pcsAttributeTypes.cardseEnrollmentStatus,
    ...useStudySyncSnackbars(participant ? formatParticipantName(participant) : ''),
  });

  const refresh = async () => {
    await mutate();
    // Bypasses the sync guard: the PCS values may be identical while the patient's own
    // attributes have drifted, and Refresh should mean "reconcile now".
    syncNow();
  };

  const openAddDependant = () => {
    launchWorkspace2('pcs-add-dependant-workspace-form', {
      motherIndividualId: participant!.individualId,
      // The new child is a participant with this mother, so the same key that feeds the tab
      // count and the list picks them up.
      onCreated: () => mutateDependants(),
    });
  };

  const openLinkHieDependant = () => {
    launchWorkspace2('pcs-link-hie-dependant-workspace-form', {
      motherIndividualId: participant!.individualId,
      hiePatient: subject.hiePatient,
      parentPhoneNumber: subject.phoneNumber ?? undefined,
      // The child becomes a participant with this mother, so the key behind the tab count and
      // the list picks her up.
      onLinked: () => mutateDependants(),
    });
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
            {t('unlink', 'Unlink')}
          </Button>
        </div>

        {/* The Dependants tab lists PCS rows, so by construction it cannot reach a child PCS has
            never heard of. These two questions are exactly those cases, named by the situation at
            the desk rather than by what the flow does. */}
        <div className={styles.pcsLinkedQuestions}>
          <Button
            kind="ghost"
            size="sm"
            renderIcon={ArrowRight}
            // Needs the mother's individualId, which only arrives with the participant.
            disabled={!participant}
            onClick={openAddDependant}>
            {t('dependantNotInHieAndPcs', 'Dependant not in HIE and PCS?')}
          </Button>
          <Button
            kind="ghost"
            size="sm"
            renderIcon={ArrowRight}
            // Same guard as above — the handler reads participant.individualId.
            disabled={!participant}
            onClick={openLinkHieDependant}>
            {t('dependantInHieNotPcs', 'Dependant in HIE and not PCS?')}
          </Button>
        </div>
      </div>

      <LinkedParticipantBody
        subject={subject}
        participant={participant}
        studyParticipantId={studyParticipantId}
        isLoading={isLoading}
        error={error}
        dependantCount={dependantCount}
        isLoadingDependants={isLoadingDependants}
      />
    </>
  );
};

export default LinkedParticipant;
