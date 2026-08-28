import { showSnackbar } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { type StudyAttributeFlag } from '../resources/link-participant.resource';

/**
 * The snackbars `useSyncStudyAttributes` fires, shared by the mother's banner and each linked
 * dependant row so the two can't drift apart.
 *
 * The participant's name is in the subtitle because several rows can sync at once — an
 * unattributed "Updated from PCS: PBIDS enrollment" says nothing about which child changed.
 *
 * `useSyncStudyAttributes` keeps its callbacks in a ref refreshed each render, so these do not
 * need to be referentially stable.
 */
export function useStudySyncSnackbars(participantName: string) {
  const { t } = useTranslation();

  const flagLabels: Record<StudyAttributeFlag, string> = {
    pbids: t('pbidsEnrollment', 'PBIDS enrollment'),
    cardse: t('cardseEnrollment', 'CARDSE enrollment'),
  };

  return {
    onSynced: (changed: Array<StudyAttributeFlag>) =>
      showSnackbar({
        title: t('studyAttributesUpdated', 'Study attributes updated'),
        subtitle: t('studyAttributesUpdatedSubtitle', 'Updated {{name}} from PCS: {{fields}}', {
          name: participantName,
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
  };
}
