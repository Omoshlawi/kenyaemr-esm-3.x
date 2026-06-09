import React from 'react';
import { useTranslation } from 'react-i18next';
import { DataTableSkeleton, InlineNotification } from '@carbon/react';
import { ErrorState, useVisit } from '@openmrs/esm-framework';
import { useVisitSummary } from './visit-summary.resource';
import VisitSummaryHeader from './visit-summary-header.component';
import VisitSummaryDiagnoses from './visit-summary-diagnoses.component';
import VisitSummaryComplaints from './visit-summary-complaints.component';
import VisitSummaryVitals from './visit-summary-vitals.component';
import VisitSummaryConditions from './visit-summary-conditions.component';
import VisitSummaryLabResults from './visit-summary-lab-results.component';
import VisitSummaryAllergies from './visit-summary-allergies.component';
import VisitSummaryMedications from './visit-summary-medications.component';
import VisitSummaryProcedures from './visit-summary-procedures.component';
import VisitSummaryClinicalNotes from './visit-summary-clinical-notes.component';
import styles from './visit-summary.scss';

type PatientVisitSummaryProps = {
  patientUuid: string;
};

const PatientVisitSummary: React.FC<PatientVisitSummaryProps> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const { activeVisit, isLoading } = useVisit(patientUuid);

  if (isLoading) {
    return <DataTableSkeleton />;
  }

  if (!activeVisit) {
    return (
      <div className={styles.emptyState}>
        <p>{t('noActiveVisit', 'No active visit found for this patient.')}</p>
      </div>
    );
  }

  return <VisitSummary patientUuid={patientUuid} visitUuid={activeVisit.uuid} />;
};

type VisitSummaryProps = {
  patientUuid: string;
  visitUuid: string;
};

export const VisitSummary: React.FC<VisitSummaryProps> = ({ patientUuid, visitUuid }) => {
  const { t } = useTranslation();
  const { summary, isLoading, error } = useVisitSummary(visitUuid);

  if (isLoading) {
    return <DataTableSkeleton />;
  }

  if (error) {
    return <ErrorState error={error} headerTitle={t('visitSummary', 'Visit Summary')} />;
  }

  if (!summary) {
    return null;
  }

  const { vitals, conditions, allergies, medications, clinicalNotes, procedures, imaging, diagnoses, complaints } =
    summary;

  const criticalAlerts = buildCriticalAlerts(vitals);

  return (
    <div className={styles.container}>
      <VisitSummaryHeader
        patientUuid={patientUuid}
        visitUuid={visitUuid}
        visitDate={summary.visitDate}
        weight={vitals?.weight}
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

      <VisitSummaryDiagnoses diagnoses={diagnoses} />
      <VisitSummaryComplaints complaints={complaints} />

      <VisitSummaryVitals vitals={vitals} />
      <VisitSummaryConditions conditions={conditions} />
      <VisitSummaryLabResults labResults={summary.labResults} />
      <VisitSummaryAllergies allergies={allergies} />
      <VisitSummaryMedications medications={medications} />
      <VisitSummaryProcedures procedures={procedures} imaging={imaging} />
      <VisitSummaryClinicalNotes clinicalNotes={clinicalNotes} />
    </div>
  );
};

function buildCriticalAlerts(vitals: { bloodPressure?: { value?: number | string | null } } | undefined): string[] {
  const bpValue = vitals?.bloodPressure?.value;
  if (!bpValue) {
    return [];
  }
  const [sys, dia] = String(bpValue).split('/').map(Number);
  if (sys >= 140 || dia >= 90) {
    return [`Critical Alert: Elevated Blood Pressure — BP recorded at ${bpValue} mmHg.`];
  }
  return [];
}

export default PatientVisitSummary;
