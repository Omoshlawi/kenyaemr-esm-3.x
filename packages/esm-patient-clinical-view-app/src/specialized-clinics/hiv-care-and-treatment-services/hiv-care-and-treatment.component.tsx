import { Layer, Tab, TabList, TabPanel, TabPanels, Tabs, TabsSkeleton } from '@carbon/react';
import {
  AssignedExtension,
  ErrorState,
  Extension,
  ExtensionSlot,
  useAssignedExtensions,
  usePatient,
} from '@openmrs/esm-framework';
import { ComponentContext } from '@openmrs/esm-framework/src/internal';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

type HivCareAndTreatmentProps = {
  patientUuid: string;
};
const hivCareAndTreatmentTabsExtensionSlotName = 'hiv-care-and-treatment-tabs-extension-slot';
const HivCareAndTreatment = ({ patientUuid }: HivCareAndTreatmentProps) => {
  const { t } = useTranslation();
  const { patient, isLoading, error } = usePatient(patientUuid);
  const state = useMemo(() => ({ patientUuid, patient }), [patientUuid, patient]);
  const assignedExtensions = useAssignedExtensions(hivCareAndTreatmentTabsExtensionSlotName);
  const sortedExtensions = useMemo<Array<AssignedExtension>>(() => {
    return [...assignedExtensions].sort(
      (a: AssignedExtension & { order?: number }, b: AssignedExtension & { order?: number }) =>
        (a.order ?? Infinity) - (b.order ?? Infinity),
    );
  }, [assignedExtensions]);
  if (isLoading) {
    return <TabsSkeleton />;
  }

  if (error) {
    return <ErrorState headerTitle={t('hiveCareAndTreatment', 'HIV Care and Treatment')} error={error} />;
  }
  return (
    <Layer>
      <Tabs>
        <TabList contained>
          {sortedExtensions.map((ext) => (
            <Tab key={ext.name}>{t(ext.meta.title)}</Tab>
          ))}
        </TabList>
        <TabPanels>
          {sortedExtensions.map((ext) => (
            <TabPanel key={ext.name}>
              <ComponentContext.Provider
                key={ext.id}
                value={{
                  featureName: ext.meta.featureName,
                  moduleName: ext.moduleName,
                  extension: {
                    extensionId: ext.id,
                    extensionSlotName: hivCareAndTreatmentTabsExtensionSlotName,
                    extensionSlotModuleName: ext.moduleName,
                  },
                }}>
                <Extension state={state} />
              </ComponentContext.Provider>
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </Layer>
  );
};

export default HivCareAndTreatment;
