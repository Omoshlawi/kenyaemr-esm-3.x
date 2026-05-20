import { Button, Column, Grid, Layer } from '@carbon/react';
import { Add } from '@carbon/react/icons';
import { useLayoutType, usePatient, useSession } from '@openmrs/esm-framework';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PostOperativeSummaryForm, {
  type PostOperativeSummaryFormData,
} from './forms/post-operative-summary-form.component';
import AnaestheticRecordForm from './forms/anaesthetic-record-form.component';
import { AnaestheticGraph, InteroperativeRecordDrugGivenGraph } from './graphs';
import {
  createPartographyEncounter,
  saveDrugOrderData,
  useDrugOrders,
  usePartographyData,
} from './anaesthetic.resource';
import { useAnaestheticRecords } from './resources/anaesthetic-form.resource';
import styles from './anaesthetic.scss';
import { PARTOGRAPHY_CONCEPTS } from './types';

type PartographyProps = {
  patientUuid: string;
};

const calculateAgeFromBirthDate = (birthDateStr?: string): string => {
  if (!birthDateStr) {
    return '';
  }
  const today = new Date();
  const birthDate = new Date(birthDateStr);
  let years = today.getFullYear() - birthDate.getFullYear();
  const months = today.getMonth() - birthDate.getMonth();
  const days = today.getDate() - birthDate.getDate();
  if (months < 0 || (months === 0 && days < 0)) {
    years--;
  }
  return String(years);
};

const getInitialPageSize = (key: string, fallback = 10) => {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(key);
    if (stored && !isNaN(Number(stored))) {
      return Number(stored);
    }
  }
  return fallback;
};

const persistPageSize = (key: string, value: number) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(key, String(value));
  }
};

const getObsValue = (obs: Array<any>, uuid: string): string => {
  const found = obs.find((o) => o.concept.uuid === uuid);
  if (!found) {
    return '';
  }
  const value = found.value;
  if (value == null) {
    return '';
  }
  if (typeof value === 'object' && (value as any)?.display != null) {
    return String((value as any).display);
  }
  return String(value);
};

type PulseBPRow = {
  id: string;
  pulse: number;
  systolicBP: number;
  diastolicBP: number;
  spo2: number | undefined;
  etco2: number | undefined;
  date: string;
  time: string;
};

const Partograph: React.FC<PartographyProps> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const session = useSession();
  const layout = useLayoutType();
  const isTablet = layout === 'tablet';
  const controlSize = isTablet ? 'md' : 'sm';

  const { patient: patientData } = usePatient(patientUuid);
  const patientProp = patientData
    ? {
        uuid: patientData.id,
        name:
          patientData.name && patientData.name.length > 0
            ? `${patientData.name[0].given ? `${patientData.name[0].given.join(' ')} ` : ''}${
                patientData.name[0].family || ''
              }`
            : '',
        gender: patientData.gender || '',
        age: calculateAgeFromBirthDate(patientData.birthDate),
      }
    : undefined;

  const { mutate: mutateDrugOrders } = useDrugOrders(patientUuid || '');

  const { data: loadedDrugsIVFluidsData = [], mutate: mutateDrugsIVFluidsData } = usePartographyData(
    patientUuid || '',
    'drugs-fluids',
  );

  const { data: loadedPostOperativeSummaryData = [], mutate: mutatePostOperativeSummaryData } = usePartographyData(
    patientUuid || '',
    'post-operative-summary',
  );

  const { data: loadedPulseData = [], mutate: mutatePulseData } = usePartographyData(
    patientUuid || '',
    'maternal-pulse',
  );
  const { data: loadedBPData = [], mutate: mutateBPData } = usePartographyData(patientUuid || '', 'blood-pressure');

  const { records: anaestheticRecords } = useAnaestheticRecords(patientUuid || '');
  const latestTimeGiven = useMemo(() => {
    const times = anaestheticRecords
      .map((r) => r.timeGiven)
      .filter((time): time is string => typeof time === 'string' && /^\d{2}:\d{2}$/.test(time));

    if (times.length === 0) {
      return undefined;
    }

    return times.reduce((latest, current) => {
      const [lh, lm] = latest.split(':').map(Number);
      const [ch, cm] = current.split(':').map(Number);
      return ch * 60 + cm > lh * 60 + lm ? current : latest;
    });
  }, [anaestheticRecords]);

  const [isPostOperativeSummaryFormOpen, setIsPostOperativeSummaryFormOpen] = useState(false);
  const [isSavingPostOperativeSummary, setIsSavingPostOperativeSummary] = useState(false);

  const [pulseBPViewMode, setPulseBPViewMode] = useState<'graph' | 'table'>('graph');
  const [pulseBPCurrentPage, setPulseBPCurrentPage] = useState(1);
  const [pulseBPPageSize, setPulseBPPageSize] = useState(() => getInitialPageSize('pulseBPPageSize'));

  const [drugsIVFluidsViewMode, setDrugsIVFluidsViewMode] = useState<'graph' | 'table'>('graph');
  const [drugsIVFluidsCurrentPage, setDrugsIVFluidsCurrentPage] = useState(1);
  const [drugsIVFluidsPageSize, setDrugsIVFluidsPageSize] = useState(() => getInitialPageSize('drugsIVFluidsPageSize'));

  if (!patientUuid) {
    return (
      <div className={styles.partographyContainer}>
        <Layer>
          <Grid>
            <Column lg={16} md={8} sm={4}>
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h4>{t('noPatientSelected', 'No patient selected')}</h4>
                <p>{t('selectPatientMessage', 'Please select a patient to view partography data.')}</p>
              </div>
            </Column>
          </Grid>
        </Layer>
      </div>
    );
  }

  const handleInteroperativeRecordDrugGivenFormSubmit = async (formData: {
    maintenanceAgent: string;
    concentrationRate: string;
    medicationGiven: string;
    fluidsGiven: string;
  }) => {
    const hasMaintenance = Boolean(formData.maintenanceAgent);
    const hasMedication = Boolean(formData.medicationGiven?.trim());
    const hasFluids = Boolean(formData.fluidsGiven);

    if (!hasMaintenance && !hasMedication && !hasFluids) {
      throw new Error('Enter a maintenance agent, medication given, or fluids given before saving');
    }

    const result = await saveDrugOrderData(
      patientUuid,
      {
        maintenanceAgent: formData.maintenanceAgent,
        concentrationRate: formData.concentrationRate,
        medicationGiven: formData.medicationGiven,
        fluidsGiven: formData.fluidsGiven,
      },
      session?.sessionLocation?.uuid,
      session?.currentProvider?.uuid,
    );

    if (!result.success) {
      throw new Error(result.message || 'Failed to save drugs and IV fluids data');
    }

    await mutateDrugsIVFluidsData();
  };

  const handleDrugOrderDataSaved = () => {
    mutateDrugOrders();
    mutateDrugsIVFluidsData();
    setTimeout(() => {
      mutateDrugOrders();
      mutateDrugsIVFluidsData();
    }, 2000);
  };

  const handlePostOperativeSummarySubmit = async (formData: PostOperativeSummaryFormData) => {
    setIsSavingPostOperativeSummary(true);
    try {
      const result = await createPartographyEncounter(patientUuid, 'post-operative-summary', {
        position: formData.position,
        estimatedBloodLoss: formData.estimatedBloodLoss,
        resultsOfOperation: formData.resultsOfOperation,
        postOperativeManagement: formData.postOperativeManagement,
      });

      if (!result.success) {
        throw new Error(result.message || 'Failed to save post operative summary data');
      }

      await mutatePostOperativeSummaryData();
      setIsPostOperativeSummaryFormOpen(false);
    } finally {
      setIsSavingPostOperativeSummary(false);
    }
  };

  const handlePulseBPFormSubmit = async (formData: {
    heartRate: number;
    systolicBP: number;
    diastolicBP: number;
    spo2: number;
    etco2: number;
    time: string;
  }) => {
    if (!formData.heartRate || !formData.systolicBP || !formData.diastolicBP || !formData.time) {
      alert('Invalid data detected. Please ensure all fields are properly filled.');
      return;
    }

    const result = await createPartographyEncounter(
      patientUuid,
      'pulse-bp-combined',
      {
        heartRate: formData.heartRate,
        systolic: formData.systolicBP,
        diastolic: formData.diastolicBP,
        spo2: formData.spo2,
        etco2: formData.etco2,
        time: formData.time,
      },
      session?.sessionLocation?.uuid,
      session?.currentProvider?.uuid,
    );

    if (!result.success) {
      throw new Error(result.message || 'Failed to save anaesthetic record');
    }

    await mutatePulseData();
    await mutateBPData();
    setPulseBPViewMode((prev) => (prev === 'table' ? 'graph' : 'table'));
    setTimeout(() => setPulseBPViewMode('graph'), 0);
  };

  const getInteroperativeRecordDrugGivenTableData = () => {
    const MAINTENANCE_OF_ANAESTHESIA_UUID = '164254AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const HALOTHANE_UUID = '77343AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const SEVOFLURANE_UUID = '83872AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const ISOFLURANE_UUID = '78258AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const PROPOFOL_UUID = '82726AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const KETAMINE_UUID = '78467AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const DEXMEDETOMIDINE_UUID = '74640AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const CONCENTRATION_RATE_UUID = '160632AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const MEDICATION_GIVEN_UUID = '164231AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const IV_FLUIDS_UUID = '161911AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const DRUG_NAME_UUID = 'c3082af8-f935-40c5-aa5b-74c684e81aea';

    const maintenanceLabels: Record<string, string> = {
      [HALOTHANE_UUID]: 'Halothane',
      [SEVOFLURANE_UUID]: 'Sevoflurane',
      [ISOFLURANE_UUID]: 'Isoflurane',
      [PROPOFOL_UUID]: 'Propofol',
      [KETAMINE_UUID]: 'Ketamine',
      [DEXMEDETOMIDINE_UUID]: 'Dexmedetomidine',
    };

    const resolveMaintenanceLabel = (value: string) => {
      if (!value) {
        return '';
      }
      if (maintenanceLabels[value]) {
        return maintenanceLabels[value];
      }
      const normalized = value.toLowerCase();
      if (normalized === 'sevoflurane') {
        return 'Sevoflurane';
      }
      const matched = Object.values(maintenanceLabels).find((label) => label.toLowerCase() === normalized);
      return matched || value;
    };

    return (loadedDrugsIVFluidsData || [])
      .filter((encounter) => {
        const obs = encounter.obs || [];
        const maintenance = getObsValue(obs, MAINTENANCE_OF_ANAESTHESIA_UUID);
        const medicationValues = obs
          .filter((o) => o.concept.uuid === MEDICATION_GIVEN_UUID || o.concept.uuid === DRUG_NAME_UUID)
          .map((o) => {
            if (o.value == null) {
              return '';
            }
            if (typeof o.value === 'object' && (o.value as any)?.display != null) {
              return String((o.value as any).display);
            }
            return String(o.value);
          })
          .filter(Boolean);
        const fluidsGiven = getObsValue(obs, IV_FLUIDS_UUID);

        return Boolean(maintenance || medicationValues.length > 0 || fluidsGiven);
      })
      .map((encounter) => {
        const obs = encounter.obs || [];

        const concentrationRate = obs
          .filter((o) => o.concept.uuid === CONCENTRATION_RATE_UUID)
          .map((o) => {
            if (o.value == null) {
              return '';
            }
            if (typeof o.value === 'object' && (o.value as any)?.display != null) {
              return String((o.value as any).display).trim();
            }
            return String(o.value).trim();
          })
          .find((value) => value.length > 0);

        const medicationValues = obs
          .filter((o) => o.concept.uuid === MEDICATION_GIVEN_UUID || o.concept.uuid === DRUG_NAME_UUID)
          .map((o) => {
            if (o.value == null) {
              return '';
            }
            if (typeof o.value === 'object' && (o.value as any)?.display != null) {
              return String((o.value as any).display);
            }
            return String(o.value);
          })
          .filter(Boolean);

        const legacyFluids = getObsValue(obs, IV_FLUIDS_UUID);

        return {
          id: encounter.uuid,
          date: encounter.encounterDatetime ? new Date(encounter.encounterDatetime).toLocaleDateString() : '',
          maintenanceAgent: resolveMaintenanceLabel(getObsValue(obs, MAINTENANCE_OF_ANAESTHESIA_UUID)),
          concentrationRate: concentrationRate || '',
          medicationGiven: medicationValues[0] || '',
          fluidsGiven: medicationValues[1] || legacyFluids || '',
          source: 'backend',
        };
      });
  };

  const getPostOperativeSummaryTableData = () => {
    const POSITION_UUID = '357b7ae8-1326-4c2c-b1c0-7e7260fba2b7';
    const ESTIMATED_BLOOD_LOSS_UUID = '161928AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const RESULTS_OF_OPERATION_UUID = 'da2029a1-193f-48df-88d8-45d3258458c1';
    const POST_OPERATIVE_MANAGEMENT_UUID = 'dd22e450-256e-4925-bcd1-ce39454fb46f';

    return (loadedPostOperativeSummaryData || [])
      .map((encounter) => {
        const obs = encounter.obs || [];
        return {
          id: encounter.uuid,
          date: encounter.encounterDatetime ? new Date(encounter.encounterDatetime).toLocaleDateString() : '',
          position: getObsValue(obs, POSITION_UUID),
          estimatedBloodLoss: getObsValue(obs, ESTIMATED_BLOOD_LOSS_UUID),
          resultsOfOperation: getObsValue(obs, RESULTS_OF_OPERATION_UUID),
          postOperativeManagement: getObsValue(obs, POST_OPERATIVE_MANAGEMENT_UUID),
        };
      })
      .filter(
        (entry) =>
          entry.position || entry.estimatedBloodLoss || entry.resultsOfOperation || entry.postOperativeManagement,
      );
  };

  const getPulseBPTableData = (): PulseBPRow[] => {
    const ANAESTHETIC_SYSTOLIC_BP_CONCEPT = '5085AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const ANAESTHETIC_DIASTOLIC_BP_CONCEPT = '5086AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const ANAESTHETIC_HEART_RATE_CONCEPT = '5087AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const ANAESTHETIC_SPO2_CONCEPT = '5092AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const ANAESTHETIC_ETCO2_CONCEPT = 'c6f370bd-d25d-4c1b-87d4-973eaaa73569';
    const PULSE_TIME_SLOT_CONCEPT = PARTOGRAPHY_CONCEPTS['pulse-time-slot'];

    const bpEntries = (loadedBPData || [])
      .map((encounter) => {
        const systolicObs = encounter.obs.find(
          (obs) =>
            obs.concept.uuid === ANAESTHETIC_SYSTOLIC_BP_CONCEPT ||
            obs.concept.uuid === PARTOGRAPHY_CONCEPTS['systolic-bp'],
        );
        const diastolicObs = encounter.obs.find(
          (obs) =>
            obs.concept.uuid === ANAESTHETIC_DIASTOLIC_BP_CONCEPT ||
            obs.concept.uuid === PARTOGRAPHY_CONCEPTS['diastolic-bp'],
        );
        const spo2Obs = encounter.obs.find((obs) => obs.concept.uuid === ANAESTHETIC_SPO2_CONCEPT);
        const etco2Obs = encounter.obs.find((obs) => obs.concept.uuid === ANAESTHETIC_ETCO2_CONCEPT);
        const timeObs = encounter.obs.find(
          (obs) =>
            obs.concept.uuid === PULSE_TIME_SLOT_CONCEPT &&
            typeof obs.value === 'string' &&
            obs.value.startsWith('Time:'),
        );

        if (!systolicObs || !diastolicObs) {
          return null;
        }

        const explicitTime =
          timeObs && typeof timeObs.value === 'string' ? timeObs.value.replace('Time:', '').trim() : '';

        return {
          datetime: new Date(encounter.encounterDatetime),
          systolicBP: typeof systolicObs.value === 'number' ? systolicObs.value : parseFloat(systolicObs.value),
          diastolicBP: typeof diastolicObs.value === 'number' ? diastolicObs.value : parseFloat(diastolicObs.value),
          spo2: spo2Obs ? (typeof spo2Obs.value === 'number' ? spo2Obs.value : parseFloat(spo2Obs.value)) : '',
          etco2: etco2Obs ? (typeof etco2Obs.value === 'number' ? etco2Obs.value : parseFloat(etco2Obs.value)) : '',
          time: explicitTime,
        };
      })
      .filter(Boolean);

    const rows = (loadedPulseData || [])
      .map((encounter, index) => {
        const heartRateObs = encounter.obs.find(
          (obs) =>
            obs.concept.uuid === ANAESTHETIC_HEART_RATE_CONCEPT ||
            obs.concept.uuid === PARTOGRAPHY_CONCEPTS['maternal-pulse'],
        );

        const timeObs = encounter.obs.find(
          (obs) =>
            obs.concept.uuid === PULSE_TIME_SLOT_CONCEPT &&
            typeof obs.value === 'string' &&
            obs.value.startsWith('Time:'),
        );

        const pulse = heartRateObs
          ? typeof heartRateObs.value === 'number'
            ? heartRateObs.value
            : parseFloat(String(heartRateObs.value))
          : null;

        const pulseDate = new Date(encounter.encounterDatetime);
        const date = pulseDate.toLocaleDateString();
        const time =
          timeObs && typeof timeObs.value === 'string'
            ? timeObs.value.replace('Time:', '').trim()
            : pulseDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let closestBP: any = null;
        let minDiff = 60 * 60 * 1000;
        for (const bp of bpEntries as Array<any>) {
          const diff = Math.abs(bp.datetime.getTime() - pulseDate.getTime());
          if (diff < minDiff) {
            minDiff = diff;
            closestBP = bp;
          }
        }

        return {
          id: `pulse-bp-${index}`,
          pulse,
          systolicBP: closestBP?.systolicBP,
          diastolicBP: closestBP?.diastolicBP,
          spo2: typeof closestBP?.spo2 === 'number' && !isNaN(closestBP.spo2) ? closestBP.spo2 : undefined,
          etco2: typeof closestBP?.etco2 === 'number' && !isNaN(closestBP.etco2) ? closestBP.etco2 : undefined,
          date,
          time,
        };
      })
      .filter(
        (row): row is PulseBPRow =>
          typeof row.pulse === 'number' &&
          !isNaN(row.pulse) &&
          typeof row.systolicBP === 'number' &&
          !isNaN(row.systolicBP) &&
          typeof row.diastolicBP === 'number' &&
          !isNaN(row.diastolicBP),
      );

    return rows;
  };

  return (
    <div className={styles.partographyContainer}>
      <Layer>
        <Grid>
          <Column lg={16} md={8} sm={4}>
            <AnaestheticRecordForm patientUuid={patientUuid} />

            <AnaestheticGraph
              data={getPulseBPTableData()}
              tableData={getPulseBPTableData()}
              viewMode={pulseBPViewMode}
              currentPage={pulseBPCurrentPage}
              pageSize={pulseBPPageSize}
              totalItems={getPulseBPTableData().length}
              controlSize={controlSize}
              onAddData={() => {}}
              onViewModeChange={setPulseBPViewMode}
              onPageChange={setPulseBPCurrentPage}
              onPageSizeChange={(size) => {
                setPulseBPPageSize(size);
                persistPageSize('pulseBPPageSize', size);
              }}
              isAddButtonDisabled={false}
              minTime={latestTimeGiven}
              onAnaestheticSubmit={handlePulseBPFormSubmit}
            />

            <InteroperativeRecordDrugGivenGraph
              data={getInteroperativeRecordDrugGivenTableData()}
              tableData={getInteroperativeRecordDrugGivenTableData()}
              viewMode={drugsIVFluidsViewMode}
              currentPage={drugsIVFluidsCurrentPage}
              pageSize={drugsIVFluidsPageSize}
              totalItems={getInteroperativeRecordDrugGivenTableData().length}
              controlSize={controlSize}
              onAddData={() => {}}
              onViewModeChange={setDrugsIVFluidsViewMode}
              onPageChange={setDrugsIVFluidsCurrentPage}
              onPageSizeChange={(size) => {
                setDrugsIVFluidsPageSize(size);
                persistPageSize('drugsIVFluidsPageSize', size);
              }}
              isAddButtonDisabled={false}
              onInteroperativeRecordDrugGivenSubmit={handleInteroperativeRecordDrugGivenFormSubmit}
              onDataSaved={handleDrugOrderDataSaved}
              patient={patientProp}
            />

            <div className={styles.fetalHeartRateSection}>
              <div className={styles.fetalHeartRateContainer}>
                <div className={styles.fetalHeartRateHeader}>
                  <div className={styles.fetalHeartRateTitle}>
                    <h3 className={styles.fetalHeartRateHeading}>
                      {t('postOperativeSummary', 'Post Operative Summary')}
                    </h3>
                  </div>
                  <div className={styles.fetalHeartRateControls}>
                    <Button
                      kind="primary"
                      size={controlSize}
                      renderIcon={Add}
                      iconDescription="Add post operative summary"
                      onClick={() => setIsPostOperativeSummaryFormOpen(true)}
                      className={styles.addButton}>
                      Add
                    </Button>
                  </div>
                </div>

                <div className={styles.tableContainer}>
                  {getPostOperativeSummaryTableData().length > 0 ? (
                    <div className={styles.drugsIVFluidsTable}>
                      <table className={styles.dataTable}>
                        <thead>
                          <tr>
                            <th>{t('date', 'Date')}</th>
                            <th>{t('position', 'Position')}</th>
                            <th>{t('estimatedBloodLoss', 'Estimated Blood Loss (ML)')}</th>
                            <th>{t('resultsOfOperation', 'Results of Operation')}</th>
                            <th>{t('postOperativeManagement', 'Post-Operative management')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getPostOperativeSummaryTableData().map((item) => (
                            <tr key={item.id}>
                              <td>{item.date}</td>
                              <td>{item.position || '-'}</td>
                              <td>{item.estimatedBloodLoss || '-'}</td>
                              <td>{item.resultsOfOperation || '-'}</td>
                              <td>{item.postOperativeManagement || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className={styles.emptyTable}>
                      <p>{t('noPostOperativeSummary', 'No post-operative summary recorded')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <PostOperativeSummaryForm
              isOpen={isPostOperativeSummaryFormOpen}
              onClose={() => setIsPostOperativeSummaryFormOpen(false)}
              onSubmit={handlePostOperativeSummarySubmit}
              isSaving={isSavingPostOperativeSummary}
            />
          </Column>
        </Grid>
      </Layer>
    </div>
  );
};

export default Partograph;
