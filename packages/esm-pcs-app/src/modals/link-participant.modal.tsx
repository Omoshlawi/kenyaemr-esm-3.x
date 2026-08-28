import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  InlineLoading,
  InlineNotification,
  ModalBody,
  ModalFooter,
  ModalHeader,
  StructuredListBody,
  StructuredListCell,
  StructuredListRow,
  StructuredListWrapper,
} from '@carbon/react';
import { showSnackbar, useConfig } from '@openmrs/esm-framework';

import { type PcsConfig } from '../config-schema';
import { useIdentifierTypeUuids } from '../resources/use-identifier-type-uuids';
import { formatParticipantName } from '../resources/pcs.resource';
import { linkParticipantToPatient } from '../resources/link-participant.resource';
import { type PcsParticipant, type PcsSearchSubject } from '../types';
import styles from './link-participant.scss';

interface LinkParticipantModalProps {
  closeModal: () => void;
  subject: PcsSearchSubject;
  participant: PcsParticipant;
  onLinked?: () => void;
}

const LinkParticipantModal: React.FC<LinkParticipantModalProps> = ({ closeModal, subject, participant, onLinked }) => {
  const { t } = useTranslation();
  const uuids = useIdentifierTypeUuids();
  const { pcsIdentifiers, pcsAttributeTypes } = useConfig<PcsConfig>();
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Written as booleans; shown as Yes/No because that is what a person reads.
  const yesNo = (flag: boolean) => (flag ? t('yes', 'Yes') : t('no', 'No'));

  const rows: Array<[string, string]> = [
    [t('studyParticipantId', 'Study participant ID'), participant.individualId],
    [t('pbidsEnrollment', 'PBIDS enrollment'), yesNo(participant.pbidsEnrolled)],
    [t('cardseEnrollment', 'CARDSE enrollment'), yesNo(participant.cardse)],
  ];

  const handleLink = async () => {
    setError(null);
    setIsLinking(true);
    try {
      await linkParticipantToPatient({
        subject,
        participant,
        studyParticipantIdentifierType: pcsIdentifiers.studyParticipantID,
        pbidsEnrollmentAttributeType: pcsAttributeTypes.pbidsEnrollmentStatus,
        cardseEnrollmentAttributeType: pcsAttributeTypes.cardseEnrollmentStatus,
        uuids,
      });
      showSnackbar({
        title: t('participantLinked', 'Records linked'),
        subtitle: t('participantLinkedSubtitle', 'The patient is now linked to PCS participant {{individualId}}.', {
          individualId: participant.individualId,
        }),
        kind: 'success',
        isLowContrast: true,
      });
      onLinked?.();
      closeModal();
    } catch (e: any) {
      // Surface the server's own wording — a duplicate study ID or a concept-format
      // attribute type both come back with a message worth reading.
      const message =
        e?.responseBody?.error?.message ??
        e?.message ??
        t('participantLinkFailedSubtitle', 'The patient record could not be updated.');
      setError(message);
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('linkToPcsParticipant', 'Link to PCS participant')} />
      <ModalBody>
        <div className={styles.comparison}>
          <div className={styles.side}>
            <span className={styles.sideLabel}>{t('emrPatient', 'EMR patient')}</span>
            <span className={styles.sideValue}>{subject.name}</span>
          </div>
          <div className={styles.side}>
            <span className={styles.sideLabel}>{t('pcsParticipant', 'PCS participant')}</span>
            <span className={styles.sideValue}>{formatParticipantName(participant)}</span>
          </div>
        </div>

        <p className={styles.willWrite}>{t('willBeWritten', 'The following will be written to the patient record')}</p>

        <StructuredListWrapper isCondensed selection={false}>
          <StructuredListBody>
            {rows.map(([label, value]) => (
              <StructuredListRow key={label}>
                <StructuredListCell>{label}</StructuredListCell>
                <StructuredListCell className={styles.value}>{value}</StructuredListCell>
              </StructuredListRow>
            ))}
          </StructuredListBody>
        </StructuredListWrapper>

        {subject.source === 'hie' && (
          <p className={styles.note}>
            {t('patientWillBeCreated', 'This patient is not registered here yet and will be created first.')}
          </p>
        )}

        {error && (
          <InlineNotification
            className={styles.notification}
            kind="error"
            lowContrast
            hideCloseButton
            title={t('participantLinkFailed', 'Could not link records')}
            subtitle={error}
          />
        )}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal} disabled={isLinking}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="primary" onClick={handleLink} disabled={isLinking}>
          {isLinking ? (
            <InlineLoading description={t('linkingRecords', 'Linking records...')} />
          ) : (
            t('linkRecords', 'Link records')
          )}
        </Button>
      </ModalFooter>
    </>
  );
};

export default LinkParticipantModal;
