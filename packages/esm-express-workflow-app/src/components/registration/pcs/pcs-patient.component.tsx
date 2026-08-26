import { Button, Tag } from '@carbon/react';
import { Link as LinkIcon } from '@carbon/react/icons';
import { age, formatDate, parseDate } from '@openmrs/esm-framework';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './pcs.scss';
import { type PcsPatient, type PcsSearchSubject } from './pcs.types';

interface PCSPatientTileProps {
  pcsPatient: PcsPatient;
  subject: PcsSearchSubject;
}

const normalize = (value?: string | null) => (value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

const PCSPatientTile: React.FC<PCSPatientTileProps> = ({ pcsPatient, subject }) => {
  const { t } = useTranslation();

  const handleLinkRecords = () => {};

  return (
    <div className={styles.pcsTile}>
      <div className={styles.pcsRow}>
        <span className={styles.pcsName}>{pcsPatient.name}</span>
      </div>

      <div className={styles.pcsRow}>
        {pcsPatient.gender && (
          <span className={styles.genderIcon}>
            <span>{pcsPatient.gender}</span>
          </span>
        )}
        {pcsPatient.birthDate ? (
          <>
            <span className={styles.separator}>&middot;</span>
            <span>{age(pcsPatient.birthDate)}</span>
            <span className={styles.separator}>&middot;</span>
            <span>{formatDate(parseDate(pcsPatient.birthDate))}</span>
          </>
        ) : (
          <>
            <span className={styles.separator}>&middot;</span>
            <span>{t('unknownDateOfBirth', 'Unknown date of birth')}</span>
          </>
        )}
      </div>

      <div className={styles.pcsRow}>
        <span className={styles.pcsFieldLabel}>{t('individualId', 'Individual ID')}:</span>
        <span>{pcsPatient.individualId}</span>
      </div>

      <div className={styles.pcsRow}>
        <span className={styles.pcsFieldLabel}>{t('nationalId', 'National ID')}:</span>
        <span>{pcsPatient.nationalId || '--'}</span>
      </div>

      <div className={styles.pcsRow}>
        <span className={styles.pcsFieldLabel}>{t('phone', 'Phone')}:</span>
        <span>{pcsPatient.phoneNumber || '--'}</span>
      </div>

      <div className={styles.pcsHousehold}>
        {t('pcsHousehold', '{{village}} village | Head: {{compoundHead}}', {
          village: pcsPatient.village || '--',
          compoundHead: pcsPatient.compoundHead || '--',
        })}
      </div>

      <div className={styles.pcsTileActions}>
        <Button kind="ghost" size="sm" renderIcon={LinkIcon} onClick={handleLinkRecords}>
          {t('linkRecords', 'Link records')}
        </Button>
      </div>
    </div>
  );
};

export default PCSPatientTile;
