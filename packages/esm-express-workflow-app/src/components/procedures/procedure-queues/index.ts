import { getSyncLifecycle } from '@openmrs/esm-framework';
import ProcedureQueues from './procedure-queues.component';
import ProcedureFormExtras from './procedure-form-extras.component';

const moduleName = '@kenyaemr/esm-express-workflow-app';

const options = {
  featureName: 'express-workflow',
  moduleName,
};

export const procedureQueues = getSyncLifecycle(ProcedureQueues, options);
export const procedureFormExtras = getSyncLifecycle(ProcedureFormExtras, options);
