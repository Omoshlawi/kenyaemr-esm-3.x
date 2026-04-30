import React, { useMemo } from 'react';
import classNames from 'classnames';
import last from 'lodash-es/last';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router-dom';
import { ConfigurableLink, MaybeIcon, evaluateAsBoolean, usePatient } from '@openmrs/esm-framework';
import styles from './dashboard.scss';
import { usePatientEnrollment } from './useDashboard';
import { InlineLoading } from '@carbon/react';
import { getPatientUuidFromUrl } from '../specialized-clinics/generic-nav-links/generic-nav-links.component';

export interface DashboardExtensionProps {
  path: string;
  title: string;
  basePath: string;
  icon: string;
  showWhenExpression?: string;
}

export const DashboardExtension = ({ path, title, basePath, icon, showWhenExpression }: DashboardExtensionProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const patientUuid = useMemo(() => getPatientUuidFromUrl(), []);
  const { patient } = usePatient(patientUuid);
  const { activePatientEnrollment, patientEnrollments, isLoading } = usePatientEnrollment(patientUuid);

  const show = evaluateAsBoolean(showWhenExpression as string, {
    activePatientEnrollment,
    patientEnrollments,
    patient,
  });

  const navLink = useMemo(() => decodeURIComponent(last(location.pathname) ?? ''), [location.pathname]);

  if (!show) {
    return null;
  }

  return (
    <div key={path}>
      <ConfigurableLink
        className={classNames('cds--side-nav__link', { 'active-left-nav-link': path === navLink })}
        to={`${basePath}/${encodeURIComponent(path)}`}>
        <span className={styles.menu}>
          {isLoading ? (
            <InlineLoading description={t('loading', 'Loading...')} />
          ) : (
            <>
              <MaybeIcon icon={icon} className={styles.icon} size={16} />
              <span>{t(title)}</span>
            </>
          )}
        </span>
      </ConfigurableLink>
    </div>
  );
};
