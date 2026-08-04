import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading } from '@carbon/react';
import { CardHeader } from '@openmrs/esm-patient-common-lib';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import styles from './haemodialysis.scss';
import { FormAddButton, SectionToolbar, type SectionViewMode } from './components/shared/section-toolbar.component';

import { useHaemodialysisSession } from './resources/haemodialysis.resource';
import { parseMonitoringDatetime } from './utils/monitoring-datetime';
import { isMonitoringComplete, isMonitoringSessionExpired, type MonitoringSlotRuntime } from './utils/monitoring-slots';
import {
  buildDefaultSlotMinutes,
  canOfferMonitoringExtension,
  isMonitoringTerminated,
} from './utils/monitoring-schedule';
import FacilityHeaderView from './components/header/facility-header.component';
import PatientBiodataView from './components/biodata/patient-biodata.component';
import ScreeningStatusView from './components/screening/screening-status.view';
import PreDialysisAssessmentView from './components/pre-dialysis/pre-dialysis-assessment.view';
import PhysicianPrescriptionView from './components/prescription/physician-prescription.view';
import DialysisMachineCheckView from './components/machine-check/dialysis-machine-check.view';
import IntraDialyticMonitoringView from './components/monitoring/intra-dialytic-monitoring.view';
import PostDialysisAssessmentView from './components/post-dialysis/post-dialysis-assessment.view';
import DialysisSummaryView from './components/summary/dialysis-summary.view';
import HaemodialysisAllTablesView from './components/haemodialysis-all-tables.view';
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
  const [panelViewMode, setPanelViewMode] = useState<SectionViewMode>('graph');
  const [now, setNow] = useState(() => new Date());

  const {
    session,
    hasInitial,
    hasMachineCheck,
    isLoading,
    isNewDialysisDraft,
    canStartNewDialysis,
    tableSessions,
    startNewDialysis,
    saveInitialAssessment,
    saveMachineCheck,
    saveMonitoringSlot,
    saveMonitoringTerminate,
    saveMonitoringExtension,
    savePostDialysisAndSummary,
  } = useHaemodialysisSession(patientUuid, patient);

  const monitoringSlotMinutes = useMemo(() => {
    if (session.monitoringSlotMinutes?.length) {
      return session.monitoringSlotMinutes;
    }
    return buildDefaultSlotMinutes();
  }, [session.monitoringSlotMinutes]);
  const monitoringRuntime: MonitoringSlotRuntime = useMemo(
    () => ({
      slotLabelsMinutes: monitoringSlotMinutes,
      monitoringAction: session.monitoringAction,
    }),
    [monitoringSlotMinutes, session.monitoringAction],
  );

  const monitoringStartedAt = useMemo(
    () => parseMonitoringDatetime(session.monitoringStartedAt) ?? undefined,
    [session.monitoringStartedAt],
  );

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (isNewDialysisDraft) {
      setPanelViewMode('graph');
    }
  }, [isNewDialysisDraft]);

  const monitoringTerminated = isMonitoringTerminated(session.monitoringAction);
  const monitoringComplete = isMonitoringComplete(session.monitoring, monitoringStartedAt, now, monitoringRuntime);
  const monitoringExpired = isMonitoringSessionExpired(monitoringStartedAt, now, monitoringRuntime);
  const canOfferExtension =
    !monitoringTerminated &&
    canOfferMonitoringExtension(monitoringStartedAt, monitoringSlotMinutes, session.monitoringAction);
  const canAddMachineCheck = hasInitial && !hasMachineCheck;
  const canAddMonitoring = hasInitial && hasMachineCheck && !monitoringComplete && !monitoringTerminated;
  const canUseMonitoringActions =
    hasInitial &&
    hasMachineCheck &&
    Boolean(session.monitoringStartedAt) &&
    !monitoringTerminated &&
    (!monitoringComplete || canOfferExtension);
  const monitoringActionLabel = session.monitoring.length
    ? t('haemodialysisContinueMonitoring', 'Continue monitoring')
    : t('haemodialysisAddMonitoring', 'Add observation');
  const hasPostDialysis = Boolean(session.postDialysis);
  const canAddPostDialysis =
    hasInitial && (monitoringComplete || monitoringTerminated) && !hasPostDialysis && !canOfferExtension;

  const handleTerminateMonitoring = async (reason: string) => {
    const ok = await saveMonitoringTerminate(reason);
    if (ok) {
      setMonitoringFormOpen(false);
    }
    return ok;
  };

  /** After initial save, when the patient has 2+ sessions, show graph/table controls in the header. */
  const showMultiSessionControls = hasInitial && tableSessions.length >= 2;

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
          {!hasInitial ? <FormAddButton onClick={() => setInitialFormOpen(true)} addLabel={t('add', 'Add')} /> : null}
          <Button size="sm" kind="secondary" onClick={handleDownloadPdf}>
            {t('haemodialysisDownloadPdf', 'Download PDF')}
          </Button>
          {showMultiSessionControls ? (
            <SectionToolbar showViewToggle viewMode={panelViewMode} onViewModeChange={setPanelViewMode} />
          ) : null}
          {canStartNewDialysis ? (
            <Button size="sm" kind="primary" onClick={startNewDialysis}>
              {t('haemodialysisOpenNewDialysis', 'Open New Dialysis')}
            </Button>
          ) : null}
        </div>
      </CardHeader>

      {isNewDialysisDraft ? (
        <p className={styles.newSessionBanner}>
          {t(
            'haemodialysisNewSessionBanner',
            'New dialysis session — previous sessions are kept. Use the table view in the header to review all sessions.',
          )}
        </p>
      ) : null}

      <div className={styles.reportWrapper} ref={reportRef}>
        <FacilityHeaderView facility={session.facility} />
        <hr className={styles.divider} />
        <PatientBiodataView biodata={session.biodata} />
        <hr className={styles.divider} />

        {panelViewMode === 'table' && showMultiSessionControls ? (
          <HaemodialysisAllTablesView sessions={tableSessions} />
        ) : (
          <>
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
              monitoringSlotMinutes={monitoringSlotMinutes}
              monitoringAction={session.monitoringAction}
              monitoringRuntime={monitoringRuntime}
              monitoringComplete={monitoringComplete || monitoringTerminated}
              monitoringExpired={monitoringExpired}
              canAdd={canAddMonitoring}
              canUseActions={canUseMonitoringActions}
              addLabel={monitoringActionLabel}
              waitingForMachineCheck={hasInitial && !hasMachineCheck}
              onAdd={() => setMonitoringFormOpen(true)}
              onTerminateMonitoring={handleTerminateMonitoring}
              onExtendMonitoring={saveMonitoringExtension}
            />
            <PostDialysisAssessmentView
              data={session.postDialysis}
              canAdd={canAddPostDialysis}
              monitoringComplete={monitoringComplete || monitoringTerminated}
              onAdd={() => setPostDialysisFormOpen(true)}
            />
            <DialysisSummaryView data={session.summary} signatures={session.signatures} />
          </>
        )}
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
        slotLabelsMinutes={monitoringSlotMinutes}
        monitoringRuntime={monitoringRuntime}
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
