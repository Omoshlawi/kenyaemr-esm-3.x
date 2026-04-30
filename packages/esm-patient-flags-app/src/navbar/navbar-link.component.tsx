import React from 'react';
import { Warning } from '@carbon/react/icons';
import { navigate } from '@openmrs/esm-framework';
import { useDefaultFacility } from '../hooks/useDefaultFacility';
import styles from './navbar-link.scss';

type NavBarLinkItemProps = {
  icon: React.ReactNode;
  label: string;
  url?: string;
  hideOverlay: (state: boolean) => void;
  onClick?: () => void;
};

const NavBarLink: React.FC<NavBarLinkItemProps> = ({ icon, label, url, hideOverlay, onClick }) => {
  const { defaultFacility } = useDefaultFacility();

  const itemHasError = () => {
    if (label === 'System Info') {
      return defaultFacility?.operationalStatus !== 'Operational';
    }
    return false;
  };

  const hasError = itemHasError();

  const handleClick = (url) => {
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
