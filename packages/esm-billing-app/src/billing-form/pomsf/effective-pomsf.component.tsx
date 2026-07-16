import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { InlineLoading, InlineNotification, Tag } from '@carbon/react';
import { Locked } from '@carbon/react/icons';
import { useConfig, usePatient } from '@openmrs/esm-framework';
import styles from './effective-pomsf.scss';
import { BillingConfig } from '../../config-schema';
import { SupplementaryScheme } from '../social-health-authority/type';
import { useEffectiveCover } from '../social-health-authority/sha-virtual-claim.resource';
import PomsfSchemeBalancePicker from '../social-health-authority/pomsf-scheme-balance-picker.component';

type EffectiveCoverPickerProps = {
  patientUuid: string;
  patientCRId?: string;
  consentToken: string;
  onSchemeSelected?: (scheme: SupplementaryScheme | null) => void;
};

const EffectiveCoverPicker: React.FC<EffectiveCoverPickerProps> = ({
  patientUuid,
  patientCRId,
  consentToken,
  onSchemeSelected,
}) => {
  const { t } = useTranslation();
  const { crIdentificationNumberUUID } = useConfig<BillingConfig>();
  const { patient, isLoading: isLoadingPatient } = usePatient(patientUuid);

  const resolvedCRId = useMemo(() => {
    if (patientCRId?.trim()) {
      return patientCRId.trim();
    }
    if (!patient?.identifier) {
      return '';
    }
    const byType = patient.identifier.find((id: fhir.Identifier) =>
      id?.type?.coding?.some((c) => c.code === crIdentificationNumberUUID),
    );
    if (byType?.value) {
      return byType.value;
    }
    const byPrefix = patient.identifier.find((id: fhir.Identifier) => id?.value?.startsWith('CR'));
    return byPrefix?.value ?? '';
  }, [patientCRId, patient, crIdentificationNumberUUID]);

  const {
    isLocked,
    cover,
    isLoading: isLoadingCover,
    error: coverError,
  } = useEffectiveCover(consentToken, resolvedCRId);

  useEffect(() => {
    if (isLocked) {
      onSchemeSelected?.(null);
    }
  }, [isLocked, onSchemeSelected]);

  if (!consentToken) {
    return null;
  }

  if (isLoadingPatient || (resolvedCRId && isLoadingCover)) {
    return <InlineLoading description={t('checkingEffectiveCover', 'Checking effective cover…')} status="active" />;
  }

  if (!resolvedCRId) {
    return null;
  }

  if (isLocked && cover) {
    const c = cover as any;
    const schemeCode = c?.schemeCode ?? '';
    const employerName = c?.employerName ?? '';
    const relationship = c?.principalRelationship ?? '';
    const memberType = c?.memberType ?? '';
    const jobGroup = c?.jobGroup ?? '';
    const policyStart = c?.policyStartDate ?? '';
    const policyEnd = c?.policyEndDate ?? '';
    const principalCrNo = c?.principalCrNo ?? '';

    return (
      <div className={styles.lockedCoverCard}>
        <div className={styles.lockedCoverHeader}>
          <Locked size={16} className={styles.lockedIcon} />
          <span className={styles.lockedTitle}>{t('effectiveCoverLocked', 'Effective cover locked')}</span>
          <Tag size="sm" type="green">
            {t('locked', 'Locked')}
          </Tag>
        </div>

        {schemeCode && (
          <div className={styles.lockedCoverRow}>
            <span className={styles.lockedCoverLabel}>{t('scheme', 'Scheme')}</span>
            <span className={styles.lockedCoverValue}>{schemeCode}</span>
          </div>
        )}
        {employerName && (
          <div className={styles.lockedCoverRow}>
            <span className={styles.lockedCoverLabel}>{t('employer', 'Employer')}</span>
            <span className={styles.lockedCoverValue}>{employerName}</span>
          </div>
        )}
        {relationship && (
          <div className={styles.lockedCoverRow}>
            <span className={styles.lockedCoverLabel}>{t('relationship', 'Relationship')}</span>
            <span className={styles.lockedCoverValue}>
              {relationship}
              {memberType ? ` (${memberType})` : ''}
            </span>
          </div>
        )}
        {jobGroup && (
          <div className={styles.lockedCoverRow}>
            <span className={styles.lockedCoverLabel}>{t('jobGroup', 'Job group')}</span>
            <span className={styles.lockedCoverValue}>{jobGroup}</span>
          </div>
        )}
        {principalCrNo && (
          <div className={styles.lockedCoverRow}>
            <span className={styles.lockedCoverLabel}>{t('principalCr', 'Principal CR')}</span>
            <span className={styles.lockedCoverValue}>{principalCrNo}</span>
          </div>
        )}
        {policyStart && policyEnd && (
          <div className={styles.lockedCoverRow}>
            <span className={styles.lockedCoverLabel}>{t('policyPeriod', 'Policy period')}</span>
            <span className={styles.lockedCoverValue}>
              {policyStart} → {policyEnd}
            </span>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={styles.wrapper}>
      {coverError && (
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title={t('effectiveCoverCheckFailed', 'Could not verify effective cover')}
          subtitle={t(
            'effectiveCoverCheckFailedSubtitle',
            'Proceeding with cover selection SHA will reject a duplicate lock if one already exists.',
          )}
        />
      )}

      <PomsfSchemeBalancePicker
        patientUuid={patientUuid}
        patientCRId={resolvedCRId}
        onSchemeSelected={onSchemeSelected}
      />
    </div>
  );
};

export default EffectiveCoverPicker;
