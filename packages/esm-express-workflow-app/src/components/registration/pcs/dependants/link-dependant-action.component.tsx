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
  /**
   * Fires after a link or an unlink. A link passes the resolved patient so the row can cache
   * it directly; an unlink passes nothing, meaning "re-resolve".
   */
  onLinkChanged?: (localPatient?: any) => void;
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

  // Only a permanent participant ID may be unlinked — it is the one the registrar chose.
  if (paticipantId) {
    const openDelinkModal = () => {
      const dispose = showModal('pcs-delink-participant-modal', {
        closeModal: () => dispose(),
        localPatient,
        studyParticipantId: paticipantId,
        onDelinked: onLinkChanged,
      });
    };

    return (
      <Button size="sm" kind="danger--ghost" renderIcon={Unlink} onClick={openDelinkModal}>
        {t('unlink', 'Unlink')}
      </Button>
    );
  }

  // A temporary ID was issued and is owned by PCS: the row counts as linked, so it is not
  // offered for linking again, but removing it here would drop something the registry
  // generated without PCS being told.
  if (temporaryId) {
    return null;
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
