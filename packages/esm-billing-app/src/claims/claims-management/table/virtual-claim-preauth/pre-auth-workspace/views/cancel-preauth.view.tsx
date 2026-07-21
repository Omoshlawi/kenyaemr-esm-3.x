import React from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import { Button, ButtonSet, Form, InlineLoading, InlineNotification } from '@carbon/react';
import { useLayoutType, Workspace2 } from '@openmrs/esm-framework';
import { type PreauthQueueItem } from '../../../../../../billing-form/social-health-authority/type';
import { formatCurrency } from '../../../../../../helpers/currency';
import { formatShaDate } from '../../utils';
import { ClaimBanner, BannerItem } from '../components/claim-banner.component';
import { useCancelPreauth } from '../hooks/use-cancel-preauth';
import styles from '../pre-auth-form.scss';

interface CancelPreauthViewProps {
  item?: PreauthQueueItem;
  workspaceTitle: string;
  mutate?: () => void;
  onClose: () => void;
}

const CancelPreauthView: React.FC<CancelPreauthViewProps> = ({ item, workspaceTitle, mutate, onClose }) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const { handleCancelPreauth, isCancelling, cancelError } = useCancelPreauth({ item, mutate, onSuccess: onClose });

  return (
    <Workspace2 title={workspaceTitle}>
      <Form className={styles.form}>
        <ClaimBanner>
          <BannerItem label={t('patient', 'Patient')}>{item?.patient?.display ?? '—'}</BannerItem>
          <BannerItem label={t('authCode', 'Auth code')}>{item?.authorization_code}</BannerItem>
          <BannerItem label={t('intervention', 'Intervention')}>
            {item?.intervention_code} — {item?.intervention_name}
          </BannerItem>
          <BannerItem label={t('preauthType', 'Preauth type')}>{item?.preauth_type ?? '—'}</BannerItem>
          <BannerItem label={t('serviceType', 'Service type')}>{item?.service_type ?? '—'}</BannerItem>
          <BannerItem label={t('tariff', 'Tariff')}>{formatCurrency(Number(item?.tariff))}</BannerItem>
          <BannerItem label={t('preauthStatus', 'Preauth status')}>{item?.preauth_status ?? '—'}</BannerItem>
          {item?.requested_on && (
            <BannerItem label={t('requestedOn', 'Requested on')}>{formatShaDate(item.requested_on)}</BannerItem>
          )}
        </ClaimBanner>

        <div className={classNames(styles.inlineNotification, styles.cancelNotification)}>
          <InlineNotification
            kind="warning"
            lowContrast
            hideCloseButton
            title={t('cancelPreauthConfirmTitle', 'Cancel this pre-authorization?')}
            subtitle={t(
              'cancelPreauthConfirmBody',
              'The pre-authorization for intervention {{code}} will be cancelled. This cannot be undone.',
              { code: item?.intervention_code },
            )}
          />
        </div>

        {cancelError && (
          <div className={classNames(styles.inlineNotification, styles.cancelNotification)}>
            <InlineNotification kind="error" lowContrast title={cancelError} />
          </div>
        )}

        <ButtonSet className={classNames({ [styles.tablet]: isTablet, [styles.desktop]: !isTablet })}>
          <Button className={styles.button} kind="secondary" onClick={onClose} disabled={isCancelling}>
            {t('keepPreauth', 'Keep preauth')}
          </Button>
          <Button className={styles.button} kind="danger" disabled={isCancelling} onClick={handleCancelPreauth}>
            {isCancelling ? (
              <InlineLoading description={t('canceling', 'Cancelling...')} role="progressbar" />
            ) : (
              t('cancelPreauth', 'Cancel preauth')
            )}
          </Button>
        </ButtonSet>
      </Form>
    </Workspace2>
  );
};

export default CancelPreauthView;
