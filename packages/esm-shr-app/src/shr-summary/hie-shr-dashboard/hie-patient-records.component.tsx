import React, { useEffect, useState } from 'react';
import { InlineLoading, InlineNotification, StructuredListSkeleton } from '@carbon/react';
import { useSession } from '@openmrs/esm-framework';
import { ErrorState } from '@openmrs/esm-patient-common-lib';
import { useTranslation } from 'react-i18next';
import { useHiePatientHistory } from '../shr-summary.resource';
import HiePatientRecordsAccordion from './hie-patient-records-accordion.component';
import styles from './hie-shr-dashboard.scss';

interface HiePatientRecordsProps {
  patientUuid: string;
  /** Practitioner who obtained consent; required by `/hie-patient-history`. */
  practitionerUuid?: string | null;
}

/**
 * Fetches shared health records from
 * `GET /kenyaemril/hie-patient-history?patientUuid={uuid}&practitionerUuid={uuid}`
 * once consent is available, then renders them in the SHR summary dashboard.
 */
const HiePatientRecords: React.FC<HiePatientRecordsProps> = ({ patientUuid, practitionerUuid }) => {
  const { t } = useTranslation();
  const session = useSession();
  const resolvedPractitionerUuid = practitionerUuid || session?.currentProvider?.uuid;
  const { data, error, isLoading, isValidating } = useHiePatientHistory(patientUuid, resolvedPractitionerUuid);
  const [retrievedAt, setRetrievedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (data && !isLoading && !isValidating) {
      setRetrievedAt(new Date());
    }
  }, [data, isLoading, isValidating]);

  if (!resolvedPractitionerUuid) {
    return (
      <InlineNotification
        className={styles.notification}
        kind="warning"
        lowContrast
        hideCloseButton
        title={t('practitionerRequired', 'Practitioner required')}
        subtitle={t(
          'practitionerRequiredToFetchRecords',
          'A practitioner must be associated with this consent before shared health records can be fetched.',
        )}
      />
    );
  }

  if (!patientUuid) {
    return <InlineLoading description={t('loading', 'Loading...')} />;
  }

  if (isLoading) {
    return <StructuredListSkeleton />;
  }

  if (error) {
    return <ErrorState error={error} headerTitle={t('shrRecordSummary', 'SHR Records Summary')} />;
  }

  return (
    <div className={styles.recordsSection}>
      <HiePatientRecordsAccordion data={data} retrievedAt={retrievedAt} />
    </div>
  );
};

export default HiePatientRecords;
