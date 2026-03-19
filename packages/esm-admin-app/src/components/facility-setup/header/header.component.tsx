import React from 'react';
import { PageHeader, PageHeaderContent, HomePictogram } from '@openmrs/esm-framework';
import styles from './header.scss';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <PageHeader className={styles.pageHeader}>
      <PageHeaderContent title={title} illustration={<HomePictogram />} />
    </PageHeader>
  );
};

export default Header;
