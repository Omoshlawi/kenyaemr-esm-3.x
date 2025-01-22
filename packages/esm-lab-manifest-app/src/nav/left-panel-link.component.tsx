import React, { useCallback, useMemo } from 'react';
import last from 'lodash-es/last';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { ConfigurableLink } from '@openmrs/esm-framework';

export interface LinkConfig {
  name: string;
  title: string;
}

export function LinkExtension({ config }: { config: LinkConfig }) {
  const { name, title } = config;
  const location = useLocation();
  const spaBasePath = window.getOpenmrsSpaBase() + 'home';

  const matchUrl = useCallback((pattern: string, actualUrl: string) => {
    // Regular expression to match UUIDs (e.g., 8-4-4-4-12 hex characters)
    const uuidRegex = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

    // Replace /:uuid with the UUID regex pattern
    const regexPattern = pattern.replace(/:\b(uuid)\b/g, uuidRegex);

    // Create a regular expression with start and end anchors
    const regex = new RegExp(`^${regexPattern}$`);

    // Test if the actual URL matches the pattern
    return regex.test(actualUrl);
  }, []);

  const isActive = useMemo(
    () =>
      matchUrl(`${spaBasePath}/${name}/:uuuid`, location.pathname) ||
      matchUrl(`${spaBasePath}/${name}/:overview`, location.pathname) ||
      matchUrl(`${spaBasePath}/${name}`, location.pathname),
    [location.pathname, matchUrl, name],
  );

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
