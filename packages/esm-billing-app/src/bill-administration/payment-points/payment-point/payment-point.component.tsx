import React from 'react';
import BillingHeader from '../../../billing-header/billing-header.component';
import { useParams } from 'react-router-dom';
import { usePaymentPoints } from '../payment-points.resource';
import { PaymentHistoryViewer } from '../../../bill-administration/payment-history/payment-history-viewer.component';
import { useTranslation } from 'react-i18next';

export const PaymentPoint = () => {
  const { paymentPointUUID } = useParams();
  const { paymentPoints, isLoading, error } = usePaymentPoints();
  const { t } = useTranslation();
  const paymentPoint = paymentPoints?.find((point) => point.uuid === paymentPointUUID);

  if (isLoading) {
    return <p>loading</p>;
  }

  return (
    <div>
      <BillingHeader title={`${t('paymentPoints', 'Payment Points')} / ${paymentPoint?.name}`} />
      <PaymentHistoryViewer />
    </div>
  );
};
