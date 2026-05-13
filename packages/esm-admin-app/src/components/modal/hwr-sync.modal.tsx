import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Column, Search, ComboBox, InlineLoading } from '@carbon/react';
import { useConfig, showSnackbar, showToast, restBaseUrl } from '@openmrs/esm-framework';
import { mutate } from 'swr';

import styles from './hwr-sync.modal.scss';
import { type ProviderResponse } from '../../types';
import { ConfigObject } from '../../config-schema';
import { createProviderAttribute, updateProviderAttributes } from './hwr-sync.resource';
import { searchHealthCareWork, ProfessionalRegistryResponse } from '../hook/healthWorkerRegistry';
import {
  useProfessionalRegistryIdentificationTypes,
  useProfessionalRegistryRegulators,
} from '../hook/useProfessionalRegistryEnums';

interface HWRSyncModalProps {
  close: () => void;
  provider: ProviderResponse;
}

interface EnumEntry {
  code: string;
  label: string;
}

const pickCurrentLicense = (licenses: ProfessionalRegistryResponse['professional']['licenses']) => {
  if (!licenses || licenses.length === 0) {
    return undefined;
  }
  const sorted = [...licenses]
    .filter((l) => l.license_end)
    .sort((a, b) => new Date(b.license_end).getTime() - new Date(a.license_end).getTime());
  const now = Date.now();
  return sorted.find((l) => new Date(l.license_end).getTime() >= now) ?? sorted[0];
};

const HWRSyncModal: React.FC<HWRSyncModalProps> = ({ close, provider }) => {
  const { t } = useTranslation();
  const [syncLoading, setSyncLoading] = useState(false);

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
    providerHieFhirReference,
    phoneNumberUuid,
    providerAddressUuid,
  } = useConfig<ConfigObject>();
  const { regulators } = useProfessionalRegistryRegulators();
  const { identificationTypes } = useProfessionalRegistryIdentificationTypes();

  const storedIdentifiers = useMemo(() => {
    const attrValue = (uuid: string) => provider?.attributes?.find((a) => a.attributeType?.uuid === uuid)?.value || '';

    return {
      nationalId: attrValue(providerNationalIdUuid),
      puid: attrValue(providerUniqueIdentifierAttributeTypeUuid),
      externalRef: attrValue(externalProviderIdentifierUuid),
      passport: attrValue(passportNumberUuid),
      licenseBody: attrValue(licenseBodyUuid),
    };
  }, [
    provider,
    providerNationalIdUuid,
    providerUniqueIdentifierAttributeTypeUuid,
    externalProviderIdentifierUuid,
    passportNumberUuid,
    licenseBodyUuid,
  ]);

  const initialIdentifierType = useMemo(() => {
    if (storedIdentifiers.nationalId) {
      return 'National ID';
    }
    if (storedIdentifiers.externalRef) {
      return 'registration_number';
    }
    if (storedIdentifiers.passport) {
      return 'Passport';
    }
    return '';
  }, [storedIdentifiers]);

  const initialIdentifier = useMemo(() => {
    if (storedIdentifiers.nationalId) {
      return storedIdentifiers.nationalId;
    }
    if (storedIdentifiers.externalRef) {
      return storedIdentifiers.externalRef;
    }
    if (storedIdentifiers.passport) {
      return storedIdentifiers.passport;
    }
    return '';
  }, [storedIdentifiers]);

  const initialRegulator = storedIdentifiers.licenseBody;

  const [searchHWR, setSearchHWR] = useState({
    identifierType: initialIdentifierType,
    identifier: initialIdentifier,
    regulator: initialRegulator,
  });

  useEffect(() => {
    setSearchHWR((prev) => ({
      ...prev,
      identifierType: prev.identifierType || initialIdentifierType,
      identifier: prev.identifier || initialIdentifier,
      regulator: prev.regulator || initialRegulator,
    }));
  }, [initialIdentifierType, initialIdentifier, initialRegulator]);

  const handleIdentifierTypeChange = (newType: string) => {
    const valueForType: Record<string, string> = {
      'National ID': storedIdentifiers.nationalId,
      registration_number: storedIdentifiers.externalRef,
      Passport: storedIdentifiers.passport,
    };

    setSearchHWR((prev) => ({
      ...prev,
      identifierType: newType,
      identifier: valueForType[newType] ?? '',
    }));
  };

  const selectedIdentificationType = useMemo<EnumEntry | null>(
    () => identificationTypes?.find((i) => i.code === searchHWR.identifierType) ?? null,
    [identificationTypes, searchHWR.identifierType],
  );

  const selectedRegulator = useMemo<EnumEntry | null>(
    () => regulators?.find((r) => r.code === searchHWR.regulator) ?? null,
    [regulators, searchHWR.regulator],
  );

  const isSearchDisabled = () =>
    !searchHWR.identifier || !searchHWR.identifierType || !searchHWR.regulator || syncLoading;

  const handleSync = async () => {
    setSyncLoading(true);

    try {
      const response = await searchHealthCareWork(searchHWR.identifierType, searchHWR.identifier, searchHWR.regulator);

      if (!response?.professional) {
        throw new Error(t('noResults', 'No results found'));
      }

      const { membership, contacts, identifiers, professional_details, licenses } = response.professional;
      const currentLicense = pickCurrentLicense(licenses);

      const updatableAttributes = [
        { attributeType: licenseNumberUuid, value: currentLicense?.external_reference_id },
        {
          attributeType: licenseExpiryDateUuid,
          value: currentLicense?.license_end ? new Date(currentLicense.license_end).toISOString() : null,
        },
        { attributeType: licenseBodyUuid, value: membership?.licensing_body },
        { attributeType: qualificationUuid, value: professional_details?.educational_qualifications },
        { attributeType: specialtyUuid, value: membership?.specialty },
        { attributeType: providerCadreUuid, value: professional_details?.professional_cadre },
        { attributeType: practiceTypeUuid, value: professional_details?.practice_type },

        { attributeType: providerNationalIdUuid, value: identifiers?.identification_number },
        { attributeType: providerUniqueIdentifierAttributeTypeUuid, value: membership?.id },
        { attributeType: externalProviderIdentifierUuid, value: membership?.external_reference_id },
        { attributeType: providerHieFhirReference, value: membership?.id },

        { attributeType: phoneNumberUuid, value: contacts?.phone },
        { attributeType: providerAddressUuid, value: contacts?.email },
      ].filter(
        (attr): attr is { attributeType: string; value: string } =>
          attr.value !== undefined && attr.value !== null && attr.value !== '',
      );

      await Promise.all(
        updatableAttributes.map((attr) => {
          const existing = provider.attributes?.find((at) => at.attributeType?.uuid === attr.attributeType)?.uuid;
          const payload = { attributeType: attr.attributeType, value: attr.value };
          return existing
            ? updateProviderAttributes(payload, provider.uuid, existing)
            : createProviderAttribute(payload, provider.uuid);
        }),
      );

      mutate((key) => typeof key === 'string' && key.startsWith(`${restBaseUrl}/provider`));

      showSnackbar({
        title: t('syncSuccess', 'Sync successful'),
        kind: 'success',
        subtitle: t('syncMessage', 'Provider details synced from the registry'),
        isLowContrast: true,
      });

      close();
    } catch (err: any) {
      showToast({
        critical: false,
        kind: 'error',
        description: t('errorSyncMsg', 'Failed to sync {{identifier}}: {{error}}', {
          identifier: searchHWR.identifier,
          error: err?.message ?? 'unknown error',
        }),
        title: t('hwrError', 'Sync failed'),
      });
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <>
      <div className="cds--modal-header">
        <h3 className="cds--modal-header__heading">{t('healthWorkerRegistry', 'Health worker registry')}</h3>
      </div>

      <div className="cds--modal-content">
        <p className={styles.intro}>
          {t(
            'healthWorkerSync',
            'Look up this provider in the Kenya health worker registry and overwrite local attributes with registry values.',
          )}
        </p>

        <div className={styles.modalContainer}>
          <Column className={styles.identifierTypeColumn}>
            <ComboBox
              id="syncIdentifierType"
              titleText={t('identificationType', 'Identification Type')}
              placeholder={t('chooseIdentifierType', 'Choose identifier type')}
              items={identificationTypes ?? []}
              itemToString={(item) => item?.label ?? ''}
              selectedItem={selectedIdentificationType}
              onChange={({ selectedItem }) => handleIdentifierTypeChange(selectedItem?.code ?? '')}
              className={styles.comboBox}
            />
          </Column>

          <Column className={styles.identifierTypeColumn}>
            <ComboBox
              id="syncRegulator"
              titleText={t('regulator', 'Regulator')}
              placeholder={t('chooseRegulator', 'Choose regulator')}
              items={regulators ?? []}
              itemToString={(item) => item?.label ?? ''}
              selectedItem={selectedRegulator}
              onChange={({ selectedItem }) =>
                setSearchHWR((prev) => ({ ...prev, regulator: selectedItem?.code ?? '' }))
              }
              className={styles.comboBox}
            />
          </Column>

          <Column className={styles.identifierTypeColumn}>
            <span className={styles.identifierTypeHeader}>{t('identifierNumber', 'Identifier number*')}</span>
            <Search
              id="syncSearch"
              labelText={t('enterIdentifierNumber', 'Enter identifier number')}
              placeholder={t('enterIdentifierNumber', 'Enter identifier number')}
              value={searchHWR.identifier}
              onChange={(e) => setSearchHWR((prev) => ({ ...prev, identifier: e.target.value }))}
              className={styles.formSearch}
            />
          </Column>
        </div>
      </div>

      <div className="cds--modal-footer">
        <Button kind="secondary" onClick={close} disabled={syncLoading}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button onClick={handleSync} disabled={isSearchDisabled()}>
          {syncLoading ? (
            <span className={styles.syncingLabel}>
              <InlineLoading status="active" description={t('syncing', 'Syncing...')} />
            </span>
          ) : (
            t('sync', 'Sync')
          )}
        </Button>
      </div>
    </>
  );
};

export default HWRSyncModal;
