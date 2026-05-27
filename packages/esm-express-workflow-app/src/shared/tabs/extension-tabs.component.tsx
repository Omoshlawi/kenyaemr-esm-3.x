import { Layer, Tab, TabList, TabPanel, TabPanels, Tabs, TabsSkeleton } from '@carbon/react';
import { ErrorState, Extension, translateFrom, usePatient } from '@openmrs/esm-framework';
import { ComponentContext, useExtensionSlot } from '@openmrs/esm-framework/src/internal';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

type ExtensionTabsProps = {
  extensionSlotName: string;
  patientUuid: string;
};

const ExtensionTabs: React.FC<ExtensionTabsProps> = ({ extensionSlotName, patientUuid }) => {
  const { t } = useTranslation();
  const { patient, isLoading, error } = usePatient(patientUuid);
  const state = useMemo(() => ({ patientUuid, patient }), [patientUuid, patient]);

  const { extensions, extensionSlotModuleName } = useExtensionSlot(extensionSlotName, state);
  if (isLoading) {
    return <TabsSkeleton />;
  }

  if (error) {
    return <ErrorState headerTitle={t('consultation', 'Consultation')} error={error} />;
  }

  return (
    <Layer>
      <Tabs>
        <TabList contained>
          {extensions.map((ext) => (
            <Tab key={ext.name}>{translateFrom(extensionSlotModuleName, ext.meta.title, ext.meta.title)}</Tab>
          ))}
        </TabList>
        <TabPanels
          data-extension-slot-name={extensionSlotName}
          data-extension-slot-module-name={extensionSlotModuleName}>
          {extensions.map((ext) => (
            <TabPanel key={ext.name}>
              <ComponentContext.Provider
                key={ext.id}
                value={{
                  featureName: ext.meta.featureName,
                  moduleName: ext.moduleName,
                  extension: {
                    extensionId: ext.id,
                    extensionSlotName: extensionSlotName,
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

export default ExtensionTabs;
