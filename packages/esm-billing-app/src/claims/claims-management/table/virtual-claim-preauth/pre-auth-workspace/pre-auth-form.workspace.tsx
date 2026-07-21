import React from 'react';
import { useTranslation } from 'react-i18next';
import { type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { type PreauthQueueItem, type PreauthDoctor } from '../../../../../billing-form/social-health-authority/type';
import PreauthFormView from './views/preauth-form.view';
import CancelPreauthView from './views/cancel-preauth.view';
import RemoveDoctorView from './views/remove-doctor.view';
import RequestDoctorApprovalView from './views/request-doctor-approval.view';

interface PreauthFormProps {
  item: PreauthQueueItem;
  isResubmit?: boolean;
  isElective?: boolean;
  isCancel?: boolean;
  isRemoveDoctor?: boolean;
  isRequestDoctorApproval?: boolean;
  doctor?: PreauthDoctor;
  mutate: () => void;
  workspaceTitle?: string;
}

const PreauthForm: React.FC<Workspace2DefinitionProps<PreauthFormProps, object, object>> = ({
  closeWorkspace,
  workspaceProps,
}) => {
  const { t } = useTranslation();
  const {
    item,
    isResubmit = false,
    isElective = false,
    isCancel = false,
    isRemoveDoctor = false,
    isRequestDoctorApproval = false,
    doctor,
    mutate,
  } = workspaceProps ?? {};
  const workspaceTitle = workspaceProps?.workspaceTitle ?? t('preauthForm', 'Pre-authorization Form');
  const onClose = () => closeWorkspace({ discardUnsavedChanges: true });

  if (isRemoveDoctor) {
    return (
      <RemoveDoctorView item={item} doctor={doctor} workspaceTitle={workspaceTitle} mutate={mutate} onClose={onClose} />
    );
  }

  if (isRequestDoctorApproval) {
    return (
      <RequestDoctorApprovalView
        item={item}
        doctor={doctor}
        workspaceTitle={workspaceTitle}
        mutate={mutate}
        onClose={onClose}
      />
    );
  }

  if (isCancel) {
    return <CancelPreauthView item={item} workspaceTitle={workspaceTitle} mutate={mutate} onClose={onClose} />;
  }

  return (
    <PreauthFormView
      item={item}
      isResubmit={isResubmit}
      isElective={isElective}
      workspaceTitle={workspaceTitle}
      mutate={mutate}
      onClose={onClose}
    />
  );
};

export default PreauthForm;
