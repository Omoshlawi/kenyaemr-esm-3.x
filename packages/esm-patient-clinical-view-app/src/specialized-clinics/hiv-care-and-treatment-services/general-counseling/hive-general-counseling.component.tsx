import { Layer, Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import { CardHeader, FHIRResource } from '@openmrs/esm-framework';
import React, { FC } from 'react';
import { useTranslation } from 'react-i18next';
type HIVGeneralCounselingProps = {
  patientUuid: string;
  patient: FHIRResource;
};
const HIVGeneralCounseling: FC<HIVGeneralCounselingProps> = ({ patient, patientUuid }) => {
  const { t } = useTranslation();
  return (
    <Layer>
      <CardHeader title={t('generalCounseling', 'General Counseling')}>
        <></>
      </CardHeader>
      <br />
      <Layer>
        <Tabs>
          <TabList scrollDebounceWait={200} contained>
            <Tab>{t('mentalHealthAssessment', 'Mental Health Assessment')}</Tab>
            <Tab>{t('disclosure', 'Disclosure')}</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <div>Mental Health Assessment</div>
            </TabPanel>
            <TabPanel>
              <div>Disclosure</div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Layer>
    </Layer>
  );
};

export default HIVGeneralCounseling;
