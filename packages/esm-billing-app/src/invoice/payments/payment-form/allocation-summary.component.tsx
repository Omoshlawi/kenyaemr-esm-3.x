import React from 'react';
import { useTranslation } from 'react-i18next';
import { InlineNotification } from '@carbon/react';

import { type PaymentAllocation } from './use-payment-allocation';

type AllocationSummaryProps = {
  allocation: PaymentAllocation;
  totalAmount: number;
  allowPartial: boolean;
  formatCurrency: (amount: number) => string;
};

const AllocationSummary: React.FC<AllocationSummaryProps> = ({
  allocation,
  totalAmount,
  allowPartial,
  formatCurrency,
}) => {
  const { t } = useTranslation();
  const { totalTendered, remaining, isFullyAllocated, isOverpaid, isPartial } = allocation;

  if (isFullyAllocated) {
    return (
      <InlineNotification
        kind="success"
        lowContrast
        hideCloseButton
        title={t('fullyAllocated', 'Fully allocated')}
        subtitle={t('tenderedOfTotal', '{{tendered}} of {{total}} allocated {{remaining}} remaining', {
          tendered: formatCurrency(totalTendered),
          total: formatCurrency(totalAmount),
          remaining: formatCurrency(0),
        })}
      />
    );
  }

  if (isOverpaid) {
    return (
      <InlineNotification
        kind="warning"
        lowContrast
        hideCloseButton
        title={t('amountOverpaid', 'Amount overpaid')}
        subtitle={t('tenderedOfTotal', '{{tendered}} of {{total}} allocated {{remaining}} remaining', {
          tendered: formatCurrency(totalTendered),
          total: formatCurrency(totalAmount),
          remaining: formatCurrency(Math.abs(remaining)),
        })}
      />
    );
  }

  if (allowPartial && isPartial) {
    return (
      <InlineNotification
        kind="info"
        lowContrast
        hideCloseButton
        title={t('partialPayment', 'Partial payment')}
        subtitle={t(
          'partialPaymentBalanceRemaining',
          '{{tendered}} will be paid now. {{remaining}} will remain outstanding on the selected line items.',
          {
            tendered: formatCurrency(totalTendered),
            remaining: formatCurrency(remaining),
          },
        )}
      />
    );
  }

  return (
    <InlineNotification
      kind="warning"
      lowContrast
      hideCloseButton
      title={t('amountRemaining', 'Amount remaining')}
      subtitle={t('tenderedOfTotal', '{{tendered}} of {{total}} allocated {{remaining}} remaining', {
        tendered: formatCurrency(totalTendered),
        total: formatCurrency(totalAmount),
        remaining: formatCurrency(remaining),
      })}
    />
  );
};

export default AllocationSummary;
