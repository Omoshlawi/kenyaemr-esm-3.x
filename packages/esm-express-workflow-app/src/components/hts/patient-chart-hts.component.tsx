import React, { FC } from 'react';
import ExtensionTabs from '../../shared/tabs/extension-tabs.component';
import { ExtensionSlot } from '@openmrs/esm-framework';
import styles from './hts.scss';

type PatientChartHiveTestingServicesProps = {
  patientUuid: string;
};
const PatientChartHiveTestingServices: FC<PatientChartHiveTestingServicesProps> = ({ patientUuid }) => {
  return (
    <div>
      <ExtensionSlot name="hts-actions-slot" className={styles.actionsSlot} state={{ patientUuid }} />
      <ExtensionTabs patientUuid={patientUuid} extensionSlotName="hiv-testing-services-tabs-slot" />
    </div>
  );
};

export default PatientChartHiveTestingServices;
