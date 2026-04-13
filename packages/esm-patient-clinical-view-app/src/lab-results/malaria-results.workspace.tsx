import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Workspace2, type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { type Order } from '@openmrs/esm-patient-common-lib';
import MalariaBloodSmearResultsForm from './malaria-blood-smear-results.component';
import MalariaRapidTestResultsForm from './malaria-rapid-test-results.component';

type MalariaResultsWorkspaceProps = {
  order: Order;
};

const MALARIA_ORDER_TYPES = {
  BLOOD_SMEAR: '66621368-15ab-4d27-b920-9df6f6356f29',
  RAPID_TEST: '1643AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
};

const MalariaResultsWorkspace: React.FC<Workspace2DefinitionProps<MalariaResultsWorkspaceProps, object, object>> = ({
  workspaceProps: { order },
  closeWorkspace,
}) => {
  const { t } = useTranslation();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  return (
    <Workspace2 title={t('malariaResults', 'Malaria Results')} hasUnsavedChanges={hasUnsavedChanges}>
      {order.concept.uuid === MALARIA_ORDER_TYPES.BLOOD_SMEAR && (
        <MalariaBloodSmearResultsForm
          order={order}
          closeWorkspace={closeWorkspace}
          setHasUnsavedChanges={setHasUnsavedChanges}
        />
      )}
      {order.concept.uuid === MALARIA_ORDER_TYPES.RAPID_TEST && (
        <MalariaRapidTestResultsForm order={order} closeWorkspace={closeWorkspace} />
      )}
    </Workspace2>
  );
};

export default MalariaResultsWorkspace;
