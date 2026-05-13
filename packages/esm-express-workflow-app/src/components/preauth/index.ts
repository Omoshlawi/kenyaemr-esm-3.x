import { getAsyncLifecycle } from '@openmrs/esm-framework';
import { moduleName } from '../../constants';

const options = {
  featureName: 'express-workflow',
  moduleName,
};

export const preauthDashboard = getAsyncLifecycle(() => import('./preauth-dashboard.component'), options);

// t('careAuthorization', 'Care Authorizations')
export const preauthDashboardLink = getAsyncLifecycle(
  () =>
    import('@openmrs/esm-patient-common-lib').then((m) => ({
      default: m.createDashboardLink({
        path: 'preauthorization',
        title: 'careAuthorization',
        icon: 'omrs-icon-money',
      }),
    })),
  options,
);
