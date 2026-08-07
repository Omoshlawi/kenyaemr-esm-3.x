import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import { Search, InlineLoading, Stack, Tag } from '@carbon/react';
import styles from './icd11-diagnosis-search.scss';

export type SearchableOption = {
  uuid: string;
  display: string;
};

export interface SearchableSelectProps {
  id: string;
  labelText: string;
  value: SearchableOption | null | undefined;
  onChange: (option: SearchableOption | null) => void;
  items: SearchableOption[];
  isLoading: boolean;
  onSearchQueryChange: (query: string) => void;
  minChars?: number;
  invalid?: boolean;
  invalidText?: string;
  placeholder?: string;
}

interface SearchResultsProps {
  searchQuery: string;
  items: SearchableOption[];
  isLoading: boolean;
  selectedUuid?: string;
  onSelect: (item: SearchableOption) => void;
  minChars: number;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  searchQuery,
  items,
  isLoading,
  selectedUuid,
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

      {!isLoading && items.length > 0 && (
        <div className={styles.resultsList}>
          {items.map((item) => {
            const isSelected = selectedUuid === item.uuid;

            return (
              <div
                key={item.uuid || item.display}
                className={classNames(styles.resultItem, {
                  [styles.selected]: isSelected,
                })}
                onClick={() => onSelect(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(item);
                  }
                }}>
                <span className={styles.diagnosisText}>{item.display}</span>
                {isSelected && <Tag type="green" size="sm" className={styles.selectedTag} />}
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && items.length === 0 && <div className={styles.noResults}>{t('noResults', 'No results found')}</div>}
    </div>
  );
};

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  id,
  labelText,
  value,
  onChange,
  items,
  isLoading,
  onSearchQueryChange,
  minChars = 3,
  invalid = false,
  invalidText,
  placeholder,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    setSearchQuery(value?.display ?? '');
  }, [value?.uuid, value?.display]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearchQueryChange(query);
    setShowResults(query.length >= minChars);

    if (!query) {
      onChange(null);
      return;
    }

    if (value?.uuid && query.trim() !== value.display.trim()) {
      onChange(null);
    }
  };

  const handleSelect = (item: SearchableOption) => {
    onChange(item);
    setShowResults(false);
    setSearchQuery(item.display);
    onSearchQueryChange(item.display);
  };

  return (
    <Stack gap={4}>
      <div className={styles.searchWrapper}>
        <p className="cds--label">{labelText}</p>
        <Search
          id={id}
          labelText={labelText}
          placeholder={
            placeholder ||
            t('searchPlaceholderMinChars', 'Type at least {{count}} characters to search', { count: minChars })
          }
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={() => {
            if (searchQuery.length >= minChars) {
              setShowResults(true);
            }
          }}
          size="md"
          className={classNames({ [styles.invalid]: invalid })}
        />

        {showResults && (
          <SearchResults
            searchQuery={searchQuery}
            items={items}
            isLoading={isLoading}
            selectedUuid={value?.uuid}
            onSelect={handleSelect}
            minChars={minChars}
          />
        )}

        {searchQuery.length > 0 && searchQuery.length < minChars && (
          <div className={styles.hint}>
            <InlineLoading
              description={t('minimumCharacters', 'Type at least {{count}} characters to search', {
                count: minChars,
              })}
            />
          </div>
        )}
      </div>

      {invalid && invalidText && <div className={styles.errorMessage}>{invalidText}</div>}
    </Stack>
  );
};

export default SearchableSelect;
