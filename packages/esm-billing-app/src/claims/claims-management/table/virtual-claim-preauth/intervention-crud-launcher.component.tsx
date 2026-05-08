import { Button } from '@carbon/react';
import { Add, ArrowsHorizontal, Reset, TrashCan } from '@carbon/react/icons';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './intervention-crud-launcher.scss';

const LOCKED_STATES = ['PREAUTH_PENDING', 'ELECTIVE_PENDING', 'ELECTIVE_APPROVED'];

interface Props {
  consentToken: string;
  interventionCode?: string | null;
  patientUuid?: string | null;
  workflowState?: string | null;
  isElective?: boolean;
  onSuccess: () => void;
}

const InterventionCrudLauncher: React.FC<Props> = ({
  consentToken,
  interventionCode,
  patientUuid,
  workflowState,
  isElective = false,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const ws = workflowState ?? '';

  if (LOCKED_STATES.includes(ws)) {
    const msg =
      ws === 'PREAUTH_PENDING'
        ? t(
            'preauthPendingLocked',
            'SHA is reviewing this preauth — interventions cannot be modified while under review.',
          )
        : ws === 'ELECTIVE_PENDING'
        ? t(
            'electivePendingLocked',
            'SHA is reviewing the elective preauth — wait for a decision before modifying interventions.',
          )
        : t(
            'electiveApprovedLocked',
            'Elective preauth approved — patient has not checked in yet. Interventions can be modified after the visit starts.',
          );

    return <p className={styles.lockedMsg}>{msg}</p>;
  }

  const launch = (operationType: 'add' | 'switch' | 'retire' | 'restore') => {
    const titles: Record<string, string> = {
      add: t('addIntervention', 'Add Intervention'),
      switch: t('switchIntervention', 'Switch Intervention'),
      retire: t('retireIntervention', 'Retire Intervention'),
      restore: t('restoreIntervention', 'Restore Intervention'),
    };
    launchWorkspace2('preauth-operation-workspace', {
      workspaceTitle: titles[operationType],
      operationType,
      authorizationCode: consentToken,
      currentInterventionCode: interventionCode ?? null,
      patientUuid: patientUuid ?? null,
      isElective,
      mutate: onSuccess,
    });
  };

  return (
    <div className={styles.crudActions}>
      <Button
        size="sm"
        kind="primary"
        renderIcon={Add}
        onClick={() => launch('add')}
        iconDescription={t('addIntervention', 'Add intervention')}>
        {t('add', 'Add')}
      </Button>

      <Button
        size="sm"
        kind="secondary"
        renderIcon={ArrowsHorizontal}
        onClick={() => launch('switch')}
        disabled={!interventionCode}
        iconDescription={t('switchIntervention', 'Switch intervention')}>
        {t('switch', 'Switch')}
      </Button>

      <Button
        size="sm"
        kind="danger"
        renderIcon={TrashCan}
        onClick={() => launch('retire')}
        disabled={!interventionCode}
        iconDescription={t('retireIntervention', 'Retire intervention')}>
        {t('retire', 'Retire')}
      </Button>

      <Button
        size="sm"
        kind="tertiary"
        renderIcon={Reset}
        onClick={() => launch('restore')}
        disabled={!interventionCode}
        iconDescription={t('restoreIntervention', 'Restore intervention')}>
        {t('restore', 'Restore')}
      </Button>
    </div>
  );
};

export default InterventionCrudLauncher;
