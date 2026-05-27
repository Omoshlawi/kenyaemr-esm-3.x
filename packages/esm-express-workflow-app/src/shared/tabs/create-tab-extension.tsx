import { ExtensionSlot, FHIRResource } from '@openmrs/esm-framework';
import React from 'react';
import styles from './patient-summary-dashboard.scss';
export const createTabExtension = (extensionSlotName?: string) => {
  return function TabExtension(props: any) {
    return <TabWithExtensionSlot extensionSlotName={extensionSlotName} {...props} />;
  };
};

const TabWithExtensionSlot: React.FC<{
  extensionSlotName?: string;
  patientUuid: string;
  patient: FHIRResource;
  _meta?: {
    slot?: string;
    [key: string]: any;
  };
}> = ({ extensionSlotName, patientUuid, patient, _meta }) => {
  if (!_meta?.slot && !extensionSlotName) {
    console.warn(
      'No slot provided for TabExtension. Please provide a slot in the route meta or as an argument to createTabExtension.',
    );
    return null;
  }
  const { slot, ...others } = _meta || {};
  return (
    <ExtensionSlot
      name={_meta?.slot ?? (extensionSlotName as string)}
      state={{ patientUuid, patient, ...others }}
      className={styles.ewfExtensionSlot}
    />
  );
};
