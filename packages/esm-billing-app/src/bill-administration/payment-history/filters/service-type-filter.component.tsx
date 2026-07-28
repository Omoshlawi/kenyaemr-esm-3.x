import { MultiSelect, SkeletonIcon } from '@carbon/react';
import React from 'react';
import styles from '../payment-history.scss';
import { useServiceTypes } from '../../service-catalog/billable-service.resource';
import { useTranslation } from 'react-i18next';
import { usePaymentFilterContext } from '../usePaymentFilterContext';

export const ServiceTypeFilter = () => {
  const { t } = useTranslation();
  const { filters, setFilters } = usePaymentFilterContext();
  const { serviceTypes, isLoading } = useServiceTypes();

  if (isLoading) {
    return <SkeletonIcon className={styles.skeletonIcon} />;
  }

  const initialSelectedItems = filters.serviceTypes.map((uuid) => ({
    id: uuid,
    text: serviceTypes.find((type) => type.uuid === uuid)?.display ?? uuid,
  }));

  const serviceTypeSelectOptions = [
    {
      id: 'select-all',
      text: t('selectAll', 'Select All'),
      isSelectAll: true,
    },
    ...serviceTypes.map((type) => ({
      id: type.uuid,
      text: type.display,
    })),
  ];

  const handleServiceTypeSelection = (selectedItems: Array<{ id: string; text: string }>) => {
    if (selectedItems.some((item) => item.id === 'select-all')) {
      setFilters({ ...filters, serviceTypes: serviceTypes.map((type) => type.uuid) });
      return;
    }

    setFilters({ ...filters, serviceTypes: selectedItems.map((item) => item.id) });
  };

  if (serviceTypes.length === 0) {
    return null;
  }

  return (
    <div style={{ minWidth: '20rem' }}>
      <MultiSelect
        id="service-type-filter"
        label={t('serviceType', 'Service Type')}
        titleText={t('serviceType', 'Service Type')}
        items={serviceTypeSelectOptions}
        initialSelectedItems={initialSelectedItems}
        itemToString={(item) => (item ? item.text : '')}
        selectionFeedback="top-after-reopen"
        onChange={(event) => handleServiceTypeSelection(event.selectedItems)}
      />
    </div>
  );
};
