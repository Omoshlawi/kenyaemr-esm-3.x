import React from 'react';
import { ReferralsHeader } from './header/referrals-header.component';
import ReferralTabs from './referrals/referral-tabs/referrals-tabs.component';

const ReferralWrap: React.FC = () => {
  return (
    <div className={`omrs-main-content`}>
      <ReferralsHeader />
      <ReferralTabs />
    </div>
  );
};

export default ReferralWrap;
