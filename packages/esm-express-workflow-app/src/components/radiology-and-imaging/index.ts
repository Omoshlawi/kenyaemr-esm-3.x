import { getAsyncLifecycle } from '@openmrs/esm-framework';

import { moduleName } from '../../constants';

const options = {
  featureName: 'express-workflow',
  moduleName,
};

export const radiologyAndImagingDashboard = getAsyncLifecycle(
  () => import('./radiology-and-imaging.component'),
  options,
);
// t('radiologyAndImaging', 'Radiology and Imaging')
export const radiologyAndImagingLeftPanelLink = getAsyncLifecycle(
  () =>
    import('@openmrs/esm-patient-common-lib').then((m) => ({
      default: m.createDashboardLink({
        path: 'radiology-and-imaging',
        title: 'radiologyAndImaging',
        icon: 'omrs-icon-user-xray',
      }),
    })),
  options,
);
