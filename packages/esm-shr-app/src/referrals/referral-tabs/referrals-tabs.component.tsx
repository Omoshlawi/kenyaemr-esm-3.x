import { Button, InlineLoading, Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import { AirlineManageGates, UpdateNow } from '@carbon/react/icons';
import { isDesktop, launchWorkspace2, restBaseUrl, showSnackbar, useLayoutType } from '@openmrs/esm-framework';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { mutate } from 'swr';
import useSWRMutation from 'swr/mutation';

import ReferralTable from '../referrals.component';
import { pullEmmegencyCases, pullFacilityReferrals } from '../refferals.resource';
import EmtReferrals from './emt-referrals.component';
import styles from './referrals-tabs.scss';

const ReferralTabs: React.FC = () => {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const responsiveSize = isDesktop(layout) ? 'md' : 'sm';
  const [activeTabIndex, setActiveTabIndex] = React.useState<number>(0);

  const { trigger: pullReferrals, isMutating: isLoadingFacilityReferrals } = useSWRMutation(
    `${restBaseUrl}/kenyaemril/pullReferrals`,
    async () => {
      await pullEmmegencyCases();
      return await pullFacilityReferrals();
    },
    {
      onSuccess: () => {
        mutate((key) => typeof key === 'string' && key.startsWith(`${restBaseUrl}/kenyaemril/emt-cases`));
        showSnackbar({
          title: t('success', 'Success'),
          subtitle: t('referralsPulledSuccessfully', 'Referrals pulled successfully'),
          kind: 'success',
          isLowContrast: true,
        });
      },
      onError: (error) => {
        showSnackbar({
          title: t('errorPullingReferrals', 'Error pulling referrals'),
          subtitle: error?.message || t('unknownError', 'An unknown error occurred'),
          kind: 'error',
          isLowContrast: true,
        });
      },
    },
  );

  const handleReferral = () => {
    launchWorkspace2('facility-referral-form', {
      workspaceTitle: t('referralForm', 'Referral Form'),
    });
  };

  const handleTabChange = ({ selectedIndex }: { selectedIndex: number }) => {
    setActiveTabIndex(selectedIndex);
  };

  return (
    <div className={styles.referralsList} data-testid="referralsList-list">
      <div className={styles.actionBtn}>
        <Button
          kind="primary"
          renderIcon={UpdateNow}
          iconDescription={t('pullReferrals', 'Pull Referrals')}
          onClick={pullReferrals as any}
          className={styles.actionBtn}
          size={responsiveSize}
          disabled={isLoadingFacilityReferrals}>
          {isLoadingFacilityReferrals ? (
            <InlineLoading description={t('pullingReferrals', 'Pulling referrals...')} status="active" />
          ) : (
            t('pullReferrals', 'Pull Referrals')
          )}
        </Button>
        <Button
          kind="tertiary"
          renderIcon={(props) => <AirlineManageGates size={20} {...props} />}
          onClick={handleReferral}
          iconDescription={t('referralPatient', 'Refer Patient')}
          size={responsiveSize}>
          {t('referralPatient', 'Refer Patient')}
        </Button>
      </div>
      <div className={styles.tabsContainer}>
        <Tabs selectedIndex={activeTabIndex} onChange={handleTabChange}>
          <TabList aria-label="Referrals tabs" contained>
            <Tab className={styles.tab}>{t('fromCommunity', 'From Community')}</Tab>
            <Tab className={styles.tab}>{t('fromFacility', 'From Facility')}</Tab>
            <Tab className={styles.tab}>{t('completed', 'Completed')}</Tab>
            <Tab className={styles.tab}>{t('emtCases', 'EMT Cases')}</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <ReferralTable status="active" />
            </TabPanel>
            <TabPanel>
              <ReferralTable status="active" />
            </TabPanel>
            <TabPanel>
              <ReferralTable status="completed" />
            </TabPanel>
            <TabPanel>
              <EmtReferrals />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </div>
  );
};

export default ReferralTabs;
