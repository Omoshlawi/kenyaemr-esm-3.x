import { getAsyncLifecycle, getSyncLifecycle } from '@openmrs/esm-framework';
import { createLeftPanelLink } from '../../left-pannel-link.component';
import { moduleName } from '../../constants';

// t('globalProperty','Global property')
export const globalPropertyLink = getSyncLifecycle(
  createLeftPanelLink({ title: 'globalProperty', name: 'global-property' }),
  { moduleName, featureName: 'global-property' },
);

export const globalPropertyDashboard = getAsyncLifecycle(
  () => import('./dashboard/global-property-dashboard.component'),
  { moduleName, featureName: 'global-property' },
);
