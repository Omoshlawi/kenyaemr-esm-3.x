import React from 'react';
import ExtensionTabs from '../../../shared/tabs/extension-tabs.component';
import { Layer } from '@carbon/react';
import { ExtensionSlot } from '@openmrs/esm-framework';
import styles from './clinical-encounter.scss';
type ClinicalEncounterProps = {
  patientUuid: string;
};

const ClinicalEncounter: React.FC<ClinicalEncounterProps> = ({ patientUuid }) => {
  return (
    <div>
      <ExtensionSlot name="clinical-encounter-actions-slot" className={styles.actionsSlot} state={{ patientUuid }} />
      <ExtensionTabs extensionSlotName="clinical-encounter-tabs-slot" patientUuid={patientUuid} />
    </div>
  );
};

export default ClinicalEncounter;
