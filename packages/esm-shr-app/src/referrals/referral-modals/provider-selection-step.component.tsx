import { Column, ComboBox, InlineLoading, TextInput } from '@carbon/react';
import { useDebounce } from '@openmrs/esm-framework';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useProviders, type Provider } from '../refferals.resource';
import styles from './referral-modals.scss';

const ProviderSelectionStep: React.FC<{ provider?: Provider; setProvider: (provider?: Provider) => void }> = ({
  setProvider,
  provider,
}) => {
  const { t } = useTranslation();
  const [search, setSearch] = React.useState<string>('');
  const debouncedSearchTerm = useDebounce(search, 500);

  const { providers, error, isLoading, getProviderPhoneNumber } = useProviders(debouncedSearchTerm);
  return (
    <Column className={styles.formContainer}>
      <ComboBox<Provider>
        id={'provider-select'}
        onChange={({ selectedItem }) => {
          setProvider(selectedItem ?? undefined);
        }}
        onInputChange={setSearch}
        itemToString={(provider) => provider?.display ?? ''}
        items={providers}
        titleText={t('selectProvider', 'Select Provider')}
        placeholder={t('searchProvider', 'Search Provider')}
        selectedItem={provider}
      />
      {isLoading && <InlineLoading description={t('loadingProviders', 'Loading providers...')} />}
      <TextInput
        id={'provider-phone-number'}
        labelText={t('providerNumber', 'Phone number')}
        // readOnly
        value={getProviderPhoneNumber(provider ?? undefined)}
        helperText={t('autofilledFromProvider', 'This will be autofilled from the selected provider')}
      />
    </Column>
  );
};

export default ProviderSelectionStep;
