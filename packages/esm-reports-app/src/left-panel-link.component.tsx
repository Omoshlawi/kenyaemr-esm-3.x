import React, { type ComponentType, useMemo } from 'react';
import { ConfigurableLink, MaybeIcon, type IconId } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, useLocation } from 'react-router-dom';

import styles from './left-panel-link.scss';

export interface LinkConfig {
  name: string;
  title: string;
  icon?: IconId;
  useBaseReportsPath?: boolean;
}

function LinkExtension({ config }: Readonly<{ config: LinkConfig }>) {
  const { t } = useTranslation();
  const location = useLocation();
  const { name, title, icon, useBaseReportsPath = true } = config;
  const reportsPath = useBaseReportsPath ? `${window.getOpenmrsSpaBase()}reporting` : `${window.getOpenmrsSpaBase()}`;
  const isBaseReports = !name || name === 'reports';
  const reportPathSegment = isBaseReports ? '' : `/${name}`;
  const targetPath = `${reportsPath}${reportPathSegment}`.replace(/([^:]\/)\/+/g, '$1');
  const isActive = useMemo(() => {
    if (location.pathname === targetPath) {
      return true;
    }

    if (isBaseReports) {
      return location.pathname.startsWith(`${reportsPath}/report/`);
    }
    return location.pathname.startsWith(`${targetPath}/`);
  }, [location.pathname, targetPath, isBaseReports, reportsPath]);

  return (
    <ConfigurableLink to={targetPath} className={`cds--side-nav__link${isActive ? ' active-left-nav-link' : ''}`}>
      <span className={styles.menu}>
        <MaybeIcon icon={icon} className={styles.icon} size={16} />
        <span>{t(title)}</span>
      </span>
    </ConfigurableLink>
  );
}

export const createLeftPanelLink = (config: LinkConfig): ComponentType<unknown> =>
  function ReportsLeftPanelLink() {
    return (
      <BrowserRouter>
        <LinkExtension config={config} />
      </BrowserRouter>
    );
  };
