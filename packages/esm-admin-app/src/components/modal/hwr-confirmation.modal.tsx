import { Button, Tag, SkeletonText } from '@carbon/react';
import { ExtensionSlot } from '@openmrs/esm-framework';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ProfessionalRegistryResponse } from '../hook/healthWorkerRegistry';
import { formatDateTime } from '../../utils/utils';
import styles from './hwr-confirmation.modal.scss';

interface HWRConfirmModalProps {
  onConfirm: () => void;
  close: () => void;
  healthWorker: ProfessionalRegistryResponse;
}

type License = NonNullable<ProfessionalRegistryResponse['professional']['licenses']>[number];

const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className={styles.healthWorkerInfoContainer}>
    <span className={styles.healthWorkerInfoLabel}>{label}</span>
    <span>{value || '--'}</span>
  </div>
);

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className={styles.sectionHeading}>{children}</div>
);

const useCurrentLicense = (licenses: Array<License> = []): License | undefined =>
  useMemo(() => {
    if (licenses.length === 0) {
      return undefined;
    }
    const sorted = [...licenses]
      .filter((l) => l.license_end)
      .sort((a, b) => new Date(b.license_end).getTime() - new Date(a.license_end).getTime());
    const now = Date.now();
    return sorted.find((l) => new Date(l.license_end).getTime() >= now) ?? sorted[0];
  }, [licenses]);

const HWRConfirmModal: React.FC<HWRConfirmModalProps> = ({ close, onConfirm, healthWorker }) => {
  const { t } = useTranslation();
  const { professional } = healthWorker;
  const { membership, licenses, contacts, identifiers, professional_details } = professional;

  const currentLicense = useCurrentLicense(licenses);
  const isLicenseValid = currentLicense?.license_end ? new Date(currentLicense.license_end) > new Date() : false;

  return (
    <>
      <div className="cds--modal-header">
        <h3 className="cds--modal-header__heading">{t('healthWorkerRegistry', 'Health worker registry')}</h3>
      </div>

      <div className="cds--modal-content">
        <p className={styles.modalIntro}>
          {t(
            'healthWorkerDetailsFound',
            'Health worker found in the registry. Use this information to pre-fill the registration form?',
          )}
        </p>

        <div className={styles.healthWorkerOverview}>
          <ExtensionSlot
            className={styles.healthWorkerPhoto}
            name="patient-photo-slot"
            state={{ patientName: membership.full_name || '' }}
          />
          <div className={styles.healthWorkerSummary}>
            <h4 className={styles.healthWorkerName}>{membership.full_name || '--'}</h4>
            <div className={styles.healthWorkerSubtitle}>
              {membership.specialty || t('practitioner', 'Practitioner')}
              {membership.licensing_body && ` · ${membership.licensing_body}`}
            </div>
            <div className={styles.tagRow}>
              <Tag type={membership.is_active === 1 ? 'green' : 'gray'} size="md">
                {membership.is_active === 1 ? t('active', 'Active') : t('inactive', 'Inactive')}
              </Tag>
              <Tag type={isLicenseValid ? 'green' : 'red'} size="md">
                {isLicenseValid ? t('licenseValid', 'License valid') : t('licenseExpired', 'License expired')}
              </Tag>
            </div>
          </div>
        </div>

        <SectionHeading>{t('identity', 'Identity')}</SectionHeading>
        <InfoRow label={t('providerUniqueIdentifier', 'Provider unique identifier')} value={membership.id} />
        <InfoRow label={t('registrationId', 'Registration ID')} value={membership.registration_id} />
        <InfoRow label={t('externalReferenceId', 'External reference ID')} value={membership.external_reference_id} />
        <InfoRow label={t('gender', 'Gender')} value={membership.gender} />
        {identifiers?.identification_number && (
          <InfoRow
            label={t('identificationNumber', 'Identification number')}
            value={`${identifiers.identification_type ?? ''} ${identifiers.identification_number}`.trim()}
          />
        )}

        <SectionHeading>{t('licensing', 'Licensing & qualifications')}</SectionHeading>
        <InfoRow label={t('licensingBody', 'Licensing body')} value={membership.licensing_body} />
        <InfoRow label={t('specialty', 'Specialty')} value={membership.specialty} />
        {professional_details?.professional_cadre && (
          <InfoRow
            label={t('professionalCadre', 'Professional cadre')}
            value={professional_details.professional_cadre}
          />
        )}
        {professional_details?.practice_type && (
          <InfoRow label={t('practiceType', 'Practice type')} value={professional_details.practice_type} />
        )}
        {professional_details?.educational_qualifications && (
          <InfoRow
            label={t('qualification', 'Qualification')}
            value={professional_details.educational_qualifications}
          />
        )}

        {licenses && licenses.length > 0 && (
          <>
            <SectionHeading>{t('licenses', 'Licenses')}</SectionHeading>
            <div className={styles.licenseList}>
              {licenses.map((license) => {
                const expired = license.license_end && new Date(license.license_end) < new Date();
                return (
                  <div key={license.id} className={styles.licenseCard}>
                    <div className={styles.licenseHeader}>
                      <span className={styles.licenseType}>{license.license_type}</span>
                      <Tag type={expired ? 'red' : 'green'} size="sm">
                        {expired ? t('expired', 'Expired') : t('valid', 'Valid')}
                      </Tag>
                    </div>
                    <InfoRow label={t('licenseNumber', 'License no.')} value={license.external_reference_id} />
                    <InfoRow
                      label={t('validity', 'Validity')}
                      value={`${formatDateTime(license.license_start)} → ${formatDateTime(license.license_end)}`}
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}

        <SectionHeading>{t('contact', 'Contact')}</SectionHeading>
        <InfoRow label={t('phone', 'Phone')} value={contacts?.phone} />
        <InfoRow label={t('email', 'Email')} value={contacts?.email} />
        {contacts?.postal_address && (
          <InfoRow label={t('postalAddress', 'Postal address')} value={contacts.postal_address} />
        )}
      </div>

      <div className="cds--modal-footer">
        <Button kind="secondary" onClick={close}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button onClick={onConfirm}>{t('useValues', 'Use values')}</Button>
      </div>
    </>
  );
};

export default HWRConfirmModal;
