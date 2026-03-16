import React from 'react';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { OverflowMenuItem } from '@carbon/react';
import { LineItem, MappedBill, PaymentStatus } from '../../../types';

type CancelLineItemProps = {
  lineItem: LineItem;
  bill: MappedBill;
};

const CancelLineItem: React.FC<CancelLineItemProps> = ({ lineItem, bill }) => {
  const { t } = useTranslation();

  if (lineItem.paymentStatus == PaymentStatus.PAID) {
    return null;
  }
  const handleCancelLineItemWorkspace = () => {
    launchWorkspace2(
      'cancel-bill-workspace',
      {
        workspaceTitle: t('cancelBillForm', 'Cancel Bill Form'),
        bill,
        lineItem,
        patientUuid: bill.patientUuid,
      },
      {},
      {},
    );
  };

  return <OverflowMenuItem itemText={t('cancelItem', 'Cancel item')} onClick={handleCancelLineItemWorkspace} />;
};

export default CancelLineItem;
