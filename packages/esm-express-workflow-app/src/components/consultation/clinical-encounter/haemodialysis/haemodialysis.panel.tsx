import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading } from '@carbon/react';
import { Add } from '@carbon/react/icons';
import { CardHeader } from '@openmrs/esm-patient-common-lib';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import styles from './haemodialysis.scss';

import { useHaemodialysisSession } from './resources/haemodialysis.resource';
import { parseMonitoringDatetime } from './utils/monitoring-datetime';
import { isMonitoringComplete, isMonitoringSessionExpired } from './utils/monitoring-slots';
import FacilityHeaderView from './components/header/facility-header.component';
import PatientBiodataView from './components/biodata/patient-biodata.component';
import ScreeningStatusView from './components/screening/screening-status.view';
import PreDialysisAssessmentView from './components/pre-dialysis/pre-dialysis-assessment.view';
import PhysicianPrescriptionView from './components/prescription/physician-prescription.view';
import DialysisMachineCheckView from './components/machine-check/dialysis-machine-check.view';
import IntraDialyticMonitoringView from './components/monitoring/intra-dialytic-monitoring.view';
import PostDialysisAssessmentView from './components/post-dialysis/post-dialysis-assessment.view';
import DialysisSummaryView from './components/summary/dialysis-summary.view';
import InitialAssessmentForm from './forms/initial-assessment.form';
import DialysisMachineCheckForm from './forms/dialysis-machine-check.form';
import IntraDialyticMonitoringForm from './forms/intra-dialytic-monitoring.form';
import PostDialysisAssessmentForm from './forms/post-dialysis-assessment.form';

type Props = {
  state?: {
    patientUuid?: string;
    patient?: fhir.Patient;
  };
};

const HaemodialysisPanel: React.FC<Props> = ({ state }) => {
  const { t } = useTranslation();
  const patientUuid = state?.patientUuid;
  const patient = state?.patient;
  const reportRef = useRef<HTMLDivElement | null>(null);
  const [initialFormOpen, setInitialFormOpen] = useState(false);
  const [machineCheckFormOpen, setMachineCheckFormOpen] = useState(false);
  const [monitoringFormOpen, setMonitoringFormOpen] = useState(false);
  const [postDialysisFormOpen, setPostDialysisFormOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const {
    session,
    hasInitial,
    hasMachineCheck,
    isLoading,
    saveInitialAssessment,
    saveMachineCheck,
    saveMonitoringSlot,
    savePostDialysisAndSummary,
  } = useHaemodialysisSession(patientUuid, patient);

  const monitoringStartedAt = useMemo(
    () => parseMonitoringDatetime(session.monitoringStartedAt) ?? undefined,
    [session.monitoringStartedAt],
  );

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const monitoringComplete = isMonitoringComplete(session.monitoring, monitoringStartedAt, now);
  const monitoringExpired = isMonitoringSessionExpired(monitoringStartedAt, now);
  const canAddMachineCheck = hasInitial && !hasMachineCheck;
  const canAddMonitoring = hasInitial && hasMachineCheck && !monitoringComplete;
  const monitoringActionLabel = session.monitoring.length
    ? t('haemodialysisContinueMonitoring', 'Continue monitoring')
    : t('haemodialysisAddMonitoring', 'Add observation');
  const hasPostDialysis = Boolean(session.postDialysis);
  const canAddPostDialysis = hasInitial && monitoringComplete && !hasPostDialysis;

  const handleDownloadPdf = async () => {
    if (!reportRef.current) {
      return;
    }
    const canvas = await html2canvas(reportRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = 210;
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`haemodialysis-${patientUuid ?? 'report'}.pdf`);
  };

  if (isLoading) {
    return (
      <div className={styles.haemodialysis}>
        <CardHeader title={t('haemodialysis', 'Haemodialysis')}>
          <span />
        </CardHeader>
        <InlineLoading description={t('loading', 'Loading...')} />
      </div>
    );
  }

  return (
    <div className={styles.haemodialysis}>
      <CardHeader title={t('haemodialysis', 'Haemodialysis')}>
        <div className={styles.headerActions}>
          {!hasInitial ? (
            <Button size="sm" kind="ghost" renderIcon={Add} onClick={() => setInitialFormOpen(true)}>
              {t('add', 'Add')}
            </Button>
          ) : null}
          <Button size="sm" kind="secondary" onClick={handleDownloadPdf}>
            {t('haemodialysisDownloadPdf', 'Download PDF')}
          </Button>
        </div>
      </CardHeader>

      <div className={styles.reportWrapper} ref={reportRef}>
        <FacilityHeaderView facility={session.facility} />
        <hr className={styles.divider} />
        <PatientBiodataView biodata={session.biodata} />
        <hr className={styles.divider} />

        <ScreeningStatusView data={session.screening} />
        <PreDialysisAssessmentView data={session.preDialysis} />
        <PhysicianPrescriptionView data={session.prescription} />

        <DialysisMachineCheckView
          data={session.machineCheck}
          hasInitial={hasInitial}
          canAdd={canAddMachineCheck}
          onAdd={() => setMachineCheckFormOpen(true)}
        />

        <IntraDialyticMonitoringView
          rows={session.monitoring}
          monitoringStartedAt={session.monitoringStartedAt}
          monitoringComplete={monitoringComplete}
          monitoringExpired={monitoringExpired}
          canAdd={canAddMonitoring}
          addLabel={monitoringActionLabel}
          waitingForMachineCheck={hasInitial && !hasMachineCheck}
          onAdd={() => setMonitoringFormOpen(true)}
        />
        <PostDialysisAssessmentView
          data={session.postDialysis}
          canAdd={canAddPostDialysis}
          monitoringComplete={monitoringComplete}
          onAdd={() => setPostDialysisFormOpen(true)}
        />
        <DialysisSummaryView data={session.summary} signatures={session.signatures} />
      </div>

      <InitialAssessmentForm
        open={initialFormOpen}
        onClose={() => setInitialFormOpen(false)}
        onSave={saveInitialAssessment}
      />
      <DialysisMachineCheckForm
        open={machineCheckFormOpen}
        onClose={() => setMachineCheckFormOpen(false)}
        onSave={saveMachineCheck}
      />
      <IntraDialyticMonitoringForm
        open={monitoringFormOpen}
        onClose={() => setMonitoringFormOpen(false)}
        monitoringStartedAt={session.monitoringStartedAt}
        rows={session.monitoring}
        onSaveSlot={saveMonitoringSlot}
      />
      <PostDialysisAssessmentForm
        open={postDialysisFormOpen}
        onClose={() => setPostDialysisFormOpen(false)}
        onSave={async (values) => savePostDialysisAndSummary(values.postDialysis, values.summary)}
      />
    </div>
  );
};

export default HaemodialysisPanel;
