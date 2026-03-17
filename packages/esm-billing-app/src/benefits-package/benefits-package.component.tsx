import React from 'react';
import { useTranslation } from 'react-i18next';
import { CardHeader } from '@openmrs/esm-patient-common-lib';
import { Layer, Tile, Tabs, TabList, Tab, TabPanels, TabPanel } from '@carbon/react';
import { Task, Upload } from '@carbon/react/icons';

import BenefitsTable from './table/benefits-table.component';
import Benefits from './benefits/benefits.component';

import styles from './benefits-package.scss';

type BenefitsPackageProps = {
  patientUuid: string;
};

const BenefitsPackage: React.FC<BenefitsPackageProps> = ({ patientUuid }) => {
  const { t } = useTranslation();
  return (
    <Layer className={styles.container}>
      <Tile>
        <CardHeader title={t('shaBenefits', 'SHA benefits')} children={''} />
      </Tile>
      <div className={styles.tabs}>
        <Tabs>
          <TabList contained activation="manual" aria-label="List of panels">
            <Tab renderIcon={Task}>{t('eligibleBenefits', 'Eligible benefits')}</Tab>
            <Tab renderIcon={Upload}>{t('preauthRequest', 'Preauth requests')}</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <Benefits />
            </TabPanel>
            <TabPanel>
              <BenefitsTable patientUuid={patientUuid} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </Layer>
  );
};

export default BenefitsPackage;
