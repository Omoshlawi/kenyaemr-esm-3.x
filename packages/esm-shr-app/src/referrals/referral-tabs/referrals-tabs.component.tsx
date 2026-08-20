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
      const [emtResult, facilityResult] = await Promise.allSettled([pullEmmegencyCases(), pullFacilityReferrals()]);

      if (emtResult.status === 'fulfilled') {
        mutate((key) => typeof key === 'string' && key.startsWith(`${restBaseUrl}/kenyaemril/emt-cases`));
      }

      if (emtResult.status === 'fulfilled' && facilityResult.status === 'fulfilled') {
        showSnackbar({
          title: t('success', 'Success'),
          subtitle: t('referralsPulledSuccessfully', 'Referrals pulled successfully'),
          kind: 'success',
          isLowContrast: true,
        });
        return;
      }

      if (emtResult.status === 'rejected' && facilityResult.status === 'rejected') {
        console.error('Failed to pull EMT cases and facility referrals', emtResult.reason, facilityResult.reason);
        showSnackbar({
          title: t('unableToPullReferrals', 'Unable to pull referrals'),
          subtitle: t(
            'errorPullingBothReferralsFriendly',
            'We could not update EMT cases or facility referrals. Please try again in a moment.',
          ),
          kind: 'error',
          isLowContrast: true,
        });
        throw new Error('Both pull requests failed');
      }

      if (emtResult.status === 'rejected') {
        console.error('Failed to pull EMT cases', emtResult.reason);
        showSnackbar({
          title: t('someReferralsUpdated', 'Some referrals updated'),
          subtitle: t(
            'emtCasesPullFailedFacilitySucceededFriendly',
            'Facility referrals were updated, but EMT cases could not be pulled. Please try again.',
          ),
          kind: 'warning',
          isLowContrast: true,
        });
        return;
      }

      console.error(
        'Failed to pull facility referrals',
        facilityResult.status === 'rejected' ? facilityResult.reason : 'Unknown reason',
      );
      showSnackbar({
        title: t('someReferralsUpdated', 'Some referrals updated'),
        subtitle: t(
          'facilityReferralsPullFailedEmtSucceededFriendly',
          'EMT cases were updated, but facility referrals could not be pulled. Please try again.',
        ),
        kind: 'warning',
        isLowContrast: true,
      });
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
            <Tab className={styles.tab}>{t('ambulance', 'Ambulance (EMT Cases)')}</Tab>
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
