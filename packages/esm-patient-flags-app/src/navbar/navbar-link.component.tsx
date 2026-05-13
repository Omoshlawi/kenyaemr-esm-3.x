import React from 'react';
import { Warning, CheckmarkFilled } from '@carbon/react/icons';
import { Tooltip } from '@carbon/react';
import { navigate } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import styles from './navbar-link.scss';
import { useFacilityRegistry } from '../hooks/useDefaultFacility';

type NavBarLinkItemProps = {
  icon: React.ReactNode;
  label: string;
  url?: string;
  hideOverlay: (state: boolean) => void;
  onClick?: () => void;
};

const NavBarLink: React.FC<NavBarLinkItemProps> = ({ icon, label, url, hideOverlay, onClick }) => {
  const { t } = useTranslation();
  const { facility, notYetSynced } = useFacilityRegistry();

  const normalize = (val?: string | null) => val?.toString().trim().toUpperCase() ?? '';

  const isStatusItem = label === 'System Info';
  const hasFacilityData = !notYetSynced && !!facility;

  const getFacilityIssues = (): string[] => {
    if (!isStatusItem || !hasFacilityData) {
      return [];
    }

    const issues: string[] = [];
    const shaOperational = normalize(facility!.sha_operational_status);
    const regulatoryOperational = normalize(facility!.regulatory_operational_status);

    if (shaOperational && shaOperational !== 'ACTIVE') {
      issues.push(t('shaOperationalNotActive', 'SHA operational status is not active'));
    }

    if (regulatoryOperational && regulatoryOperational !== 'ACTIVE') {
      issues.push(t('regulatoryNotActive', 'Regulatory operational status is not active'));
    }

    return issues;
  };

  const issues = getFacilityIssues();
  const hasError = issues.length > 0;
  const isHealthy = isStatusItem && hasFacilityData && !hasError;

  const handleClick = (url?: string) => {
    hideOverlay(false);
    if (!url) {
      return onClick?.();
    }
    navigate({ to: url });
  };

  const tooltipLabel = issues.length === 1 ? issues[0] : issues.map((issue) => `• ${issue}`).join('\n');

  const buttonClass = [styles.navLinkItem, hasError && styles.warning, isHealthy && styles.healthy]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" onClick={() => handleClick(url)} className={buttonClass}>
      {hasError && (
        <Tooltip label={tooltipLabel} align="bottom" className={styles.navErrorTooltip}>
          <span className={styles.navErrorWrapper}>
            <Warning className={styles.navError} />
          </span>
        </Tooltip>
      )}
      {isHealthy && (
        <Tooltip
          label={t('facilityActive', 'Facility is active and operational')}
          align="bottom"
          className={styles.navHealthyTooltip}>
          <span className={styles.navHealthyWrapper}>
            <CheckmarkFilled className={styles.navHealthy} />
          </span>
        </Tooltip>
      )}
      {icon}
      <span>{label}</span>
    </button>
  );
};

export default NavBarLink;
