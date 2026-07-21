import React from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import { ActionableNotification, Button, ButtonSet, Form, InlineLoading } from '@carbon/react';
import { useLayoutType, Workspace2 } from '@openmrs/esm-framework';
import { type PreauthQueueItem, type PreauthDoctor } from '../../../../../../billing-form/social-health-authority/type';
import DoctorBanner from '../components/doctor-banner.component';
import { useRemoveDoctor } from '../hooks/use-remove-doctor';
import styles from '../pre-auth-form.scss';

interface RemoveDoctorViewProps {
  item?: PreauthQueueItem;
  doctor?: PreauthDoctor;
  workspaceTitle: string;
  mutate?: () => void;
  onClose: () => void;
}

const RemoveDoctorView: React.FC<RemoveDoctorViewProps> = ({ item, doctor, workspaceTitle, mutate, onClose }) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const { handleRemoveDoctor, isRemovingDoctor, removeDoctorError } = useRemoveDoctor({
    item,
    doctor,
    mutate,
    onSuccess: onClose,
  });

  return (
    <Workspace2 title={workspaceTitle}>
      <Form className={styles.form}>
        <DoctorBanner item={item} doctor={doctor} />

        <div className={classNames(styles.inlineNotification, styles.cancelNotification)}>
          <ActionableNotification
            kind="warning"
            lowContrast
            hideCloseButton
            inline
            title={t('removeDoctorConfirmTitle', 'Remove this doctor?')}
            subtitle={t(
              'removeDoctorConfirmBody',
              'The doctor {{doctor}} will be removed from this preauthorization. This cannot be undone.',
              { doctor: doctor?.doctor_name },
            )}
          />
        </div>

        {removeDoctorError && (
          <div className={classNames(styles.inlineNotification, styles.cancelNotification)}>
            <ActionableNotification kind="error" lowContrast inline hideCloseButton title={removeDoctorError} />
          </div>
        )}

        <ButtonSet className={classNames({ [styles.tablet]: isTablet, [styles.desktop]: !isTablet })}>
          <Button className={styles.button} kind="secondary" onClick={onClose} disabled={isRemovingDoctor}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button className={styles.button} kind="danger" disabled={isRemovingDoctor} onClick={handleRemoveDoctor}>
            {isRemovingDoctor ? (
              <InlineLoading description={t('removing', 'Removing...')} role="progressbar" />
            ) : (
              t('removeDoctor', 'Remove doctor')
            )}
          </Button>
        </ButtonSet>
      </Form>
    </Workspace2>
  );
};

export default RemoveDoctorView;
