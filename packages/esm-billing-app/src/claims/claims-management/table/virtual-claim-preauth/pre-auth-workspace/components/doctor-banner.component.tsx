import React from 'react';
import { useTranslation } from 'react-i18next';
import { type PreauthQueueItem, type PreauthDoctor } from '../../../../../../billing-form/social-health-authority/type';
import { ClaimBanner, BannerItem } from './claim-banner.component';

interface DoctorBannerProps {
  item?: PreauthQueueItem;
  doctor?: PreauthDoctor;
}

const DoctorBanner: React.FC<DoctorBannerProps> = ({ item, doctor }) => {
  const { t } = useTranslation();

  return (
    <ClaimBanner>
      <BannerItem label={t('patient', 'Patient')}>{item?.patient?.display ?? '—'}</BannerItem>
      <BannerItem label={t('authCode', 'Auth code')}>{item?.authorization_code}</BannerItem>
      <BannerItem label={t('intervention', 'Intervention')}>
        {item?.intervention_code} — {item?.intervention_name}
      </BannerItem>
      <BannerItem label={t('doctor', 'Doctor')}>{doctor?.doctor_name ?? '—'}</BannerItem>
      <BannerItem label={t('doctorId', 'Doctor ID')}>{doctor?.identification_number ?? '—'}</BannerItem>
    </ClaimBanner>
  );
};

export default DoctorBanner;
