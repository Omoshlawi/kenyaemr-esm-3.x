import React, { useMemo } from 'react';
import { InlineLoading, InlineNotification, Tag } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import { useSHAEligibility, type Scheme } from '../hie.resource';
import styles from './patient-banner-sha-status.scss';
import { getSchemeEligibility } from './helper';
import { EligibilityStatusCode, SchemeName } from './constant';
import SchemeTag from './scheme-tag.component';

interface PatientBannerShaStatusProps {
  patientUuid: string;
}

interface EligibleScheme {
  displayName: SchemeName;
  scheme: Scheme;
  memberType: string;
  eligible: boolean;
}

const TRACKED_SCHEMES = [SchemeName.UHC, SchemeName.SHIF, SchemeName.TSC, SchemeName.POMSF];

const InactiveStatusTag: React.FC<{ label: string }> = ({ label }) => {
  const { t } = useTranslation();

  return (
    <Tag className={classNames(styles.tag, styles.inactiveTag)}>
      <span className={styles.schemeName}>{t('sha', 'SHA')}</span>
      <span>{label}</span>
    </Tag>
  );
};

const PatientBannerShaStatus: React.FC<PatientBannerShaStatusProps> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const { data, isLoading: isLoadingHIEEligibility, error } = useSHAEligibility(patientUuid);

  const eligibleSchemes = useMemo<Array<EligibleScheme>>(() => {
    if (!data?.schemes?.length) {
      return [];
    }

    return TRACKED_SCHEMES.map((displayName) => ({
      displayName,
      ...getSchemeEligibility(data.schemes, displayName),
    })).filter((scheme): scheme is EligibleScheme => Boolean(scheme.scheme && scheme.memberType));
  }, [data]);

  if (isLoadingHIEEligibility) {
    return <InlineLoading status="active" description={t('loadingPatientSHA', 'Checking SHA eligibility...')} />;
  }

  if (error) {
    return (
      <InlineNotification
        aria-label="closes notification"
        kind="error"
        lowContrast
        statusIconDescription="notification"
        title={t('error', 'Error')}
        subtitle={t('errorRetrievingHIESubscription', 'Error retrieving HIE subscription')}
      />
    );
  }

  if (data?.statusCode !== EligibilityStatusCode.MEMBER_FOUND) {
    return (
      <div className={styles.schemeTagsContainer}>
        <InactiveStatusTag label={t('notRegistered', 'Not Registered')} />
      </div>
    );
  }

  if (eligibleSchemes.length === 0) {
    return (
      <div className={styles.schemeTagsContainer}>
        <InactiveStatusTag label={t('noSchemesFound', 'No Schemes Found')} />
      </div>
    );
  }

  return (
    <div className={styles.schemeTagsContainer}>
      {eligibleSchemes.map(({ displayName, ...schemeInfo }, index) => (
        <React.Fragment key={displayName}>
          {index > 0 && <span className={styles.separator}>&middot;</span>}
          <SchemeTag schemeInfo={schemeInfo} displayName={displayName} />
        </React.Fragment>
      ))}
    </div>
  );
};

export default PatientBannerShaStatus;
