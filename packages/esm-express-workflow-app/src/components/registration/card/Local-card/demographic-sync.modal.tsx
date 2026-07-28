import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  InlineLoading,
  InlineNotification,
  ModalBody,
  ModalFooter,
  ModalHeader,
  StructuredListBody,
  StructuredListCell,
  StructuredListHead,
  StructuredListRow,
  StructuredListWrapper,
} from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';

import { type DemographicDifference, getDemographicDifferences } from '../../helper';
import { type LocalPatient } from '../../type';
import { syncLocalPatientFromHIE } from './demographic-sync.resource';
import styles from './demographic-sync.scss';

interface DemographicSyncModalProps {
  closeModal: () => void;
  localPatient: LocalPatient;
  localFhirPatient: fhir.Patient;
  hiePatient: fhir.Patient;
  onSynced?: () => void;
}

const DemographicSyncModal: React.FC<DemographicSyncModalProps> = ({
  closeModal,
  localPatient,
  localFhirPatient,
  hiePatient,
  onSynced,
}) => {
  const { t } = useTranslation();

  const differences = useMemo(
    () => getDemographicDifferences(localFhirPatient, hiePatient),
    [localFhirPatient, hiePatient],
  );

  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fieldLabel = (field: DemographicDifference['field']): string => {
    switch (field) {
      case 'name':
        return t('name', 'Name');
      case 'gender':
        return t('sex', 'Sex');
      case 'birthDate':
        return t('dateOfBirth', 'Date of birth');
      default:
        return field;
    }
  };

  const handleSync = async () => {
    setError(null);
    setIsSyncing(true);
    try {
      await syncLocalPatientFromHIE(localPatient, hiePatient);
      showSnackbar({
        title: t('demographicsSynced', 'Patient details updated'),
        subtitle: t('demographicsSyncedSubtitle', 'The local record now matches the HIE for the selected fields.'),
        kind: 'success',
        isLowContrast: true,
      });
      onSynced?.();
      closeModal();
    } catch (e: any) {
      const message =
        e?.responseBody?.error?.message ??
        e?.message ??
        t('demographicsSyncFailedSubtitle', 'The local record could not be updated.');
      setError(message);
      showSnackbar({
        title: t('demographicsSyncFailed', 'Could not update patient details'),
        subtitle: message,
        kind: 'error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('compareAndSyncDetails', 'Compare and sync patient details')} />
      <ModalBody>
        {differences.length === 0 ? (
          <InlineNotification
            kind="success"
            lowContrast
            hideCloseButton
            title={t('detailsAlreadyMatch', 'Details already match')}
            subtitle={t('detailsAlreadyMatchSubtitle', 'The local record matches the HIE record. Nothing to sync.')}
          />
        ) : (
          <>
            <p className={styles.helper}>
              {t(
                'compareAndSyncHelper',
                'These details differ from the HIE record. Syncing replaces the local details with the HIE details.',
              )}
            </p>

            {error && (
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                title={t('demographicsSyncFailed', 'Could not update patient details')}
                subtitle={error}
                className={styles.notification}
              />
            )}

            <StructuredListWrapper isCondensed selection={false}>
              <StructuredListHead>
                <StructuredListRow head>
                  <StructuredListCell head>{t('field', 'Field')}</StructuredListCell>
                  <StructuredListCell head>{t('localRecord', 'Local record')}</StructuredListCell>
                  <StructuredListCell head>{t('hieRecord', 'HIE record')}</StructuredListCell>
                </StructuredListRow>
              </StructuredListHead>
              <StructuredListBody>
                {differences.map((diff) => (
                  <StructuredListRow key={diff.field}>
                    <StructuredListCell>{fieldLabel(diff.field)}</StructuredListCell>
                    <StructuredListCell className={styles.localValue}>{diff.localValue || '—'}</StructuredListCell>
                    <StructuredListCell className={styles.hieValue}>{diff.hieValue || '—'}</StructuredListCell>
                  </StructuredListRow>
                ))}
              </StructuredListBody>
            </StructuredListWrapper>

            <p className={styles.warning}>
              {t(
                'compareAndSyncWarning',
                'Syncing overwrites the local details with the HIE details. This cannot be undone from here.',
              )}
            </p>
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="primary" onClick={handleSync} disabled={isSyncing || differences.length === 0}>
          {isSyncing ? (
            <InlineLoading description={t('syncing', 'Syncing') + '...'} />
          ) : (
            t('syncFromHie', 'Sync from HIE')
          )}
        </Button>
      </ModalFooter>
    </>
  );
};

export default DemographicSyncModal;
