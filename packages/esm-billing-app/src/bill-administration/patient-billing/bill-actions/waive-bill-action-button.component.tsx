import React from 'react';
import { Button } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import { Scalpel } from '@carbon/react/icons';

import { MappedBill, PaymentStatus } from '../../../types';

type WaiveBillActionButtonProps = {
  bill: MappedBill;
};

const WaiveBillActionButton: React.FC<WaiveBillActionButtonProps> = ({ bill }) => {
  const { t } = useTranslation();

  if (bill.status == PaymentStatus.PAID) {
    return null;
  }
  const handleOpenWaiveBillWorkspace = (bill: MappedBill) => {
    launchWorkspace2(
      'waive-bill-form',
      {
        bill: bill,
      },
      {},
      {},
    );
  };
  return (
    <Button
      size="sm"
      onClick={() => handleOpenWaiveBillWorkspace(bill)}
      renderIcon={(props) => <Scalpel size={24} {...props} />}
      kind="danger--ghost"
      iconDescription="TrashCan">
      {t('waiveBill', 'Waive Bill')}
    </Button>
  );
};

export default WaiveBillActionButton;
