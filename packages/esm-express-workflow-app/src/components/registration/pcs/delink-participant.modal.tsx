import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, InlineNotification, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { showSnackbar, useConfig } from '@openmrs/esm-framework';

import { type ExpressWorkflowConfig } from '../../../config-schema';
import { delinkParticipant } from './link-participant.resource';

interface DelinkParticipantModalProps {
  closeModal: () => void;
  localPatient: any;
  studyParticipantId: string;
  participantName?: string;
  onDelinked?: () => void;
}

const DelinkParticipantModal: React.FC<DelinkParticipantModalProps> = ({
  closeModal,
  localPatient,
  studyParticipantId,
  participantName,
  onDelinked,
}) => {
  const { t } = useTranslation();
  const { pcsIdentifiers, pcsAttributeTypes } = useConfig<ExpressWorkflowConfig>();
  const [isDelinking, setIsDelinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelink = async () => {
    setError(null);
    setIsDelinking(true);
    try {
      await delinkParticipant({
        localPatient,
        studyParticipantIdentifierType: pcsIdentifiers.studyParticipantID,
        pbidsEnrollmentAttributeType: pcsAttributeTypes.pbidsEnrollmentStatus,
        cardseEnrollmentAttributeType: pcsAttributeTypes.cardseEnrollmentStatus,
      });
      showSnackbar({
        title: t('participantDelinked', 'Records unlinked'),
        subtitle: t('participantDelinkedSubtitle', 'The study participant ID and study attributes were removed.'),
        kind: 'success',
        isLowContrast: true,
      });
      onDelinked?.();
      closeModal();
    } catch (e: any) {
      setError(
        e?.responseBody?.error?.message ??
          e?.message ??
          t('participantDelinkFailedSubtitle', 'The patient record could not be updated.'),
      );
    } finally {
      setIsDelinking(false);
    }
  };

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('delinkFromPcs', 'Unlink from PCS')} />
      <ModalBody>
        <p>
          {t('delinkConfirmation', 'Remove the link between this patient and PCS participant {{individualId}}?', {
            individualId: participantName ? `${studyParticipantId} (${participantName})` : studyParticipantId,
          })}
        </p>
        <p>
          {t(
            'delinkWhatIsRemoved',
            'The study participant ID and both enrollment status attributes will be removed from the patient record.',
          )}
        </p>

        {error && (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            title={t('participantDelinkFailed', 'Could not unlink records')}
            subtitle={error}
          />
        )}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal} disabled={isDelinking}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="danger" onClick={handleDelink} disabled={isDelinking}>
          {isDelinking ? <InlineLoading description={t('unlinking', 'Unlinking...')} /> : t('delink', 'Delink')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default DelinkParticipantModal;
