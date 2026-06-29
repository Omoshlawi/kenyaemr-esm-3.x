import React from 'react';
import { PageHeader, FacilityPictogram } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';

import styles from './header.scss';

type HeaderProps = {};

const Header: React.FC<HeaderProps> = () => {
  const { t } = useTranslation();
  return (
    <PageHeader
      className={styles.headerContainer}
      title={t('reports', 'Reports')}
      illustration={<FacilityPictogram />}
    />
  );
};

export default Header;
