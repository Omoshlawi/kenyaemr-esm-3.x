import React from 'react';
import { useElectiveCheckin, usePatientPendingPreauths } from './social-health-authority/sha-virtual-claim.resource';
import styles from './billing-checkin-form.scss';
import { ComboBox, InlineLoading, InlineNotification, Tag, TextInput, TextInputSkeleton } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { PreauthQueueItem } from './social-health-authority/type';
type ElectiveItemProps = {
  patientId: string;
  electiveConsentToken?: string;
  onChangeElectiveConsentToken?: (value: string) => void;
  onClear?: () => void;
};
const ElectiveItem: React.FC<ElectiveItemProps> = ({
  patientId,
  electiveConsentToken = '',
  onChangeElectiveConsentToken,
  onClear,
}) => {
  const { error, isLoading, pendingPreauths } = usePatientPendingPreauths(patientId);
  const {
    electiveRecord,
    isLoading: isLoadingElective,
    isApproved,
    isAlreadyUsed,
  } = useElectiveCheckin(electiveConsentToken);
  const { t } = useTranslation();

  if (isLoading) {
    return <TextInputSkeleton />;
  }

  if (error) {
    return (
      <InlineNotification
        kind="error"
        title={t('errorFetchingPreauth', 'Error pulling pending preauths')}
        subtitle={error?.message}
      />
    );
  }

  return (
    <div className={styles.electiveAuthorizationContainer}>
      <ComboBox<PreauthQueueItem>
        helperText={t('authorizationCodeHelper', 'Select the code issued during the scheduled preauthorization')}
        id="elective-authorization-code"
        placeholder={t('selectAuthorizationCode', 'Select an authorization code')}
        itemToString={(item) =>
          item ? `${item.authorization_code} | ${item.intervention_name}(${item.intervention_code})` : ''
        }
        items={pendingPreauths}
        onChange={({ selectedItem }) => onChangeElectiveConsentToken?.(selectedItem?.authorization_code ?? '')}
        titleText={t('authorizationCode', 'Authorization code')}
      />
      {/* <TextInput
        id="elective-authorization-code"
        className={styles.electiveAuthorizationInput}
        labelText={t('authorizationCode', 'Authorization code')}
        helperText={t('authorizationCodeHelper', 'Enter the code issued during the scheduled preauthorization')}
        placeholder={t('authorizationCodePlaceholder', 'e.g. CMJ5RTHANG')}
        value={electiveConsentToken}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
          onChangeElectiveConsentToken?.(event.target.value.trim().toUpperCase())
        }
      /> */}

      {isLoadingElective && electiveConsentToken.length >= 6 && (
        <InlineLoading
          className={styles.electiveAuthorizationFeedback}
          description={t('verifyingAuthorizationCode', 'Verifying authorization code…')}
        />
      )}

      {!isLoadingElective && electiveRecord && (
        <div className={styles.electiveAuthorizationFeedback}>
          <InlineNotification
            aria-label={t('preauthorizationStatus', 'Preauthorization status')}
            kind={isApproved ? 'success' : 'warning'}
            lowContrast
            title={
              isApproved
                ? t('preauthorizationApproved', 'Authorization verified — ready for check-in')
                : t('preauthorizationPending', 'Authorization pending SHA approval')
            }
            subtitle={
              isApproved
                ? t('preauthorizationApprovedSubtitle', 'SHA has approved this preauth. Proceed to send OTP.')
                : t(
                    'preauthorizationPendingDetails',
                    'Current status: {{state}}. Please wait for SHA approval before check-in.',
                    { state: (electiveRecord.workflow_state ?? '').replace(/_/g, ' ') },
                  )
            }
          />
          <div className={styles.electiveInterventionCard}>
            <div className={styles.electiveInterventionRow}>
              <span className={styles.electiveInterventionLabel}>{t('intervention', 'Intervention')}</span>
              <span className={styles.electiveInterventionValue}>
                {electiveRecord.intervention_name ||
                  electiveRecord.elective_intervention_code ||
                  electiveRecord.intervention_code ||
                  '—'}
              </span>
            </div>
            <div className={styles.electiveInterventionRow}>
              <span className={styles.electiveInterventionLabel}>{t('code', 'Code')}</span>
              <span className={styles.electiveInterventionValueMono}>
                {electiveRecord.elective_intervention_code ?? electiveRecord.intervention_code ?? '—'}
              </span>
            </div>
            {electiveRecord.service_type && (
              <div className={styles.electiveInterventionRow}>
                <span className={styles.electiveInterventionLabel}>{t('serviceType', 'Service type')}</span>
                <span className={styles.electiveInterventionValue}>
                  <Tag type="blue" size="sm">
                    {electiveRecord.service_type}
                  </Tag>
                </span>
              </div>
            )}
            <div className={styles.electiveInterventionRow}>
              <span className={styles.electiveInterventionLabel}>{t('status', 'Status')}</span>
              <span className={styles.electiveInterventionValue}>
                <Tag
                  type={
                    isApproved ? 'green' : electiveRecord.workflow_state?.includes('REJECTED') ? 'red' : 'warm-gray'
                  }
                  size="sm">
                  {(electiveRecord.workflow_state ?? '—').replace('ELECTIVE_', '')}
                </Tag>
              </span>
            </div>
          </div>
        </div>
      )}

      {!isLoadingElective && isAlreadyUsed && (
        <InlineNotification
          aria-label={t('authCodeAlreadyUsed', 'Authorization code already used')}
          className={styles.electiveAuthorizationFeedback}
          kind="error"
          lowContrast
          title={t('authCodeAlreadyUsed', 'Authorization code already used')}
          subtitle={t(
            'authCodeAlreadyUsedSubtitle',
            'This code has already been used to create a claim. Each authorization code can only be used once.',
          )}
        />
      )}

      {!isLoadingElective && !isAlreadyUsed && electiveConsentToken.length >= 6 && !electiveRecord && (
        <InlineNotification
          aria-label={t('electiveRecordNotFound', 'Elective record not found')}
          className={styles.electiveAuthorizationFeedback}
          kind="error"
          lowContrast
          title={t('electiveNotFound', 'No elective record found')}
          subtitle={t('checkAuthorizationCode', 'Please verify the authorization code and try again.')}
        />
      )}
    </div>
  );
};

export default ElectiveItem;
