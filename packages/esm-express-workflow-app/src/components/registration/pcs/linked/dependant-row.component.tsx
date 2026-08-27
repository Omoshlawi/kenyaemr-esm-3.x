import React from 'react';
import { Button, Tag } from '@carbon/react';
import { Link as LinkIcon, Unlink } from '@carbon/react/icons';
import { age, showModal, useConfig } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import styles from '../pcs.scss';
import { type ExpressWorkflowConfig } from '../../../../config-schema';
import { formatParticipantName } from '../resources/pcs.resource';
import { useLinkedPatientForParticipant, useSyncStudyAttributes } from '../resources/link-participant.resource';
import { useStudySyncSnackbars } from './use-study-sync-snackbars';
import { type PcsParticipant } from '../pcs.types';
import { GENDER_ICONS, SEX_LABELS } from './participant-details.component';

interface DependantRowProps {
  dependant: PcsParticipant;
  /** The mother's HIE record — the modal picks her dependants out of its contacts. */
  hiePatient?: fhir.Patient;
  parentPhoneNumber?: string;
}

const getPatientName = (localPatient: any) =>
  localPatient?.person?.personName?.display || localPatient?.display || localPatient?.person?.display;

/** One of the mother's PCS children, with whether they are already a patient here. */
const DependantRow: React.FC<DependantRowProps> = ({ dependant, hiePatient, parentPhoneNumber }) => {
  const { t } = useTranslation();
  const { pcsIdentifiers, pcsAttributeTypes } = useConfig<ExpressWorkflowConfig>();

  // Either type counts: a child linked through "Not in PCS" holds the temporary one, and the
  // module makes that id the participant's INDIVIDID, so they come back in this list too.
  const { linkedPatient, isLoading, mutate } = useLinkedPatientForParticipant(dependant.individualId, [
    pcsIdentifiers.studyParticipantID,
    pcsIdentifiers.studyTemporaryParticipantID,
  ]);

  // Same reconciliation the mother's banner does, so a linked child's flags don't go stale.
  // Called unconditionally, as hooks must be — the hook no-ops while `linkedPatient` is null,
  // which is what keeps unlinked rows free.
  useSyncStudyAttributes({
    participant: dependant,
    localPatient: linkedPatient,
    pbidsEnrollmentAttributeType: pcsAttributeTypes.pbidsEnrollmentStatus,
    cardseEnrollmentAttributeType: pcsAttributeTypes.cardseEnrollmentStatus,
    ...useStudySyncSnackbars(formatParticipantName(dependant)),
  });

  const openLinkModal = () => {
    const dispose = showModal('pcs-link-dependant-modal', {
      closeModal: () => dispose(),
      participant: dependant,
      hiePatient,
      parentPhoneNumber,
      onLinked: () => mutate(),
    });
  };

  const openUnlinkModal = () => {
    const dispose = showModal('pcs-delink-participant-modal', {
      closeModal: () => dispose(),
      localPatient: linkedPatient,
      studyParticipantId: dependant.individualId,
      participantName: formatParticipantName(dependant),
      onDelinked: () => mutate(),
    });
  };

  return (
    <div className={styles.pcsTile}>
      <div className={styles.pcsRow}>
        <span className={styles.pcsName}>{formatParticipantName(dependant)}</span>
        {linkedPatient && (
          <Tag className={styles.enrollmentTag} type="green" size="sm">
            {t('linked', 'Linked')}
          </Tag>
        )}
      </div>

      <div className={styles.pcsRow}>
        <span className={styles.genderIcon}>
          {GENDER_ICONS[dependant.sex]}
          <span>{SEX_LABELS[dependant.sex]}</span>
        </span>
        {dependant.dateOfBirth && (
          <>
            <span className={styles.separator}>&middot;</span>
            <span>{age(dependant.dateOfBirth)}</span>
          </>
        )}
      </div>

      <div className={styles.pcsRow}>
        <span className={styles.pcsFieldLabel}>{t('individualId', 'Individual ID')}:</span>
        <span>{dependant.individualId}</span>
      </div>

      {linkedPatient && (
        <div className={styles.pcsRow}>
          <span className={styles.pcsFieldLabel}>{t('emrPatient', 'EMR patient')}:</span>
          <span>{getPatientName(linkedPatient) || '--'}</span>
        </div>
      )}

      {/* Nothing is rendered while the lookup is in flight: showing the link action first
          would flash it on every row and invite a misclick on a child already registered. */}
      {!isLoading && (
        <div className={styles.pcsTileActions}>
          {linkedPatient ? (
            <Button kind="danger--ghost" size="sm" renderIcon={Unlink} onClick={openUnlinkModal}>
              {t('unlink', 'Unlink')}
            </Button>
          ) : (
            <Button kind="tertiary" size="sm" renderIcon={LinkIcon} onClick={openLinkModal}>
              {t('linkDependant', 'Link dependant')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default DependantRow;
