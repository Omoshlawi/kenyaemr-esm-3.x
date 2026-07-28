import React from 'react';
import { MultiSelect } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { usePaymentFilterContext } from '../usePaymentFilterContext';
import { useCashiers } from '../../../billing.resource';

interface MultiSelectItem {
  id: string;
  text: string;
  isSelectAll?: boolean;
}

export const CashierFilter: React.FC = () => {
  const { t } = useTranslation();
  const { filters, setFilters } = usePaymentFilterContext();
  const { cashiers, isLoading } = useCashiers();

  const cashierSelectOptions: MultiSelectItem[] = [
    {
      id: 'select-all',
      text: t('allCashiers', 'All Cashiers'),
      isSelectAll: true,
    },
    ...cashiers.map((cashier) => ({
      id: cashier.uuid,
      text: cashier.display,
    })),
  ];

  const handleCashierSelection = (selectedItems: MultiSelectItem[]) => {
    if (selectedItems.some((item) => item.id === 'select-all')) {
      setFilters({ ...filters, cashiers: cashiers.map((cashier) => cashier.uuid) });
      return;
    }
    setFilters({ ...filters, cashiers: selectedItems.map((item) => item.id) });
  };

  const initialSelectedItems = (filters?.cashiers ?? []).map((uuid) => ({
    id: uuid,
    text: cashiers.find((cashier) => cashier.uuid === uuid)?.display ?? uuid,
  }));

  if (isLoading || cashiers.length === 0) {
    return null;
  }

  return (
    <div style={{ minWidth: '20rem' }}>
      <MultiSelect
        id="cashier-filter"
        label={t('cashier', 'Cashier')}
        titleText={t('cashier', 'Cashier')}
        items={cashierSelectOptions}
        initialSelectedItems={initialSelectedItems}
        itemToString={(item) => (item ? item.text : '')}
        selectionFeedback="top-after-reopen"
        onChange={(event) => handleCashierSelection(event.selectedItems ?? [])}
      />
    </div>
  );
};
