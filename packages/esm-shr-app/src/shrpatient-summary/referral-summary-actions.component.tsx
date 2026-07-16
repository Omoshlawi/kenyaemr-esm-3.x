import React from 'react';
import { itemDetails } from '../types';
import { Button } from '@carbon/react';
import { View } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import { showModal } from '@openmrs/esm-framework';
type ReferralSummaryActionProps = {
  item: itemDetails;
};
const ReferralSummaryAction: React.FC<ReferralSummaryActionProps> = ({ item }) => {
  const { t } = useTranslation();
  const handleView = () => {
    const dismiss = showModal('view-refferal-detail-modal', { onClose: () => dismiss(), item });
  };
  return (
    <Button
      hasIconOnly
      renderIcon={View}
      kind="ghost"
      onClick={handleView}
      iconDescription={t('viewDetails', 'View Details')}
    />
  );
};

export default ReferralSummaryAction;
