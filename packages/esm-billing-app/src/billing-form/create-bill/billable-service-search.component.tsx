import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebounce } from '@openmrs/esm-framework';
import { InlineLoading, Layer, Search } from '@carbon/react';

import { useBillableServiceByName } from '../../hooks/useBillableServices';
import { type BillingService } from '../../types';

import styles from './billing-form.scss';
import { formatCurrency } from '../../helpers/currency';

interface BillableServiceSearchProps {
  addedServiceUuids: Array<string>;
  onAddService: (service: BillingService) => void;
}

const BillableServiceSearch: React.FC<BillableServiceSearchProps> = ({ addedServiceUuids, onAddService }) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { billableServices, isLoading } = useBillableServiceByName(debouncedSearchTerm);

  const results = useMemo(
    () => billableServices.filter((service) => !addedServiceUuids.includes(service.uuid)),
    [billableServices, addedServiceUuids],
  );

  const handleSelect = (service: BillingService) => {
    onAddService(service);
    setSearchTerm('');
  };

  const displayServicePrices = (service: BillingService) => {
    if (service.servicePrices?.length === 0) {
      return t('servicePricesNotAvailable', 'Service price for item not available');
    }
    return service.servicePrices.map((price) => `${price.name} - ${formatCurrency(price.price)}`).join(' | ');
  };

  const renderResults = () => {
    if (isLoading) {
      return (
        <li className={styles.searchMessage}>
          <InlineLoading description={t('searching', 'Searching...')} />
        </li>
      );
    }

    if (results.length === 0) {
      return (
        <li className={styles.searchMessage}>
          {t('noResultsFor', 'No results found for "{{searchTerm}}"', { searchTerm: debouncedSearchTerm })}
        </li>
      );
    }

    return results.map((service) => (
      <li key={service.uuid}>
        <button
          disabled={service?.servicePrices?.length === 0}
          type="button"
          className={styles.searchResultItem}
          onClick={() => handleSelect(service)}>
          <span className={styles.serviceName}>{service.name}</span>
          {service.shortName && <span className={styles.serviceCode}>{displayServicePrices(service)}</span>}
        </button>
      </li>
    ));
  };

  return (
    <div className={styles.searchContainer}>
      <Layer>
        <Search
          labelText={t('searchBillableItems', 'Search billable items')}
          placeholder={t('searchForChargeableItemOrServicePlaceholder', 'Search chargeable items or services...')}
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          onClear={() => setSearchTerm('')}
        />
      </Layer>
      {Boolean(searchTerm) && <ul className={styles.searchResults}>{renderResults()}</ul>}
    </div>
  );
};

export default BillableServiceSearch;
