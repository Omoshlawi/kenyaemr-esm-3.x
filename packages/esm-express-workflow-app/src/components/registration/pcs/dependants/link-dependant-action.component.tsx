import React, { useMemo } from 'react';
import { Button } from '@carbon/react';
import { Link as LinkIcon, Unlink } from '@carbon/react/icons';
import { showModal, useConfig, type Patient } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { type ExpressWorkflowConfig } from '../../../../config-schema';
import { getDependentsFromContacts } from '../../dependants/dependants.resource';

type LinkDependantActionProps = {
  dependant: ReturnType<typeof getDependentsFromContacts>[number];
  isLocal: boolean;
  localPatient?: Patient;
  /** The parent's PCS individual ID. Absent when the parent is not linked to PCS. */
  motherIndividualId?: string;
  parentPhoneNumber?: string;
  /** Fires after a link or an unlink — both want the row's cached lookup dropped. */
  onLinkChanged?: () => void;
};

const LinkDependantAction: React.FC<LinkDependantActionProps> = ({
  dependant,
  isLocal,
  localPatient,
  motherIndividualId,
  parentPhoneNumber,
  onLinkChanged,
}) => {
  const { t } = useTranslation();
  const {
    pcsIdentifiers: { studyParticipantID, studyTemporaryParticipantID },
  } = useConfig<ExpressWorkflowConfig>();

  const [paticipantId, temporaryId] = useMemo(() => {
    return [
      localPatient?.identifiers?.find((id) => id.identifierType?.uuid === studyParticipantID)?.identifier,
      localPatient?.identifiers?.find((id) => id.identifierType?.uuid === studyTemporaryParticipantID)?.identifier,
    ];
  }, [localPatient?.identifiers, studyParticipantID, studyTemporaryParticipantID]);

  const openLinkModal = () => {
    const dispose = showModal('pcs-link-dependant-modal', {
      closeModal: () => dispose(),
      dependant,
      parentPhoneNumber,
      motherIndividualId,
      onLinked: onLinkChanged,
    });
  };

  const linkedId = paticipantId ?? temporaryId;

  if (linkedId) {
    const openDelinkModal = () => {
      const dispose = showModal('pcs-delink-participant-modal', {
        closeModal: () => dispose(),
        localPatient,
        studyParticipantId: linkedId,
        // Void the type this row actually holds — the hide check accepts either, so
        // defaulting to the permanent one would silently void nothing for a temporary ID.
        identifierTypeUuid: paticipantId ? studyParticipantID : studyTemporaryParticipantID,
        onDelinked: onLinkChanged,
      });
    };

    return (
      <Button size="sm" kind="danger--ghost" renderIcon={Unlink} onClick={openDelinkModal}>
        {t('unlink', 'Unlink')}
      </Button>
    );
  }

  // The modal lists the mother's PCS dependants, so without her study ID there is nothing to
  // query — link the mother in the PCS pane first.
  if (!motherIndividualId) {
    return null;
  }

  return (
    <Button size="sm" kind="tertiary" renderIcon={LinkIcon} onClick={openLinkModal}>
      {t('pcsLink', 'PCS Link')}
    </Button>
  );
};

export default LinkDependantAction;
