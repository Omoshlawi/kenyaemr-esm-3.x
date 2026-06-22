import React from 'react';
import { useTranslation } from 'react-i18next';
import type { VisitSummary } from './visit-summary.resource';
import styles from './visit-summary.scss';

type VitalsProps = {
  vitals: VisitSummary['vitals'];
};

type VitalCardProps = {
  label: string;
  value: number | string | null | undefined;
  unit: React.ReactNode;
};

const VitalCard: React.FC<VitalCardProps> = ({ label, value, unit }) => (
  <div className={styles.vitalCard}>
    <p className={styles.vitalLabel}>{label}</p>
    <div className={styles.vitalValue}>
      {value ?? '—'}
      {value != null && unit}
    </div>
  </div>
);

const VisitSummaryVitals: React.FC<VitalsProps> = ({ vitals }) => {
  const { t } = useTranslation();

  const bmi = React.useMemo(() => {
    const weight = Number(vitals?.weight?.value);
    const heightCm = Number(vitals?.height?.value);
    if (!weight || !heightCm) {
      return null;
    }
    const heightM = heightCm / 100;
    return Math.round((weight / (heightM * heightM)) * 10) / 10;
  }, [vitals?.weight?.value, vitals?.height?.value]);

  const hasAnyVital =
    vitals?.temperature?.value != null ||
    vitals?.pulse?.value != null ||
    vitals?.bloodPressure?.value != null ||
    vitals?.respiratoryRate?.value != null ||
    vitals?.oxygenSaturation?.value != null ||
    vitals?.weight?.value != null ||
    vitals?.height?.value != null ||
    vitals?.muac?.value != null;

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>{t('latestVitals', 'Latest Vitals')}</h2>
      </div>
      {hasAnyVital ? (
        <div className={styles.vitalsGrid}>
          <VitalCard
            label={t('temperature', 'Temperature')}
            value={vitals?.temperature?.value}
            unit={
              <>
                °<span className={styles.vitalUnit}>C</span>
              </>
            }
          />
          <VitalCard
            label={t('pulse', 'Pulse')}
            value={vitals?.pulse?.value}
            unit={<span className={styles.vitalUnit}> bpm</span>}
          />
          <VitalCard
            label={t('bloodPressure', 'Blood Pressure')}
            value={vitals?.bloodPressure?.value}
            unit={<span className={styles.vitalUnit}> mmHg</span>}
          />
          <VitalCard
            label={t('respiratoryRate', 'Resp. Rate')}
            value={vitals?.respiratoryRate?.value}
            unit={<span className={styles.vitalUnit}> br/min</span>}
          />
          <VitalCard
            label={t('spO2', 'SpO₂')}
            value={vitals?.oxygenSaturation?.value}
            unit={<span className={styles.vitalUnit}>%</span>}
          />
          <VitalCard
            label={t('weight', 'Weight')}
            value={vitals?.weight?.value}
            unit={<span className={styles.vitalUnit}> kg</span>}
          />
          <VitalCard
            label={t('height', 'Height')}
            value={vitals?.height?.value}
            unit={<span className={styles.vitalUnit}> cm</span>}
          />
          {bmi !== null && (
            <VitalCard label={t('bmi', 'BMI')} value={bmi} unit={<span className={styles.vitalUnit}> kg/m²</span>} />
          )}
          {vitals?.muac?.value != null && (
            <VitalCard
              label={t('muac', 'MUAC')}
              value={vitals.muac.value}
              unit={<span className={styles.vitalUnit}> cm</span>}
            />
          )}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p>{t('noVitalsRecorded', 'No vitals recorded for this visit')}</p>
        </div>
      )}
    </div>
  );
};

export default VisitSummaryVitals;
