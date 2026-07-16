import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown, InlineLoading, InlineNotification, Tag } from '@carbon/react';
import { useCurrencyFormatting } from '../../helpers/currency';
import { useHasSupplementaryPompsCoverage, usePomsfBalances } from './sha-virtual-claim.resource';
import type { PomsfBalanceRow, SupplementaryScheme } from './type';
import styles from './pomsf-scheme-balance-picker.scss';

type PomsfSchemeBalancePickerProps = {
  patientUuid: string;
  patientCRId: string;
  variant?: 'compact' | 'full';
  onSchemeSelected?: (scheme: SupplementaryScheme | null) => void;
  onBalanceLoaded?: (balances: Array<PomsfBalanceRow>) => void;
};

type SchemeOption = {
  id: string;
  label: string;
  scheme: SupplementaryScheme;
};

const buildBaseLabel = (s: SupplementaryScheme, fallback: string): string => {
  const name = s.principalContributor?.name?.trim();
  const relationship = s.principalContributor?.relationship?.trim();
  if (name && relationship) {
    return `${name} (${relationship})`;
  }
  if (name) {
    return name;
  }
  return s.schemeCode?.trim() || fallback;
};

const isPrincipalSelf = (scheme: SupplementaryScheme, patientCRId: string, patientMemberCr: string | null): boolean => {
  const principalCr = scheme.principalContributor?.crNumber?.trim();
  if (!principalCr) {
    return false;
  }
  return (
    (Boolean(patientCRId) && principalCr === patientCRId.trim()) ||
    (Boolean(patientMemberCr) && principalCr === patientMemberCr?.trim())
  );
};

const resolvePrincipalMemberNumber = (
  scheme: SupplementaryScheme | null,
  patientCRId: string,
  patientMemberCr: string | null,
): string => {
  if (!scheme) {
    return '';
  }
  if (isPrincipalSelf(scheme, patientCRId, patientMemberCr)) {
    return (patientCRId || patientMemberCr || '').trim();
  }
  return scheme.principalContributor?.crNumber?.trim() ?? '';
};

const PomsfSchemeBalancePicker: React.FC<PomsfSchemeBalancePickerProps> = ({
  patientUuid,
  patientCRId,
  variant = 'compact',
  onSchemeSelected,
  onBalanceLoaded,
}) => {
  const { t } = useTranslation();
  const { format: formatCurrency } = useCurrencyFormatting();

  const {
    hasSupplementaryCoverage,
    schemes,
    memberCrNumber,
    isLoading: isLoadingEligibility,
    error: eligibilityError,
  } = useHasSupplementaryPompsCoverage(patientUuid);

  const options: Array<SchemeOption> = useMemo(() => {
    const labelCounts = new Map<string, number>();
    schemes.forEach((s) => {
      const base = buildBaseLabel(s, t('unnamedScheme', 'Unnamed scheme'));
      labelCounts.set(base, (labelCounts.get(base) ?? 0) + 1);
    });

    return schemes.map((scheme, idx) => {
      const base = buildBaseLabel(scheme, t('unnamedScheme', 'Unnamed scheme'));
      const isAmbiguous = (labelCounts.get(base) ?? 0) > 1;
      const jobGroup = scheme.principalContributor?.employerDetails?.jobGroup?.trim();
      const label = isAmbiguous && jobGroup ? `${base} (${jobGroup})` : base;
      return {
        id: `pomsf-scheme-${idx}-${scheme.schemeCode ?? scheme.schemeName ?? idx}`,
        label,
        scheme,
      };
    });
  }, [schemes, t]);

  const [selectedOption, setSelectedOption] = React.useState<SchemeOption | null>(null);
  useEffect(() => {
    if (options.length === 0) {
      if (selectedOption !== null) {
        setSelectedOption(null);
      }
      return;
    }
    if (!selectedOption || !options.some((o) => o.id === selectedOption.id)) {
      setSelectedOption(options[0]);
    }
  }, [options, selectedOption]);

  useEffect(() => {
    onSchemeSelected?.(selectedOption?.scheme ?? null);
  }, [selectedOption]);

  const principalMemberNumber = useMemo(
    () => resolvePrincipalMemberNumber(selectedOption?.scheme ?? null, patientCRId, memberCrNumber),
    [selectedOption, patientCRId, memberCrNumber],
  );

  const {
    balances,
    total,
    policyYear,
    isLoading: isLoadingBalances,
    error: balancesError,
  } = usePomsfBalances(patientCRId || memberCrNumber || '', principalMemberNumber);

  useEffect(() => {
    if (!isLoadingBalances && balances.length > 0) {
      onBalanceLoaded?.(balances);
    }
  }, [balances, isLoadingBalances]);

  if (isLoadingEligibility || eligibilityError) {
    return null;
  }
  if (!hasSupplementaryCoverage || schemes.length === 0) {
    return null;
  }

  const principalName = selectedOption?.scheme.principalContributor?.name;
  const relationship = selectedOption?.scheme.principalContributor?.relationship;
  const schemeName = balances[0]?.scheme_name || selectedOption?.scheme.schemeName;
  const policyName = balances[0]?.policy_name;
  const policyActive = balances[0]?.policy_active ?? true;
  const employer = selectedOption?.scheme.principalContributor?.employerDetails;

  const renderBody = () => {
    if (!principalMemberNumber) {
      return null;
    }
    if (isLoadingBalances) {
      return (
        <InlineLoading
          className={styles.compactLoading}
          description={t('loadingPomsfBalance', 'Checking balances…')}
          status="active"
        />
      );
    }
    if (balancesError) {
      return (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title={t('balanceLookupFailed', 'Could not check balances')}
          subtitle={(balancesError as Error)?.message ?? t('tryAgain', 'Please try again')}
        />
      );
    }
    if (total === 0) {
      return <div className={styles.emptyState}>{t('noBalancesCovered', 'No balances under this cover')}</div>;
    }

    return (
      <>
        {employer && (
          <div className={styles.policyContextCard}>
            <div className={styles.policyContextRow}>
              <span className={styles.policyContextLabel}>{t('policyHolder', 'Policy holder')}</span>
              <span className={styles.policyContextValue}>
                {principalName}
                {relationship ? ` (${relationship})` : ''}
              </span>
            </div>
            {employer.name && (
              <div className={styles.policyContextRow}>
                <span className={styles.policyContextLabel}>{t('employer', 'Employer')}</span>
                <span className={styles.policyContextValue}>{employer.name}</span>
              </div>
            )}
            {employer.jobGroup && (
              <div className={styles.policyContextRow}>
                <span className={styles.policyContextLabel}>{t('jobGroup', 'Job group')}</span>
                <span className={styles.policyContextValue}>{employer.jobGroup}</span>
              </div>
            )}
            {schemeName && (
              <div className={styles.policyContextRow}>
                <span className={styles.policyContextLabel}>{t('schemeNumber', 'Scheme')}</span>
                <span className={styles.policyContextValue}>{schemeName}</span>
              </div>
            )}
            {policyName && (
              <div className={styles.policyContextRow}>
                <span className={styles.policyContextLabel}>{t('policy', 'Policy')}</span>
                <span className={styles.policyContextValue}>{policyName}</span>
              </div>
            )}
            {policyYear != null && (
              <div className={styles.policyContextRow}>
                <span className={styles.policyContextLabel}>{t('policyYear', 'Policy year')}</span>
                <span className={styles.policyContextValue}>
                  {policyYear}
                  {'  '}
                  <Tag size="sm" type={policyActive ? 'green' : 'gray'}>
                    {policyActive ? t('active', 'Active') : t('inactive', 'Inactive')}
                  </Tag>
                </span>
              </div>
            )}
          </div>
        )}
        <ul className={styles.balanceList}>
          {balances.map((b, idx) => {
            const balance = b.balance?.[0]?.balance;
            return (
              <li key={`${b.sub_benefit_code}-${idx}`} className={styles.balanceRow}>
                <div className={styles.balanceRowMain}>
                  <span className={styles.balanceName}>{b.sub_benefit_name || b.sub_benefit_code}</span>
                  <span className={styles.balanceCode}>{b.sub_benefit_code}</span>
                </div>
                <div className={styles.balanceRowAmounts}>
                  <span className={styles.balanceValue}>{balance != null ? formatCurrency(balance) : '—'}</span>
                  <span className={styles.balanceLimit}>
                    {t('ofLimit', 'of {{limit}}', {
                      limit: b.sub_benefit_limit != null ? formatCurrency(b.sub_benefit_limit) : '—',
                    })}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </>
    );
  };

  return (
    <div
      className={variant === 'full' ? styles.wrapperFull : styles.wrapperCompact}
      aria-label={t('pomsfCoverage', 'POMSF coverage')}>
      {variant === 'full' && (
        <header className={styles.header}>
          <h5 className={styles.title}>{t('selectPomsfCovers', 'POMSF cover balances')}</h5>
          <span className={styles.subtitle}>
            {t('pomsfCoverageHelper', 'Balances under the selected cover, used when the bill exceeds SHIF tariff.')}
          </span>
        </header>
      )}

      {options.length > 1 ? (
        <Dropdown
          id="pomsf-scheme-picker"
          size="sm"
          titleText={variant === 'full' ? t('scheme', 'Scheme') : ''}
          hideLabel={variant === 'compact'}
          label={t('chooseScheme', 'Choose scheme')}
          items={options}
          itemToString={(item: SchemeOption | null) => (item ? item.label : '')}
          selectedItem={selectedOption}
          onChange={({ selectedItem }) => setSelectedOption(selectedItem ?? null)}
        />
      ) : null}

      {renderBody()}
    </div>
  );
};

export default PomsfSchemeBalancePicker;
