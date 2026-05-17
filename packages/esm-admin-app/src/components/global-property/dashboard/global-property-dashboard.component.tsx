import React from 'react';
import { PageHeader, FacilityPictogram } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';

import GlobalPropertyTable from '../table/global-property-table.component';
import styles from './global-property-dashboard.scss';

const GlobalPropertyDashboard: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div>
      <PageHeader
        className={styles.pageHeader}
        title={t('globalProperty', 'Global Property')}
        illustration={<FacilityPictogram />}
      />
      <GlobalPropertyTable />
    </div>
  );
};

export default GlobalPropertyDashboard;
