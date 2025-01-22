import { ConfigurableLink } from '@openmrs/esm-framework';
import React from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';

export interface LinkConfig {
  name: string;
  title: string;
}

export function LinkExtension({ config }: { config: LinkConfig }) {
  const { name, title } = config;
  const location = useLocation();
  const spaBasePath = window.getOpenmrsSpaBase() + 'home';

  const isActive = location.pathname.includes(name);
  return (
    <ConfigurableLink
      to={spaBasePath + '/' + name}
      className={`cds--side-nav__link ${isActive && 'active-left-nav-link'}`}>
      {title}
    </ConfigurableLink>
  );
}

export const createLeftPanelLink = (config: LinkConfig) => () =>
  (
    <BrowserRouter>
      <LinkExtension config={config} />
    </BrowserRouter>
  );
