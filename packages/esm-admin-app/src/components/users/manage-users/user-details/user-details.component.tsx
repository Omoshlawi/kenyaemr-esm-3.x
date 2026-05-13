import React, { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Tag, Accordion, AccordionItem, ContainedListItem } from '@carbon/react';
import { PatientPhoto, useConfig } from '@openmrs/esm-framework';
import dayjs from 'dayjs';
import classNames from 'classnames';
import capitalize from 'lodash/capitalize';

import styles from './user-detail.scss';
import { type ProviderResponse, type UserResponse } from '../../../../types';
import { type ConfigObject } from '../../../../config-schema';

interface UserDetailsProps {
  provider: ProviderResponse;
  user: UserResponse;
}

const UserDetails: React.FC<UserDetailsProps> = ({ provider, user }) => {
  const { t } = useTranslation();
  const bannerRef = useRef<HTMLElement>(null);

  const {
    licenseNumberUuid,
    licenseExpiryDateUuid,
    licenseBodyUuid,
    qualificationUuid,
    specialtyUuid,
    providerCadreUuid,
    practiceTypeUuid,
    providerNationalIdUuid,
    passportNumberUuid,
    providerUniqueIdentifierAttributeTypeUuid,
    externalProviderIdentifierUuid,
    phoneNumberUuid,
    providerAddressUuid,
  } = useConfig<ConfigObject>();

  const attrByUuid = useMemo(() => {
    const map: Record<string, string> = {};
    provider?.attributes?.forEach((a) => {
      const uuid = a?.attributeType?.uuid;
      if (uuid && a.value != null) {
        map[uuid] = typeof a.value === 'string' ? a.value : String(a.value);
      }
    });
    return map;
  }, [provider]);

  const licenseNumber = attrByUuid[licenseNumberUuid];
  const licenseExpiryRaw = attrByUuid[licenseExpiryDateUuid];
  const licenseBody = attrByUuid[licenseBodyUuid];
  const qualification = attrByUuid[qualificationUuid];
  const specialty = attrByUuid[specialtyUuid];
  const providerCadre = attrByUuid[providerCadreUuid];
  const practiceType = attrByUuid[practiceTypeUuid];
  const nationalId = attrByUuid[providerNationalIdUuid];
  const passportNumber = attrByUuid[passportNumberUuid];
  const providerUniqueIdentifier = attrByUuid[providerUniqueIdentifierAttributeTypeUuid];
  const externalProviderIdentifier = attrByUuid[externalProviderIdentifierUuid];
  const phoneNumber = attrByUuid[phoneNumberUuid];
  const emailAddress = attrByUuid[providerAddressUuid];

  const today = dayjs();
  const expiryDate = licenseExpiryRaw ? dayjs(licenseExpiryRaw) : null;
  const daysUntilExpiry = expiryDate ? expiryDate.diff(today, 'day') : null;
  const formattedExpiryDate = expiryDate?.isValid() ? expiryDate.format('YYYY-MM-DD') : null;

  const getLicenseStatusTag = () => {
    if (!licenseNumber) {
      return <Tag type="red">{t('unlicensed', 'Unlicensed')}</Tag>;
    }
    if (daysUntilExpiry !== null && daysUntilExpiry < 0) {
      return <Tag type="red">{t('licenseExpired', 'License expired')}</Tag>;
    }
    if (daysUntilExpiry !== null && daysUntilExpiry <= 3) {
      return <Tag type="warm-gray">{t('licenseExpiringSoon', 'License expiring soon')}</Tag>;
    }
    return <Tag type="green">{t('active', 'Active')}</Tag>;
  };

  const genderLabel =
    provider?.person?.gender === 'M'
      ? t('male', 'Male')
      : provider?.person?.gender === 'F'
      ? t('female', 'Female')
      : '';

  const Field = ({ label, value }: { label: string; value?: string | null }) => (
    <span className={styles.spanField}>
      <span className={styles.fieldLabel}>{label}:</span> <span className={styles.fieldValue}>{value || '--'}</span>
    </span>
  );

  return (
    <div className={styles.providerDetailsContainer}>
      <header aria-label={t('providerBanner', 'Provider banner')} role="banner" ref={bannerRef}>
        <div className={styles.patientBanner}>
          <div className={styles.patientAvatar} role="img">
            <PatientPhoto patientUuid={provider?.uuid} patientName={provider?.person?.display} />
          </div>

          <div className={styles.patientInfo}>
            <div className={classNames(styles.row, styles.patientNameRow)}>
              <div className={styles.flexRow}>
                <span className={styles.patientName}>{provider?.person?.display}</span>
                {genderLabel && <span className={styles.gender}>{genderLabel}</span>}

                <span className={styles.tagRow}>
                  {getLicenseStatusTag()}
                  {qualification && <Tag type="cyan">{capitalize(qualification)}</Tag>}
                  {specialty && <Tag type="purple">{capitalize(specialty)}</Tag>}
                  {providerCadre && <Tag type="teal">{capitalize(providerCadre)}</Tag>}
                </span>
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.flexRow}>
                <Field label={t('phoneNumber', 'Phone')} value={phoneNumber} />
                <span className={styles.middot}>·</span>
                <Field label={t('emailAddress', 'Email')} value={emailAddress} />
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.flexRow}>
                <Field label={t('nationalId', 'National ID')} value={nationalId} />
                <span className={styles.middot}>·</span>
                <Field label={t('passportNumber', 'Passport')} value={passportNumber} />
                <span className={styles.middot}>·</span>
                <Field label={t('licenseNumber', 'License #')} value={licenseNumber} />
                <span className={styles.middot}>·</span>
                <Field label={t('licenseBody', 'License body')} value={licenseBody} />
                <span className={styles.middot}>·</span>
                <Field label={t('licenseExpiryDate', 'License expiry')} value={formattedExpiryDate} />
              </div>
            </div>

            {/* Practice row */}
            {practiceType && (
              <div className={styles.row}>
                <div className={styles.flexRow}>
                  <Field label={t('practiceType', 'Practice')} value={practiceType} />
                </div>
              </div>
            )}
            {providerUniqueIdentifier && (
              <div className={styles.row}>
                <span className={styles.puidBadge}>
                  {t('puid', 'PUID')}: <strong>{providerUniqueIdentifier}</strong>
                  {externalProviderIdentifier && (
                    <>
                      <span className={styles.middot}>·</span>
                      <span className={styles.fieldLabel}>{t('externalRef', 'External ref')}:</span>{' '}
                      <strong>{externalProviderIdentifier}</strong>
                    </>
                  )}
                </span>
              </div>
            )}

            {/* Roles */}
            <div className={classNames(styles.row, styles.viewRoles)}>
              <Accordion>
                <AccordionItem title={t('viewRoles', 'View roles ({{count}})', { count: user?.roles?.length ?? 0 })}>
                  {user?.roles?.length ? (
                    user.roles.map((role, i) => (
                      <ContainedListItem key={i}>
                        <div className={styles.roleContainer}>
                          <strong className={styles.roleName}>{role.display}</strong>
                          <p className={styles.roleDescription}>
                            {role.description || t('noDescriptionAvailable', 'No description available')}
                          </p>
                        </div>
                      </ContainedListItem>
                    ))
                  ) : (
                    <p className={styles.roleDescription}>{t('noRolesAssigned', 'No roles assigned')}</p>
                  )}
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
};

export default UserDetails;
