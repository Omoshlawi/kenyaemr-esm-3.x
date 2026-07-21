import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTableSkeleton, InlineNotification } from '@carbon/react';
import { ErrorState, useVisit, type Visit } from '@openmrs/esm-framework';
import { usePatientVisits, useVisitSummary } from './visit-summary.resource';
import VisitSummaryHeader from './visit-summary-header.component';
import VisitSummaryVitals from './visit-summary-vitals.component';
import VisitSummaryComplaints from './visit-summary-complaints.component';
import VisitSummaryConditions from './visit-summary-conditions.component';
import VisitSummaryAllergies from './visit-summary-allergies.component';
import VisitSummaryClinicalNotes from './visit-summary-clinical-notes.component';
import VisitSummaryLabResults from './visit-summary-lab-results.component';
import { VisitSummaryImaging, VisitSummaryProceduresOnly } from './visit-summary-procedures.component';
import VisitSummaryDiagnoses from './visit-summary-diagnoses.component';
import VisitSummaryMedications from './visit-summary-medications.component';
import styles from './visit-summary.scss';

type PatientVisitSummaryProps = {
  patientUuid: string;
};

const PatientVisitSummary: React.FC<PatientVisitSummaryProps> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const { activeVisit, isLoading } = useVisit(patientUuid);
  const { visits, isLoading: isVisitsLoading } = usePatientVisits(patientUuid);
  const [selectedVisitUuid, setSelectedVisitUuid] = useState<string | null>(null);

  useEffect(() => {
    if (selectedVisitUuid) {
      return;
    }
    if (activeVisit) {
      setSelectedVisitUuid(activeVisit.uuid);
    } else if (visits.length > 0) {
      setSelectedVisitUuid(visits[0].uuid);
    }
  }, [activeVisit, visits, selectedVisitUuid]);

  if (isLoading || isVisitsLoading) {
    return <DataTableSkeleton />;
  }

  const currentVisitUuid = selectedVisitUuid ?? activeVisit?.uuid ?? visits[0]?.uuid;

  if (!currentVisitUuid) {
    return (
      <div className={styles.emptyState}>
        <p>{t('noVisitsFound', 'No visits found for this patient.')}</p>
      </div>
    );
  }

  return (
    <VisitSummary
      patientUuid={patientUuid}
      visitUuid={currentVisitUuid}
      visits={visits}
      onVisitChange={setSelectedVisitUuid}
    />
  );
};

type VisitSummaryProps = {
  patientUuid: string;
  visitUuid: string;
  visits: Visit[];
  onVisitChange: (uuid: string) => void;
};

export const VisitSummary: React.FC<VisitSummaryProps> = ({ patientUuid, visitUuid, visits, onVisitChange }) => {
  const { t } = useTranslation();
  const { summary, isLoading, error } = useVisitSummary(visitUuid);

  if (isLoading) {
    return <DataTableSkeleton />;
  }

  if (error) {
    return <ErrorState error={error} headerTitle={t('caseSummary', 'Case Summary')} />;
  }

  if (!summary) {
    return null;
  }

  const { vitals, conditions, allergies, medications, clinicalNotes, procedures, imaging, diagnoses, complaints } =
    summary;

  const criticalAlerts = buildCriticalAlerts(vitals);

  const hasHistoryData =
    (complaints?.length ?? 0) + (conditions?.length ?? 0) + (allergies?.length ?? 0) + (clinicalNotes?.length ?? 0) > 0;

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <VisitSummaryHeader
        patientUuid={patientUuid}
        visitUuid={visitUuid}
        visitDate={summary.visitDate}
        visitType={summary.visitType}
        weight={vitals?.weight}
        visits={visits}
        onVisitChange={onVisitChange}
      />

      {criticalAlerts.map((alert) => (
        <div key={alert} className={styles.alertBanner}>
          <InlineNotification
            kind="warning"
            title={t('criticalAlert', 'Critical Alert')}
            subtitle={alert}
            lowContrast
            hideCloseButton
          />
        </div>
      ))}
      <VisitSummaryVitals vitals={vitals} />
      {hasHistoryData && (
        <div className={styles.groupSection}>
          <div className={styles.groupSectionHeader}>
            <h2>{t('historyAndExamination', 'HISTORY & EXAMINATION')}</h2>
          </div>
          <VisitSummaryComplaints complaints={complaints} />
          <VisitSummaryConditions conditions={conditions} />
          <VisitSummaryAllergies allergies={allergies} />
          <VisitSummaryClinicalNotes clinicalNotes={clinicalNotes} />
        </div>
      )}
      <VisitSummaryLabResults labResults={summary.labResults} />
      <VisitSummaryImaging imaging={imaging} />
      <VisitSummaryProceduresOnly procedures={procedures} />
      <VisitSummaryDiagnoses diagnoses={diagnoses} />
      <VisitSummaryMedications medications={medications} />
    </div>
  );
};

function buildCriticalAlerts(vitals: { bloodPressure?: { value?: number | string | null } } | undefined): string[] {
  const bpValue = vitals?.bloodPressure?.value;
  if (!bpValue) {
    return [];
  }
  // TODO: Once we update kenyaemr to use platform 2.7.0 we can rely on concept-reference range that is patient aware
  const [sys, dia] = String(bpValue).split('/').map(Number);
  if (sys >= 140 || dia >= 90) {
    return [`Critical Alert: Elevated Blood Pressure — BP recorded at ${bpValue} mmHg.`];
  }
  return [];
}

export default PatientVisitSummary;
