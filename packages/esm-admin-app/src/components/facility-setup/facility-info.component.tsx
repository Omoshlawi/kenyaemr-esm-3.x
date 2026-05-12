import { Button, Column, Grid, InlineLoading, Tag, Tile } from '@carbon/react';
import { Renew, Phone, Email } from '@carbon/react/icons';
import { formatDate, parseDate, showSnackbar } from '@openmrs/esm-framework';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './facility-info.scss';
import { InfoRow } from './shared/custom-info.component';
import { SectionCard } from './shared/custom-section-card.component';
import { StatusTag } from './shared/custom-status-tag.component';
import { syncFacilityRegistry, useFacilityRegistry } from './useFacilityRegistry';
import { FacilityRegistryRecord } from './type';
import { CardHeader } from '@openmrs/esm-patient-common-lib/src';
import EmptyState from '../empty-state/empty-state-log.components';

const FacilityRegistryView: React.FC = () => {
  const { t } = useTranslation();
  const { facility, isLoading, error, notYetSynced, mutate } = useFacilityRegistry();
  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await syncFacilityRegistry();
      await mutate();
      showSnackbar({
        title: t('facilityRegistrySyncSuccess', 'Facility synced'),
        subtitle: t('facilityRegistrySyncedFrom', 'Pulled {{name}} from the facility registry', {
          name: result.official_name,
        }),
        kind: 'success',
        isLowContrast: true,
      });
    } catch (err: any) {
      showSnackbar({
        title: t('facilityRegistrySyncFailed', 'Sync failed'),
        subtitle:
          err?.responseBody?.error ??
          err?.message ??
          t('facilityRegistrySyncError', 'Unable to reach the facility registry'),
        kind: 'error',
        isLowContrast: true,
      });
    } finally {
      setIsSyncing(false);
    }
  }, [mutate, t]);

  if (isLoading) {
    return (
      <div className={styles.root}>
        <InlineLoading description={t('loadingFacility', 'Loading facility…')} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.root}>
        <Tile className={styles.errorTile}>
          <p>{t('facilityRegistryLoadError', 'Failed to load the facility record.')}</p>
          <Button kind="secondary" size="sm" renderIcon={Renew} onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? t('syncing', 'Syncing…') : t('retry', 'Retry sync')}
          </Button>
        </Tile>
      </div>
    );
  }

  if (notYetSynced || !facility) {
    return (
      <div>
        <CardHeader title={t('facilityDetails', 'Facility details')}>
          <Button kind="primary" size="sm" renderIcon={Renew} onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? t('syncing', 'Syncing…') : t('syncNow', 'Sync now')}
          </Button>
        </CardHeader>
        <EmptyState
          subTitle={t(
            'facilityRegistryNotSyncedBody',
            'This facility has not been pulled from the registry. Click sync to fetch the latest record.',
          )}
        />
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.pageHeader}>
        <div className={styles.pageActions}>
          {facility.last_synced_at && (
            <span className={styles.lastSynced}>
              {t('lastSynced', 'Last synced')}: {formatDate(parseDate(facility.last_synced_at))}
            </span>
          )}
          {isSyncing ? (
            <InlineLoading description={t('syncing', 'Syncing…')} />
          ) : (
            <Button kind="secondary" size="sm" renderIcon={Renew} onClick={handleSync}>
              {t('syncWithRegistry', 'Sync with facility registry')}
            </Button>
          )}
        </div>
      </div>

      <Grid narrow className={styles.grid}>
        <Column sm={4} md={4} lg={8}>
          <SectionCard title={t('generalInformation', 'General information')}>
            <InfoRow label={t('facilityName', 'Facility name')} value={facility.official_name} />
            <InfoRow label={t('registrationNumber', 'Registration no.')} value={facility.registration_number} />
            <InfoRow label={t('frCode', 'FR code')} value={facility.fr_code} />
            <InfoRow label={t('fidCode', 'FID code')} value={facility.fid_code} />
            <InfoRow label={t('kephLevel', 'KEPH level')} value={facility.keph_level} />
            <InfoRow label={t('facilityType', 'Facility type')} value={facility.facility_type} />
            <InfoRow label={t('facilityOwnership', 'Ownership')} value={facility.facility_ownership} />
            <InfoRow
              label={t('hubFacility', 'Hub facility')}
              value={
                <Tag type={facility.is_hub ? 'blue' : 'gray'} size="sm">
                  {facility.is_hub ? t('yes', 'Yes') : t('no', 'No')}
                </Tag>
              }
            />
          </SectionCard>
        </Column>

        <Column sm={4} md={4} lg={8}>
          <SectionCard title={t('licenseAndShaStatus', 'License & SHA status')}>
            <InfoRow label={t('licenseNumber', 'License no.')} value={facility.license_number} />
            <InfoRow label={t('regulatoryBody', 'Regulatory body')} value={facility.regulatory_body} />
            <InfoRow
              label={t('licenseStatus', 'License status')}
              value={<StatusTag value={facility.license_status} />}
            />
            <InfoRow
              label={t('licenseStart', 'License start')}
              value={facility.license_start_date ? formatDate(parseDate(facility.license_start_date)) : '—'}
            />
            <InfoRow
              label={t('licenseExpiry', 'License expiry')}
              value={facility.license_end_date ? formatDate(parseDate(facility.license_end_date)) : '—'}
            />
            <InfoRow
              label={t('regulatoryOperationalStatus', 'Regulatory status')}
              value={<StatusTag value={facility.regulatory_operational_status} />}
            />
            <InfoRow
              label={t('shaOperationalStatus', 'SHA status')}
              value={<StatusTag value={facility.sha_operational_status} />}
            />
            <InfoRow
              label={t('shaContractStatus', 'SHA contract')}
              value={
                facility.sha_contract_status && facility.sha_contract_status !== '' ? (
                  <StatusTag value={facility.sha_contract_status} />
                ) : (
                  <Tag type="gray" size="sm">
                    {t('notContracted', 'Not contracted')}
                  </Tag>
                )
              }
            />
            {facility.bed_occupancy && (
              <InfoRow label={t('totalBeds', 'Total beds')} value={facility.bed_occupancy.totalBeds?.toString()} />
            )}
          </SectionCard>
        </Column>

        <Column sm={4} md={4} lg={8}>
          <SectionCard title={t('location', 'Location')}>
            <InfoRow label={t('country', 'Country')} value={facility.address?.country} />
            <InfoRow label={t('county', 'County')} value={facility.address?.county} />
            <InfoRow label={t('subCounty', 'Sub-county')} value={facility.address?.sub_county} />
            <InfoRow label={t('town', 'Town')} value={facility.address?.town} />
            <InfoRow label={t('physicalLocation', 'Physical location')} value={facility.address?.physical_location} />
            <InfoRow label={t('postalAddress', 'Postal address')} value={facility.address?.postal_address} />
            {facility.address?.latitude != null && facility.address?.longitude != null && (
              <InfoRow
                label={t('coordinates', 'Coordinates')}
                value={`${facility.address.latitude}, ${facility.address.longitude}`}
              />
            )}
          </SectionCard>
        </Column>

        <Column sm={4} md={4} lg={8}>
          <SectionCard title={t('contactAndAdministrator', 'Contact & administrator')}>
            <InfoRow
              label={t('facilityPhone', 'Phone')}
              value={
                facility.facility_phone_number ? (
                  <span className={styles.contactValue}>
                    <Phone size={14} />
                    {facility.facility_phone_number}
                  </span>
                ) : undefined
              }
            />
            <InfoRow
              label={t('facilityEmail', 'Email')}
              value={
                facility.facility_email ? (
                  <span className={styles.contactValue}>
                    <Email size={14} />
                    {facility.facility_email}
                  </span>
                ) : undefined
              }
            />
            {facility.facility_administrator_name && (
              <div className={styles.adminCard}>
                <div>
                  <p className={styles.adminName}>{facility.facility_administrator_name}</p>
                  {facility.facility_administrator_phone && (
                    <p className={styles.adminDetail}>{facility.facility_administrator_phone}</p>
                  )}
                  {facility.facility_administrator_email && (
                    <p className={styles.adminDetail}>{facility.facility_administrator_email}</p>
                  )}
                </div>
              </div>
            )}
          </SectionCard>
        </Column>

        <Column sm={4} md={8} lg={16}>
          <SectionCard title={t('bedOccupancy', 'Bed occupancy')}>
            <BedOccupancyView facility={facility} />
          </SectionCard>
        </Column>

        <Column sm={4} md={8} lg={16}>
          <SectionCard title={t('shaContractedServices', 'SHA contracted services')}>
            <ServicesView facility={facility} />
          </SectionCard>
        </Column>
      </Grid>
    </div>
  );
};

const BedOccupancyView: React.FC<{ facility: FacilityRegistryRecord }> = ({ facility }) => {
  const { t } = useTranslation();
  const bo = facility.bed_occupancy;
  if (!bo) {
    return <p className={styles.emptyState}>{t('noBedOccupancyData', 'No bed occupancy data')}</p>;
  }
  return (
    <div className={styles.bedGrid}>
      <InfoRow label={t('totalBeds', 'Total')} value={bo.totalBeds?.toString()} />
      <InfoRow label={t('normalBeds', 'Normal')} value={bo.normalBeds?.toString()} />
      <InfoRow label={t('icuBeds', 'ICU')} value={bo.icuBeds?.toString()} />
      <InfoRow label={t('hduBeds', 'HDU')} value={bo.hduBeds?.toString()} />
      <InfoRow label={t('dialysisBeds', 'Dialysis')} value={bo.dialysisBeds?.toString()} />
      <InfoRow label={t('cots', 'Cots')} value={bo.numberOfCots?.toString()} />
    </div>
  );
};

const ServicesView: React.FC<{ facility: FacilityRegistryRecord }> = ({ facility }) => {
  const { t } = useTranslation();
  const services = facility.sha_contracted_services ?? [];
  if (services.length === 0) {
    return (
      <p className={styles.emptyState}>
        {t('noContractedServices', 'No contracted services on record for this facility.')}
      </p>
    );
  }
  return (
    <div className={styles.serviceList}>
      {services.map((svc, idx) => (
        <Tag key={idx} type="teal" size="sm">
          {typeof svc === 'string' ? svc : svc.name ?? JSON.stringify(svc)}
        </Tag>
      ))}
    </div>
  );
};

export default FacilityRegistryView;
