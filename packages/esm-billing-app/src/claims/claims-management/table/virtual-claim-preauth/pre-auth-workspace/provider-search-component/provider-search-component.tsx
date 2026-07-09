import React, { useState } from 'react';
import { InlineLoading, Search, Tag, TextInput } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import styles from '../pre-auth-form.scss';
import { ProviderResult } from '../../type';
import { useProviderSearch } from '../pre-auth-form.resource';

export interface ProviderSearchProps {
  idx: number;
  selectedDisplay: string;
  selectedLicenseNumber: string;
  selectedRegulationBody: string;
  identifierLabel?: string;
  onSelect: (provider: ProviderResult) => void;
  onLicenseNumberChange: (value: string) => void;
  onRegulationBodyChange: (value: string) => void;
  invalid?: boolean;
  invalidText?: string;
}

const ProviderSearch: React.FC<ProviderSearchProps> = ({
  idx,
  selectedDisplay,
  selectedLicenseNumber,
  selectedRegulationBody,
  identifierLabel,
  onSelect,
  onLicenseNumberChange,
  onRegulationBodyChange,
  invalid,
  invalidText,
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const { providers, isLoading } = useProviderSearch(query);

  const handleSelect = (provider: ProviderResult) => {
    onSelect(provider);
    setQuery('');
    setOpen(false);
  };

  const missingAttributes = selectedDisplay && (!selectedLicenseNumber || !selectedRegulationBody);

  return (
    <div className={styles.diagnosisSearch}>
      <Search
        id={`provider-search-${idx}`}
        labelText=""
        placeholder={t('searchProviderPlaceholder', 'Type provider name...')}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => query.length >= 2 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onClear={() => {
          setQuery('');
          setOpen(false);
        }}
        size="md"
        className={invalid ? styles.searchInvalid : undefined}
      />

      {invalid && invalidText && <p className={styles.fieldError}>{invalidText}</p>}

      {query.length > 0 && query.length < 2 && (
        <p className={styles.helperText}>{t('typeAtLeast2', 'Type at least 2 characters')}</p>
      )}

      {open && query.length >= 2 && (
        <div className={styles.diagnosisDropdown}>
          {isLoading ? (
            <div className={styles.diagnosisDropdownItem}>
              <InlineLoading description={t('searching', 'Searching...')} />
            </div>
          ) : providers.length === 0 ? (
            <div className={styles.diagnosisDropdownEmpty}>{t('noProviders', 'No providers found')}</div>
          ) : (
            providers.map((p) => (
              <button
                key={p.uuid}
                type="button"
                className={styles.diagnosisDropdownItem}
                onMouseDown={() => handleSelect(p)}>
                <span className={styles.diagnosisCode}>{p.licenseNumber ?? <InlineLoading />}</span>
                <span className={styles.diagnosisName}>{p.person?.display}</span>
                {p.licenseBody && (
                  <Tag type="cool-gray" size="sm">
                    {p.licenseBody}
                  </Tag>
                )}
              </button>
            ))
          )}
        </div>
      )}

      {selectedDisplay && (
        <div style={{ marginTop: '0.75rem' }}>
          <div className={styles.selectedDiagnosis}>
            <Tag type="green" size="sm">
              {selectedDisplay}
            </Tag>
          </div>

          {missingAttributes && (
            <p className={styles.helperText} style={{ marginBottom: '0.5rem' }}>
              {t('providerMissingAttrs', 'Provider has no license attributes — please enter manually')}
            </p>
          )}

          <div className={styles.twoCol} style={{ marginTop: '0.5rem' }}>
            <TextInput
              id={`license-number-${idx}`}
              labelText={identifierLabel ? `${identifierLabel} *` : t('licenseNumber', 'License number *')}
              value={selectedLicenseNumber}
              readOnly={!!selectedLicenseNumber}
              onChange={(e) => !selectedLicenseNumber && onLicenseNumberChange(e.target.value)}
              size="sm"
              invalid={!selectedLicenseNumber}
              invalidText={!selectedLicenseNumber ? t('enterLicenseNumber', 'Enter license number') : undefined}
            />
            <TextInput
              id={`regulation-body-${idx}`}
              labelText={t('regulationBody', 'Regulation body *')}
              value={selectedRegulationBody}
              readOnly={!!selectedRegulationBody}
              onChange={(e) => !selectedRegulationBody && onRegulationBodyChange(e.target.value)}
              size="sm"
              invalid={!selectedRegulationBody}
              invalidText={!selectedRegulationBody ? t('enterRegulationBody', 'Enter regulation body') : undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderSearch;
