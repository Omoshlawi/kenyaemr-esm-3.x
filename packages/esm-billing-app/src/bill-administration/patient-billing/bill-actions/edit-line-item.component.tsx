import React from 'react';
import { OverflowMenuItem } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { launchWorkspace2 } from '@openmrs/esm-framework';

import { LineItem, MappedBill, PaymentStatus } from '../../../types';

type EditLineItemProps = {
  lineItem: LineItem;
  bill: MappedBill;
};

const EditLineItem: React.FC<EditLineItemProps> = ({ lineItem, bill }) => {
  const { t } = useTranslation();

  if (lineItem.paymentStatus == PaymentStatus.PAID) {
    return null;
  }

  const handleOpenEditLineItemWorkspace = (lineItem: LineItem) => {
    launchWorkspace2(
      'edit-bill-form',
      {
        lineItem,
        bill,
      },
      {},
      {},
    );
  };
  return (
    <OverflowMenuItem itemText={t('editItem', 'Edit item')} onClick={() => handleOpenEditLineItemWorkspace(lineItem)} />
  );
};

export default EditLineItem;
