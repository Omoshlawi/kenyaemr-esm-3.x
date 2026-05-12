import React from 'react';
import { Warning } from '@carbon/react/icons';
import { navigate } from '@openmrs/esm-framework';
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
  const { facility, notYetSynced } = useFacilityRegistry();

  const itemHasError = () => {
    if (label !== 'System Info') {
      return false;
    }
    if (notYetSynced || !facility) {
      return false;
    }
    return facility.sha_operational_status !== 'ACTIVE';
  };

  const hasError = itemHasError();

  const handleClick = (url?: string) => {
    hideOverlay(false);
    if (!url) {
      return onClick?.();
    }
    navigate({ to: url });
  };

  return (
    <button
      type="button"
      onClick={() => handleClick(url)}
      className={`${styles.navLinkItem} ${hasError ? styles.warning : ''}`}>
      {hasError && <Warning className={styles.navError} />}
      {icon}
      <span>{label}</span>
    </button>
  );
};

export default NavBarLink;
