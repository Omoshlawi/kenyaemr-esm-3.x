import React from 'react';
import { Button, Tag } from '@carbon/react';
import { Link as LinkIcon } from '@carbon/react/icons';
import { age, useConfig } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import styles from '../pcs.scss';
import { type ExpressWorkflowConfig } from '../../../../config-schema';
import { formatParticipantName } from '../resources/pcs.resource';
import { useLinkedPatientForParticipant } from '../resources/link-participant.resource';
import { type PcsParticipant } from '../pcs.types';
import { GENDER_ICONS, SEX_LABELS } from './participant-details.component';

interface DependantRowProps {
  dependant: PcsParticipant;
}

const getPatientName = (localPatient: any) =>
  localPatient?.person?.personName?.display || localPatient?.display || localPatient?.person?.display;

/** One of the mother's PCS children, with whether they are already a patient here. */
const DependantRow: React.FC<DependantRowProps> = ({ dependant }) => {
  const { t } = useTranslation();
  const { pcsIdentifiers } = useConfig<ExpressWorkflowConfig>();

  // Either type counts: a child linked through "Not in PCS" holds the temporary one, and the
  // module makes that id the participant's INDIVIDID, so they come back in this list too.
  const { linkedPatient, isLoading } = useLinkedPatientForParticipant(dependant.individualId, [
    pcsIdentifiers.studyParticipantID,
    pcsIdentifiers.studyTemporaryParticipantID,
  ]);

  // TODO(pcs): create the patient locally, then stamp this participant's own individualId
  // through `stampAndCheckIn`. No temporary id is involved — PCS already knows this child.
  const createAndLink = () => {};

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

      {/* Neither is rendered while the lookup is in flight: showing the action first would
          flash it on every row and invite a misclick on a child who is already registered. */}
      {!isLoading && !linkedPatient && (
        <div className={styles.pcsTileActions}>
          <Button kind="tertiary" size="sm" renderIcon={LinkIcon} onClick={createAndLink}>
            {t('createAndLink', 'Create & link')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default DependantRow;
