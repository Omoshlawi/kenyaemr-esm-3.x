import { Button, Column, Grid, InlineLoading, Layer, Tag, Tile } from '@carbon/react';
import { formatDate, parseDate, showSnackbar } from '@openmrs/esm-framework';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalFacilityInfo, useShaFacilityInfo } from '../hook/useFacilityInfo';
import styles from './facility-info.scss';
import { syncPackagesAndInterventions } from './facility-setup.resource';
import { Renew, Phone, Email } from '@carbon/react/icons';
import { SectionCard } from './shared/custom-section-card.component';
import { InfoRow } from './shared/custom-info.component';
import { StatusTag } from './shared/custom-status-tag.component';

const FacilityInfo: React.FC = () => {
  const { t } = useTranslation();
  const [shouldSynchronize, setShouldSynchronize] = useState(false);

  const {
    shaFacility,
    isLoading: isShaLoading,
    error: shaError,
    mutate: mutateSha,
  } = useShaFacilityInfo(shouldSynchronize);
  const { localFacility, isLoading: isLocalLoading, mutate: mutateLocal } = useLocalFacilityInfo();

  const mutateFacility = useCallback(async () => {
    const [defaultFacility, sha] = await Promise.all([mutateLocal(), mutateSha()]);
    return { shaFacility: sha, defaultFacility };
  }, [mutateLocal, mutateSha]);

  const isLoading = isShaLoading || isLocalLoading;

  const synchronizeFacilityData = useCallback(async () => {
    try {
      setShouldSynchronize(true);
      const { shaFacility: synced } = await mutateFacility();
      showSnackbar({ title: t('syncingHieSuccess', 'Synchronization complete'), kind: 'success', isLowContrast: true });
      if (synced?.data?.source !== 'HIE') {
        showSnackbar({
          kind: 'warning',
          title: t('hieSyncFailed', 'HIE sync failed. Pulling local info.'),
          isLowContrast: true,
        });
      }
      await syncPackagesAndInterventions();
    } catch (error) {
      showSnackbar({
        title: t('syncingHieError', 'Syncing with HIE failed'),
        subtitle:
          error?.responseBody?.error?.message ??
          t('hieSynchronizationError', 'An error occurred while synchronizing with HIE'),
        kind: 'error',
        isLowContrast: true,
      });
    }
  }, [mutateFacility, t]);

  return (
    <div className={styles.root}>
      <div className={styles.pageHeader}>
        <div className={styles.pageActions}>
          {isLoading ? (
            <InlineLoading description={t('synchronizing', 'Synchronizing...')} />
          ) : (
            <Button kind="secondary" size="sm" renderIcon={Renew} onClick={synchronizeFacilityData}>
              {t('syncWithHie', 'Sync with HIE')}
            </Button>
          )}
        </div>
      </div>
      <Grid narrow className={styles.grid}>
        <Column sm={4} md={4} lg={8}>
          <SectionCard title={t('generalInformation', 'General information')}>
            <InfoRow label={t('facilityName', 'Facility name')} value={localFacility?.display} />
            <InfoRow label={t('registrationNumber', 'Registration no.')} value={shaFacility?.registrationNumber} />
            <InfoRow label={t('fidCode', 'FID code')} value={shaFacility?.fidCode} />
            <InfoRow label={t('facilityRegistryCode', 'Registry code')} value={shaFacility?.facilityRegistryCode} />
            <InfoRow
              label={t('mflCode', 'MFL code')}
              value={shaFacility?.mflCode !== '--' ? shaFacility?.mflCode : localFacility?.locationId}
            />
            <InfoRow label={t('kephLevel', 'KEPH level')} value={shaFacility?.kephLevel} />
            <InfoRow label={t('facilityType', 'Facility type')} value={shaFacility?.facilityType} />
            <InfoRow label={t('facilityOwnership', 'Ownership')} value={shaFacility?.facilityOwnership} />
            <InfoRow
              label={t('hubFacility', 'Hub facility')}
              value={
                <Tag type={shaFacility?.isHub === 'true' ? 'blue' : 'gray'} size="sm">
                  {shaFacility?.isHub === 'true' ? 'Yes' : 'No'}
                </Tag>
              }
            />
          </SectionCard>
        </Column>

        <Column sm={4} md={4} lg={8}>
          <SectionCard title={t('licenseAndShaStatus', 'License & SHA status')}>
            <InfoRow label={t('licenseNumber', 'License no.')} value={shaFacility?.shaFacilityLicenseNumber} />
            <InfoRow label={t('regulatoryBody', 'Regulatory body')} value={shaFacility?.regulatoryBody} />
            <InfoRow
              label={t('licenseStatus', 'License status')}
              value={<StatusTag value={shaFacility?.facilityLicenseStatus} />}
            />
            <InfoRow
              label={t('licenseStart', 'License start')}
              value={formatDate(parseDate(shaFacility?.facilityLicenseStartDate)) ?? '—'}
            />
            <InfoRow
              label={t('licenseExpiry', 'License expiry')}
              value={formatDate(parseDate(shaFacility?.shaFacilityExpiryDate)) ?? '—'}
            />
            <InfoRow
              label={t('operationalStatus', 'Operational status')}
              value={<StatusTag value={shaFacility?.operationalStatus} />}
            />
            <InfoRow
              label={t('shaContractStatus', 'SHA contract')}
              value={
                shaFacility?.shaContractStatus &&
                shaFacility.shaContractStatus !== '--' &&
                shaFacility.shaContractStatus !== '' ? (
                  <StatusTag value={shaFacility.shaContractStatus} />
                ) : (
                  <Tag type="gray" size="sm">
                    Not contracted
                  </Tag>
                )
              }
            />
            <InfoRow label={t('totalBeds', 'Total beds')} value={shaFacility?.totalBeds} />
          </SectionCard>
        </Column>

        <Column sm={4} md={4} lg={8}>
          <SectionCard title={t('location', 'Location')}>
            <InfoRow label={t('county', 'County')} value={shaFacility?.county} />
            <InfoRow label={t('subCounty', 'Sub-county')} value={shaFacility?.subCounty} />
            <InfoRow label={t('town', 'Town')} value={shaFacility?.town} />
            <InfoRow label={t('physicalLocation', 'Physical location')} value={shaFacility?.physicalLocation} />
            <InfoRow label={t('postalAddress', 'Postal address')} value={shaFacility?.postalAddress} />
          </SectionCard>
        </Column>

        <Column sm={4} md={4} lg={8}>
          <SectionCard title={t('contactAndAdministrator', 'Contact & administrator')}>
            <InfoRow
              label={t('facilityPhone', 'Phone')}
              value={
                shaFacility?.facilityPhoneNumber && shaFacility.facilityPhoneNumber !== '--' ? (
                  <span className={styles.contactValue}>
                    <Phone size={14} />
                    {shaFacility.facilityPhoneNumber}
                  </span>
                ) : undefined
              }
            />
            <InfoRow
              label={t('facilityEmail', 'Email')}
              value={
                shaFacility?.facilityEmail && shaFacility.facilityEmail !== '--' ? (
                  <span className={styles.contactValue}>
                    <Email size={14} />
                    {shaFacility.facilityEmail}
                  </span>
                ) : undefined
              }
            />
            {shaFacility?.facilityAdministratorName && shaFacility.facilityAdministratorName !== '--' && (
              <div className={styles.adminCard}>
                <div>
                  <p className={styles.adminName}>{shaFacility.facilityAdministratorName}</p>
                  <p className={styles.adminDetail}>{shaFacility.facilityAdministratorPhone}</p>
                  <p className={styles.adminDetail}>{shaFacility.facilityAdministratorEmail}</p>
                </div>
              </div>
            )}
          </SectionCard>
        </Column>

        <Column sm={4} md={8} lg={16}>
          <SectionCard title={t('shaContractedServices', 'SHA contracted services')}>
            {(() => {
              try {
                const services = JSON.parse(shaFacility?.shaContractedServices ?? '[]');
                if (services.length === 0) {
                  return (
                    <p className={styles.emptyState}>
                      {t('noContractedServices', 'No contracted services on record for this facility.')}
                    </p>
                  );
                }
                return (
                  <div className={styles.serviceList}>
                    {services.map((svc: any, idx: number) => (
                      <Tag key={idx} type="teal" size="sm">
                        {svc.name ?? svc}
                      </Tag>
                    ))}
                  </div>
                );
              } catch {
                return <p className={styles.emptyState}>—</p>;
              }
            })()}
          </SectionCard>
        </Column>
      </Grid>
    </div>
  );
};

export default FacilityInfo;
