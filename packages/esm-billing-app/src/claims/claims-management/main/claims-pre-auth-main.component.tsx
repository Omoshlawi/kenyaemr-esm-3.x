import { ContentSwitcher, Switch } from '@carbon/react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClaimsManagementHeader } from '../header/claims-header.component';
import PreAuthTable from '../table/pre-auth-table.component';
import styles from './claims-preauth.scss';

const ClaimsManagementPreAuthRequest = () => {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<'active' | 'draft' | 'cancelled' | 'entered-in-error' | 'all'>(
    'all',
  );

  return (
    <div className="omrs-main-content">
      <ClaimsManagementHeader title={t('preAuthRequets', 'Pre-Auth Requests')} />

      <div className={styles.headerContainer}>
        <ContentSwitcher onChange={({ name }) => setStatusFilter(name)} className={styles.contentSwitch}>
          <Switch name="all" text={t('all', 'All')} />
          <Switch name="active" text={t('active', 'Active')} />
          <Switch name="draft" text={t('draft', 'Draft')} />
          <Switch name="cancelled" text={t('cancelled', 'Cancelled')} />
          <Switch name="entered-in-error" text={t('enteredInError', 'Entered in error')} />
        </ContentSwitcher>
      </div>
      <PreAuthTable status={statusFilter} />
    </div>
  );
};

export default ClaimsManagementPreAuthRequest;
