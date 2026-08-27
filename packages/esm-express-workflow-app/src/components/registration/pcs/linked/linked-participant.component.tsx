import React from 'react';
import { Button, InlineLoading, SkeletonText, Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import { Renew, Unlink } from '@carbon/react/icons';
import { showModal, showSnackbar, useConfig } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { type ExpressWorkflowConfig } from '../../../../config-schema';
import styles from '../pcs.scss';
import { formatParticipantName, usePcsDependants, usePcsParticipant } from '../resources/pcs.resource';
import { type StudyAttributeFlag, useSyncStudyAttributes } from '../resources/link-participant.resource';
import { type PcsSearchSubject } from '../pcs.types';
import DependantsList from './dependants-list.component';
import ParticipantDetails from './participant-details.component';

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
  const { pcsAttributeTypes } = useConfig<ExpressWorkflowConfig>();
  const { participant, isLoading, error, mutate } = usePcsParticipant(studyParticipantId);
  // Same key as the list inside the panel, so SWR issues one request and the tab can show a
  // real count without anyone opening it.
  const { totalCount: dependantCount, isLoading: isLoadingDependants } = usePcsDependants(
    participant?.individualId ?? null,
  );

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

  const renderBody = () => {
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

    return (
      <Tabs>
        <TabList aria-label={t('pcsParticipantTabs', 'PCS participant')} contained>
          <Tab>{t('details', 'Details')}</Tab>
          <Tab>
            {isLoadingDependants
              ? t('dependants', 'Dependants')
              : t('dependantsWithCount', 'Dependants ({{count}})', { count: dependantCount })}
          </Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <ParticipantDetails participant={participant} />
          </TabPanel>
          <TabPanel>
            <DependantsList motherIndividualId={participant.individualId} />
          </TabPanel>
        </TabPanels>
      </Tabs>
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

      {renderBody()}
    </>
  );
};

export default LinkedParticipant;
