import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import { Search, InlineLoading, Stack, Tag } from '@carbon/react';
import { useDebounce } from '@openmrs/esm-framework';
import styles from './icd11-diagnosis-search.scss';
import { useDiagnosis, type DiagnosisOption } from '../resources/anaesthetic-form.resource';

export interface DiagnosisSearchConfig {
  dataSourceUuid: string;
  debounceMs?: number;
  minChars?: number;
  resultLimit?: number;
  baseResultLimit?: number;
}

export interface DiagnosisSearchProps {
  id: string;
  labelText: string;
  value: DiagnosisOption | null | undefined;
  onChange: (diagnosis: DiagnosisOption | null) => void;
  config: DiagnosisSearchConfig;
  required?: boolean;
  invalid?: boolean;
  invalidText?: string;
  placeholder?: string;
}

interface DiagnosisSearchResultsProps {
  searchQuery: string;
  diagnoses?: Array<DiagnosisOption>;
  isLoading: boolean;
  selectedDiagnosisUuid?: string;
  onSelect: (diagnosis: DiagnosisOption) => void;
  minChars: number;
}

const DiagnosisSearchResults: React.FC<DiagnosisSearchResultsProps> = ({
  searchQuery,
  diagnoses,
  isLoading,
  selectedDiagnosisUuid,
  onSelect,
  minChars,
}) => {
  const { t } = useTranslation();

  if (searchQuery.length < minChars) {
    return null;
  }

  return (
    <div className={styles.searchResults}>
      {isLoading && (
        <div className={styles.loadingState}>
          <InlineLoading description={t('searching', 'Searching...')} />
        </div>
      )}

      {!isLoading && diagnoses && diagnoses.length > 0 && (
        <div className={styles.resultsList}>
          {diagnoses.map((diagnosis) => {
            const isSelected = selectedDiagnosisUuid === diagnosis.uuid;

            return (
              <div
                key={diagnosis.uuid}
                className={classNames(styles.resultItem, {
                  [styles.selected]: isSelected,
                })}
                onClick={() => onSelect(diagnosis)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(diagnosis);
                  }
                }}>
                <span className={styles.diagnosisText}>{diagnosis.display}</span>
                {isSelected && <Tag type="green" size="sm" className={styles.selectedTag}></Tag>}
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && diagnoses && diagnoses.length === 0 && (
        <div className={styles.noResults}>{t('noResults', 'No results found')}</div>
      )}
    </div>
  );
};

const DiagnosisSearch: React.FC<DiagnosisSearchProps> = ({
  id,
  labelText,
  value,
  onChange,
  config,
  required = false,
  invalid = false,
  invalidText,
  placeholder,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const { debounceMs = 300, minChars = 3, resultLimit = 20, baseResultLimit = 4, dataSourceUuid } = config;
  const debouncedSearchQuery = useDebounce(searchQuery, debounceMs);

  const { diagnoses, isLoading } = useDiagnosis(
    debouncedSearchQuery,
    dataSourceUuid,
    resultLimit,
    baseResultLimit,
    minChars,
  );

  useEffect(() => {
    setSearchQuery(value?.display ?? '');
  }, [value?.uuid, value?.display]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setShowResults(query.length >= minChars);

    if (!query) {
      onChange(null);
    }
  };

  const handleSelectDiagnosis = (diagnosis: DiagnosisOption) => {
    onChange(diagnosis);
    setShowResults(false);
    setSearchQuery(diagnosis.display);
  };

  return (
    <Stack gap={4}>
      <div className={styles.searchWrapper}>
        <p className="cds--label">{labelText}</p>
        <Search
          id={id}
          labelText={labelText}
          placeholder={placeholder || t('searchPlaceholder', 'Type to search (minimum 3 characters)...')}
          value={searchQuery}
          onChange={handleSearchChange}
          size="md"
          className={classNames({ [styles.invalid]: invalid })}
        />

        {showResults && (
          <DiagnosisSearchResults
            searchQuery={searchQuery}
            diagnoses={diagnoses}
            isLoading={isLoading}
            selectedDiagnosisUuid={value?.uuid}
            onSelect={handleSelectDiagnosis}
            minChars={minChars}
          />
        )}

        {searchQuery.length > 0 && searchQuery.length < minChars && (
          <div className={styles.hint}>
            <InlineLoading description={t('minimumCharacters', 'Type at least 3 characters to search')} />
          </div>
        )}
      </div>

      {invalid && invalidText && <div className={styles.errorMessage}>{invalidText}</div>}
    </Stack>
  );
};

export { DiagnosisSearch };
export default DiagnosisSearch;
