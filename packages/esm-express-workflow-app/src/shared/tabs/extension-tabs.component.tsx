import React, { useState } from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@carbon/react';
import { ExtensionSlot } from '@openmrs/esm-framework';

export type ExtensionTabItem = {
  label: React.ReactNode;
  icon?: React.ComponentType<unknown>;
  slotName: string;
  slotClassName?: string;
};

type ExtensionTabsProps = {
  items: Array<ExtensionTabItem>;
  state?: Record<string, unknown>;
  contained?: boolean;
};

const ExtensionTabs: React.FC<ExtensionTabsProps> = ({ items, state, contained = true }) => {
  const [activeTab, setActiveTab] = useState<number>(0);
  return (
    <Tabs selectedIndex={activeTab} onChange={({ selectedIndex }) => setActiveTab(selectedIndex)}>
      <TabList contained={contained}>
        {items.map((item) => (
          <Tab key={item.slotName} renderIcon={item.icon}>
            {item.label}
          </Tab>
        ))}
      </TabList>
      <TabPanels>
        {items.map((item, index) => (
          <TabPanel key={item.slotName}>
            {index === activeTab ? (
              <ExtensionSlot className={item.slotClassName} name={item.slotName} state={state} />
            ) : null}
          </TabPanel>
        ))}
      </TabPanels>
    </Tabs>
  );
};

export default ExtensionTabs;
