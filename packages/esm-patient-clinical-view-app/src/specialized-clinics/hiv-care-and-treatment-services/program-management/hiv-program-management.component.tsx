import { Layer, Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import React, { FC } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './program-management.scss';
import ARTTherappy from './art-therapy.component';
import ServiceDeliveryModel from './service-delivery-model.component';
import TransferOut from './transfer-out.component';
import { CardHeader } from '@openmrs/esm-patient-common-lib';
import { FHIRResource } from '@openmrs/esm-framework';
import PatientTracing from '../defaulter-tracing/patient-tracing.component';
type HIVProgramManagmentProps = {
  patientUuid: string;
  patient: FHIRResource;
};
const HIVProgramManagment: FC<HIVProgramManagmentProps> = ({ patientUuid, patient }) => {
  const { t } = useTranslation();
  return (
    <Layer>
      <CardHeader title={t('programManagement', 'Program Management')}>
        <></>
      </CardHeader>
      <br />
      <Layer>
        <Tabs>
          <TabList scrollDebounceWait={200} contained>
            <Tab>{t('artTherapy', 'ART Therapy')}</Tab>
            <Tab>{t('serviceDeliveryModel', 'Service delivery model')}</Tab>
            <Tab>{t('transferOut', 'Transfer out')}</Tab>
            <Tab>{t('patientTracing', 'Patient tracing')}</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <ARTTherappy patientUuid={patientUuid} patient={patient} />
            </TabPanel>
            <TabPanel>
              <ServiceDeliveryModel patientUuid={patientUuid} patient={patient} />
            </TabPanel>
            <TabPanel>
              <TransferOut patientUuid={patientUuid} patient={patient} />
            </TabPanel>
            <TabPanel>
              <PatientTracing patientUuid={patientUuid} patient={patient} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Layer>
    </Layer>
  );
};

export default HIVProgramManagment;
