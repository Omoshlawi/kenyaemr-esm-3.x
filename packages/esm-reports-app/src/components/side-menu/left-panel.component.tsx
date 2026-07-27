import React from 'react';
import { SideNav } from '@carbon/react';
import { attach, ExtensionSlot, isDesktop, useLayoutType } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';

import styles from './left-panel.scss';

attach('nav-menu-slot', 'reports-left-panel');

const LeftPanel: React.FC = () => {
  const { t } = useTranslation();
  const layout = useLayoutType();

  return (
    isDesktop(layout) && (
      <SideNav aria-label={t('reportsLeftPanel', 'Reports left panel')} className={styles.leftPanel} expanded>
        <ExtensionSlot name="reports-left-panel-slot" />
      </SideNav>
    )
  );
};

export default LeftPanel;
