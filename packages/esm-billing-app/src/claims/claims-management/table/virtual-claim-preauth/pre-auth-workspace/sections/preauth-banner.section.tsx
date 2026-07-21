import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tag } from '@carbon/react';
import { type PreauthQueueItem } from '../../../../../../billing-form/social-health-authority/type';
import { formatCurrency } from '../../../../../../helpers/currency';
import { ClaimBanner, BannerItem } from '../components/claim-banner.component';
import styles from '../pre-auth-form.scss';

interface PreauthBannerProps {
  item?: PreauthQueueItem;
  isElective: boolean;
  isResubmit: boolean;
}

const PreauthBanner: React.FC<PreauthBannerProps> = ({ item, isElective, isResubmit }) => {
  const { t } = useTranslation();

  return (
    <ClaimBanner>
      <BannerItem label={t('authCode', 'Auth code')}>{item?.authorization_code}</BannerItem>
      <BannerItem label={t('intervention', 'Intervention')}>
        {item?.intervention_code} — {item?.intervention_name}
      </BannerItem>
      <BannerItem label={t('type', 'Type')}>
        {isElective ? (
          <Tag type="cyan" size="sm">
            {t('elective', 'Elective')}
          </Tag>
        ) : (
          item?.preauth_type
        )}
      </BannerItem>
      <BannerItem label={t('tariff', 'Tariff')}>{formatCurrency(Number(item?.tariff))}</BannerItem>
      {isResubmit && (
        <div className={styles.bannerItem}>
          <Tag type="warm-gray" size="sm">
            {t('resubmission', 'Resubmission')}
          </Tag>
        </div>
      )}
    </ClaimBanner>
  );
};

export default PreauthBanner;
