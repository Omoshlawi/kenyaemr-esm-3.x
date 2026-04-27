import { Layer, Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import { CardHeader, FHIRResource } from '@openmrs/esm-framework';
import React, { FC } from 'react';
import { useTranslation } from 'react-i18next';
import ContactList from '../../../contact-list/contact-list.component';

type PatnerNoficationServiceProps = {
  patientUuid: string;
  patient: FHIRResource;
};
const HivPatnerNoficationService: FC<PatnerNoficationServiceProps> = ({ patient, patientUuid }) => {
  const { t } = useTranslation();

  return <ContactList patientUuid={patientUuid} />;
  /*

  return (
    <Layer>
      <CardHeader title={t('patnerNotificationServices', 'Partner Notification Services')}>
        <></>
      </CardHeader>
      <br />
      <Layer>
        <Tabs>
          <TabList scrollDebounceWait={200} contained>
            <Tab>{t('patnerNotification', 'PatnerNotification')}</Tab>
            <Tab>{t('contactTracing', 'Contact Tracing')}</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <ContactList patientUuid={patientUuid} />
            </TabPanel>
            <TabPanel>
              <div>Contact Tracing</div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Layer>
    </Layer>
  );

   */
};

export default HivPatnerNoficationService;
