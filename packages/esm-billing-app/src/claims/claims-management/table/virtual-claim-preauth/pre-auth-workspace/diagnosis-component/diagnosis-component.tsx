import React, { useRef, useState } from 'react';
import { InlineLoading, Search, Tag } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import styles from '../pre-auth-form.scss';
import { useDiagnosis } from '../pre-auth-form.resource';

interface DiagnosisSearchProps {
  id: string;
  labelText?: string;
  value: string;
  display: string;
  onChange: (icdCode: string, display: string) => void;
  invalid?: boolean;
  invalidText?: string;
}

const DiagnosisSearch: React.FC<DiagnosisSearchProps> = ({
  id,
  labelText,
  value,
  display,
  onChange,
  invalid,
  invalidText,
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isLoading, diagnoses } = useDiagnosis(query);

  const results = diagnoses.map((d) => ({
    id: d.uuid,
    label: d.icdCode ? `${d.icdCode} — ${d.display}` : d.display,
    icdCode: d.icdCode ?? d.display,
    display: d.display,
  }));

  const handleSelect = (item: (typeof results)[0]) => {
    onChange(item.icdCode, item.display);
    setQuery('');
    setOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setOpen(false);
    onChange('', '');
  };

  return (
    <div className={styles.diagnosisSearch} ref={containerRef}>
      <p className={styles.diagnosisLabel}>{labelText}</p>

      <Search
        id={id}
        labelText=""
        placeholder={t('searchDiagnosis', 'Search by name or ICD code...')}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => query.length >= 3 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onClear={handleClear}
        size="md"
        className={invalid ? styles.searchInvalid : undefined}
      />

      {invalid && invalidText && <p className={styles.fieldError}>{invalidText}</p>}

      {query.length > 0 && query.length < 3 && (
        <p className={styles.helperText}>{t('typeMoreChars', 'Type at least 3 characters to search')}</p>
      )}

      {open && query.length >= 3 && (
        <div className={styles.diagnosisDropdown}>
          {isLoading ? (
            <div className={styles.diagnosisDropdownItem}>
              <InlineLoading description={t('searching', 'Searching...')} />
            </div>
          ) : results.length === 0 ? (
            <div className={styles.diagnosisDropdownEmpty}>{t('noResults', 'No results found')}</div>
          ) : (
            results.map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles.diagnosisDropdownItem}
                onMouseDown={() => handleSelect(item)}>
                <span className={styles.diagnosisCode}>{item.icdCode}</span>
                <span className={styles.diagnosisName}>{item.display}</span>
              </button>
            ))
          )}
        </div>
      )}

      {value && (
        <div>
          <Tag type="blue" size="sm" className={styles.selectedDiagnosis}>
            {value} - {display}
          </Tag>
        </div>
      )}
    </div>
  );
};

export default DiagnosisSearch;
