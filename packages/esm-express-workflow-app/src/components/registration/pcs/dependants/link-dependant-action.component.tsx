import React, { useMemo } from 'react';
import { Button } from '@carbon/react';
import { Link as LinkIcon } from '@carbon/react/icons';
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
  onLinked?: () => void;
};

const LinkDependantAction: React.FC<LinkDependantActionProps> = ({
  dependant,
  isLocal,
  localPatient,
  motherIndividualId,
  parentPhoneNumber,
  onLinked,
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
      onLinked,
    });
  };

  if (paticipantId || temporaryId) {
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
