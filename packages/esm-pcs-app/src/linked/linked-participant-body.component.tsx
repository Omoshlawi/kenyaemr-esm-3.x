import React from 'react';
import { SkeletonText, Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import styles from '../pcs.scss';
import { type PcsParticipant, type PcsSearchSubject } from '../types';
import DependantsList from './dependants-list.component';
import ParticipantDetails from './participant-details.component';

interface LinkedParticipantBodyProps {
  subject: PcsSearchSubject;
  participant: PcsParticipant | null;
  /** The study participant ID stamped on the patient — shown when PCS cannot resolve it. */
  studyParticipantId: string;
  isLoading: boolean;
  error: unknown;
  dependantCount: number;
  isLoadingDependants: boolean;
}

/** Everything below the linked banner: loading, unresolvable, or the participant's tabs. */
const LinkedParticipantBody: React.FC<LinkedParticipantBodyProps> = ({
  subject,
  participant,
  studyParticipantId,
  isLoading,
  error,
  dependantCount,
  isLoadingDependants,
}) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className={styles.pcsSkeletonTile}>
        <SkeletonText heading width="60%" />
        <SkeletonText paragraph lineCount={5} />
      </div>
    );
  }

  // A PCS record that cannot be resolved must not strand the patient — the unlink action stays
  // available above, so a stale or mistyped study ID can always be removed.
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
          <DependantsList
            motherIndividualId={participant.individualId}
            hiePatient={subject.hiePatient}
            parentPhoneNumber={subject.phoneNumber ?? undefined}
          />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
};

export default LinkedParticipantBody;
