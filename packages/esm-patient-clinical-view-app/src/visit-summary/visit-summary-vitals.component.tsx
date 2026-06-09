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
  interpretation?: string | null;
};

const VitalCard: React.FC<VitalCardProps> = ({ label, value, unit, interpretation }) => {
  const { t } = useTranslation();
  const isHigh = interpretation === 'H' || interpretation === 'HH';
  const isLow = interpretation === 'L' || interpretation === 'LL';
  const isNormal = interpretation === 'N';

  const valueClass = [styles.vitalValue, isHigh ? styles.vitalValueHigh : isLow ? styles.vitalValueLow : '']
    .filter(Boolean)
    .join(' ');

  const interpClass = [
    styles.vitalInterpretation,
    isNormal ? styles.interpretationNormal : isHigh ? styles.interpretationHigh : isLow ? styles.interpretationLow : '',
  ]
    .filter(Boolean)
    .join(' ');

  const interpLabel = isHigh
    ? t('high', 'High')
    : isLow
    ? t('low', 'Low')
    : isNormal
    ? t('normal', 'Normal')
    : interpretation;

  return (
    <div className={styles.vitalCard}>
      <p className={styles.vitalLabel}>{label}</p>
      <div className={valueClass}>
        {value ?? '—'}
        {value != null && unit}
      </div>
      {interpretation && <p className={interpClass}>{interpLabel}</p>}
    </div>
  );
};

const VisitSummaryVitals: React.FC<VitalsProps> = ({ vitals }) => {
  const { t } = useTranslation();

  const bpInterpretation = vitals?.bpSystolic?.value
    ? Number(vitals.bpSystolic.value) >= 140
      ? 'H'
      : 'N'
    : vitals?.bloodPressure?.interpretation?.code ?? null;

  const bmi = React.useMemo(() => {
    const weight = Number(vitals?.weight?.value);
    const heightCm = Number(vitals?.height?.value);
    if (!weight || !heightCm) {
      return null;
    }
    const heightM = heightCm / 100;
    return Math.round((weight / (heightM * heightM)) * 10) / 10;
  }, [vitals?.weight?.value, vitals?.height?.value]);

  const bmiInterpretation = bmi === null ? null : bmi < 18.5 ? 'L' : bmi >= 25 ? 'H' : 'N';

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>{t('latestVitals', 'Latest Vitals')}</h2>
      </div>
      <div className={styles.vitalsGrid}>
        <VitalCard
          label={t('temperature', 'Temperature')}
          value={vitals?.temperature?.value}
          unit={
            <>
              °<span className={styles.vitalUnit}>C</span>
            </>
          }
          interpretation={vitals?.temperature?.interpretation?.code}
        />
        <VitalCard
          label={t('pulse', 'Pulse')}
          value={vitals?.pulse?.value}
          unit={<span className={styles.vitalUnit}>bpm</span>}
          interpretation={vitals?.pulse?.interpretation?.code}
        />
        <VitalCard
          label={t('bloodPressure', 'Blood Pressure')}
          value={vitals?.bloodPressure?.value}
          unit={<span className={styles.vitalUnit}>mmHg</span>}
          interpretation={bpInterpretation}
        />
        <VitalCard
          label={t('respiratoryRate', 'Resp. Rate')}
          value={vitals?.respiratoryRate?.value}
          unit={<span className={styles.vitalUnit}>br/min</span>}
          interpretation={vitals?.respiratoryRate?.interpretation?.code}
        />
        <VitalCard
          label={t('spO2', 'SpO2')}
          value={vitals?.oxygenSaturation?.value}
          unit={<span className={styles.vitalUnit}>%</span>}
          interpretation={vitals?.oxygenSaturation?.interpretation?.code}
        />
        <VitalCard
          label={t('weight', 'Weight')}
          value={vitals?.weight?.value}
          unit={<span className={styles.vitalUnit}>kg</span>}
          interpretation={vitals?.weight?.interpretation?.code}
        />
        <VitalCard
          label={t('height', 'Height')}
          value={vitals?.height?.value}
          unit={<span className={styles.vitalUnit}>cm</span>}
          interpretation={vitals?.height?.interpretation?.code}
        />
        {bmi !== null && (
          <VitalCard
            label={t('bmi', 'BMI')}
            value={bmi}
            unit={<span className={styles.vitalUnit}>kg/m²</span>}
            interpretation={bmiInterpretation}
          />
        )}
        {vitals?.muac?.value != null && (
          <VitalCard
            label={t('muac', 'MUAC')}
            value={vitals.muac.value}
            unit={<span className={styles.vitalUnit}>cm</span>}
            interpretation={vitals.muac.interpretation?.code}
          />
        )}
      </div>
    </div>
  );
};

export default VisitSummaryVitals;
