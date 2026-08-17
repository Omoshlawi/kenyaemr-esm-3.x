import React from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import { ActionableNotification, Button, ButtonSet, Form, InlineLoading } from '@carbon/react';
import { useLayoutType, Workspace2 } from '@openmrs/esm-framework';
import { type PreauthQueueItem, type PreauthDoctor } from '../../../../../../billing-form/social-health-authority/type';
import DoctorBanner from '../components/doctor-banner.component';
import { useRequestDoctorApproval } from '../hooks/use-request-doctor-approval';
import styles from '../pre-auth-form.scss';

interface RequestDoctorApprovalViewProps {
  item?: PreauthQueueItem;
  doctor?: PreauthDoctor;
  workspaceTitle: string;
  mutate?: () => void;
  onClose: () => void;
}

const RequestDoctorApprovalView: React.FC<RequestDoctorApprovalViewProps> = ({
  item,
  doctor,
  workspaceTitle,
  mutate,
  onClose,
}) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const { handleRequestDoctorApproval, isRequestingDoctor, requestDoctorError } = useRequestDoctorApproval({
    item,
    doctor,
    serviceType: item?.service_type,
    emergencyClaimId: item?.emergency_claim_id,
    mutate,
    onSuccess: onClose,
  });

  return (
    <Workspace2 title={workspaceTitle}>
      <Form className={styles.form}>
        <DoctorBanner item={item} doctor={doctor} />

        <div className={classNames(styles.inlineNotification, styles.electiveGuidance)}>
          <ActionableNotification
            kind="info"
            lowContrast
            hideCloseButton
            inline
            title={t('requestDoctorApprovalTitle', 'Request doctor approval')}
            subtitle={t(
              'requestDoctorApprovalBody',
              'This will send the doctor consent request to SHA for this preauthorization.',
            )}
          />
        </div>

        {requestDoctorError && (
          <div className={classNames(styles.inlineNotification, styles.submitError)}>
            <ActionableNotification kind="error" lowContrast inline hideCloseButton title={requestDoctorError} />
          </div>
        )}

        <ButtonSet className={classNames({ [styles.tablet]: isTablet, [styles.desktop]: !isTablet })}>
          <Button className={styles.button} kind="secondary" onClick={onClose} disabled={isRequestingDoctor}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button
            className={styles.button}
            kind="primary"
            disabled={isRequestingDoctor}
            onClick={handleRequestDoctorApproval}>
            {isRequestingDoctor ? (
              <InlineLoading description={t('requesting', 'Requesting...')} role="progressbar" />
            ) : (
              t('rerequest', 'Re-request')
            )}
          </Button>
        </ButtonSet>
      </Form>
    </Workspace2>
  );
};

export default RequestDoctorApprovalView;
