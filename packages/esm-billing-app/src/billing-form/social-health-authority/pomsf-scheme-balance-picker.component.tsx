import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown, InlineLoading, InlineNotification, Tag } from '@carbon/react';
import { useCurrencyFormatting } from '../../helpers/currency';
import { useHasSupplementaryPompsCoverage, usePomsfBalances } from './sha-virtual-claim.resource';
import type { PomsfBalanceMatch, SupplementaryScheme } from './type';
import styles from './pomsf-scheme-balance-picker.scss';

type PomsfSchemeBalancePickerProps = {
  patientUuid: string;
  patientCRId: string;
  subBenefitCode: string;
  onSchemeSelected?: (scheme: SupplementaryScheme | null) => void;
  onBalanceLoaded?: (matches: Array<PomsfBalanceMatch>) => void;
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
  const code = s.schemeCode?.trim();
  if (code) {
    return code;
  }
  return fallback;
};

const isPrincipalSelf = (scheme: SupplementaryScheme, patientCRId: string, patientMemberCr: string | null): boolean => {
  const principalCr = scheme.principalContributor?.crNumber?.trim();
  if (!principalCr) {
    return false;
  }
  if (patientCRId && principalCr === patientCRId.trim()) {
    return true;
  }
  if (patientMemberCr && principalCr === patientMemberCr.trim()) {
    return true;
  }
  return false;
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
  subBenefitCode,
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

  const options: SchemeOption[] = useMemo(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: callbacks in deps cause
  }, [selectedOption]);

  const principalMemberNumber = useMemo(
    () => resolvePrincipalMemberNumber(selectedOption?.scheme ?? null, patientCRId, memberCrNumber),
    [selectedOption, patientCRId, memberCrNumber],
  );

  const {
    matches,
    matchCount,
    policyYear,
    isLoading: isLoadingBalances,
    error: balancesError,
  } = usePomsfBalances(patientCRId || memberCrNumber || '', principalMemberNumber, subBenefitCode);

  useEffect(() => {
    if (!isLoadingBalances && matches.length > 0) {
      onBalanceLoaded?.(matches);
    }
  }, [matches, isLoadingBalances]);

  if (isLoadingEligibility) {
    return null;
  }
  if (eligibilityError) {
    return null;
  }
  if (!hasSupplementaryCoverage || schemes.length === 0) {
    return null;
  }

  const renderBalance = () => {
    if (!subBenefitCode) {
      return (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title={t('selectInterventionForBalance', 'Select an intervention to view balance')}
          subtitle={t(
            'selectInterventionForBalanceSubtitle',
            'Once an intervention is chosen, the available balance under this scheme will appear here.',
          )}
        />
      );
    }
    if (!principalMemberNumber) {
      return null;
    }
    if (isLoadingBalances) {
      return <InlineLoading description={t('loadingPomsfBalance', 'Looking up POMSF balance…')} status="active" />;
    }
    if (balancesError) {
      return (
        <InlineNotification
          kind="error"
          lowContrast
          title={t('balanceLookupFailed', 'Could not check balance')}
          subtitle={(balancesError as Error)?.message ?? t('tryAgain', 'Please try again')}
        />
      );
    }
    const employer = selectedOption?.scheme.principalContributor?.employerDetails;
    const principalName = selectedOption?.scheme.principalContributor?.name;
    const relationship = selectedOption?.scheme.principalContributor?.relationship;
    const schemeName = selectedOption?.scheme.schemeName;

    if (matchCount === 0) {
      return (
        <div className={styles.matchesList} key={`pmr-empty-${principalMemberNumber}`}>
          {employer && (
            <div className={styles.policyContextCard}>
              <div className={styles.policyContextRow}>
                <span className={styles.policyContextLabel}>{t('policyHolder', 'Policy holder')}</span>
                <span className={styles.policyContextValue}>
                  {principalName}
                  {relationship ? ` (${relationship})` : ''}
                </span>
              </div>
              {employer?.name && (
                <div className={styles.policyContextRow}>
                  <span className={styles.policyContextLabel}>{t('employer', 'Employer')}</span>
                  <span className={styles.policyContextValue}>{employer?.name}</span>
                </div>
              )}
              {employer?.jobGroup && (
                <div className={styles.policyContextRow}>
                  <span className={styles.policyContextLabel}>{t('jobGroup', 'Job group')}</span>
                  <span className={styles.policyContextValue}>{employer?.jobGroup}</span>
                </div>
              )}
              {schemeName && (
                <div className={styles.policyContextRow}>
                  <span className={styles.policyContextLabel}>{t('schemeNumber', 'Scheme')}</span>
                  <span className={styles.policyContextValue}>{schemeName}</span>
                </div>
              )}
            </div>
          )}
          <div className={styles.matchCard}>
            <div className={styles.matchHeader}>
              <span className={styles.matchTitle}>{t('noBalancesCovered', 'No Balances on this coverage')}</span>
            </div>
            <div className={styles.matchMetrics}>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>{t('limit', 'Limit')}</span>
                <span className={styles.metricValue}>—</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>{t('balance', 'Balance')}</span>
                <span className={styles.metricValueStrong}>—</span>
              </div>
              {policyYear != null && (
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>{t('policyYear', 'Policy year')}</span>
                  <span className={styles.metricValue}>{policyYear}</span>
                </div>
              )}
              <div className={styles.metric}>
                <span className={styles.metricLabel}>{t('sharing', 'Sharing')}</span>
                <span className={styles.metricValueStrong}>—</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.matchesList} key={`pmr-${principalMemberNumber}`}>
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
          </div>
        )}
        {matches.map((m, idx) => {
          const balanceRow = m.balance?.[0];
          const balance = balanceRow?.balance;
          const limit = m.sub_benefit_limit;
          const subBenefitName = m.sub_benefit_name || m.sub_benefit_code;
          const benefitName = m.benefit_name || m.benefit_code;
          const sharedTag = m.sub_benefit_shared || m.benefit_shared || null;

          return (
            <div key={`${m.sub_benefit_code}-${idx}`} className={styles.matchCard}>
              <div className={styles.matchHeader}>
                <span className={styles.matchTitle}>{subBenefitName}</span>
                <Tag size="sm" type={m.policy_active ? 'green' : 'gray'}>
                  {m.policy_active ? t('active', 'Active') : t('inactive', 'Inactive')}
                </Tag>
              </div>
              <div className={styles.matchSub}>{benefitName}</div>
              <div className={styles.matchMetrics}>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>{t('limit', 'Limit')}</span>
                  <span className={styles.metricValue}>{limit != null ? formatCurrency(limit) : '—'}</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>{t('balance', 'Balance')}</span>
                  <span className={styles.metricValueStrong}>{balance != null ? formatCurrency(balance) : '—'}</span>
                </div>
                {policyYear != null && (
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>{t('policyYear', 'Policy year')}</span>
                    <span className={styles.metricValue}>{policyYear}</span>
                  </div>
                )}
                {sharedTag && (
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>{t('sharing', 'Sharing')}</span>
                    <span className={styles.metricValue}>{sharedTag}</span>
                  </div>
                )}
              </div>

              {(m.policy_active_date || m.policy_end_date) && (
                <div className={styles.matchPolicyDates}>
                  {t('policyActive', 'Active')}: {m.policy_active_date || '—'}
                  {' → '}
                  {m.policy_end_date || '—'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <section className={styles.wrapper} aria-label={t('pomsfCoverage', 'POMSF coverage')}>
      <header className={styles.header}>
        <h5 className={styles.title}>{t('selectPomsfCovers', 'Select the POMSF cover(s) to use for billing')}</h5>
        <span className={styles.subtitle}>
          {t(
            'pomsfCoverageHelper',
            'Select the POMSF cover(s) to use for billing in the entire visit if the bill exceeds SHIF tariff.',
          )}
        </span>
      </header>

      <div className={styles.dropdownRow}>
        <Dropdown
          id="pomsf-scheme-picker"
          titleText={t('scheme', 'Scheme')}
          label={t('chooseScheme', 'Choose scheme')}
          items={options}
          itemToString={(item: SchemeOption | null) => (item ? item.label : '')}
          selectedItem={selectedOption}
          onChange={({ selectedItem }) => setSelectedOption(selectedItem ?? null)}
        />
      </div>

      <div className={styles.balanceArea}>{renderBalance()}</div>
    </section>
  );
};

export default PomsfSchemeBalancePicker;
