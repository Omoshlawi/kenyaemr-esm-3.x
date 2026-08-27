import React, { useMemo } from 'react';
import { getDependentsFromContacts } from '../../dependants/dependants.resource';
import { useConfig, type Patient } from '@openmrs/esm-framework';
import { ExpressWorkflowConfig } from '../../../../config-schema';
import { Button } from '@carbon/react';
import { useTranslation } from 'react-i18next';
type LinkDependantActionProps = {
  dependant: ReturnType<typeof getDependentsFromContacts>[number];
  isLocal: boolean;
  localPatient?: Patient;
};
const LinkDependantAction: React.FC<LinkDependantActionProps> = ({ dependant, isLocal, localPatient }) => {
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

  if (paticipantId || temporaryId) {
    return null;
  }

  return (
    <Button size="sm" kind="tertiary">
      {t('pcsLink', 'PCS Link')}
    </Button>
  );
};

export default LinkDependantAction;
