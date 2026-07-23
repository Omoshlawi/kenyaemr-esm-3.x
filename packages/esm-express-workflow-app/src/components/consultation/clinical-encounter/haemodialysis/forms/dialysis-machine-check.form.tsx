import React, { useEffect, useState } from 'react';
import { Modal, Stack, TextInput } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import {
  AIR_DETECTED_ANSWER,
  AIR_DETECTOR_OPTIONS,
  BLOOD_LEAK_DETECTED_ANSWER,
  BLOOD_LEAK_OPTIONS,
} from '../constants/machine-check-answers';
import { MACHINE_CHECK_FIELDS } from '../constants/field-definitions';
import type { DialysisMachineCheck } from '../types';
import { validateMachineCheck, type MachineCheckFormValues } from '../utils/validators';
import { CodedSelectField, NumericFieldInput } from './typed-form-fields';
import styles from './forms.scss';

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (values: MachineCheckFormValues) => boolean | Promise<boolean>;
};

const emptyValues: MachineCheckFormValues = {};

const toDatetimeLocalValue = (value?: string): string => {
  if (!value?.trim()) {
    return '';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value.length >= 16 ? value.slice(0, 16) : value;
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(
    parsed.getHours(),
  )}:${pad(parsed.getMinutes())}`;
};

const nowDatetimeLocalValue = (): string => toDatetimeLocalValue(new Date().toISOString());

const DialysisMachineCheckForm: React.FC<Props> = ({ open, onClose, onSave }) => {
  const { t } = useTranslation();
  const [values, setValues] = useState<MachineCheckFormValues>(emptyValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setValues({
      ...emptyValues,
      machineCheckDate: nowDatetimeLocalValue(),
    });
    setErrors({});
  }, [open]);

  const update = (key: keyof DialysisMachineCheck, value: string) => {
    setValues((current) => {
      const next = { ...current, [key]: value };
      if (key === 'bloodLeaks' && value !== BLOOD_LEAK_DETECTED_ANSWER) {
        next.bloodLeakDateTime = '';
      }
      if (key === 'airDetector' && value !== AIR_DETECTED_ANSWER) {
        next.airDetectorDateTime = '';
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    const nextErrors = validateMachineCheck(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    setIsSaving(true);
    try {
      const saved = await onSave(values);
      if (!saved) {
        return;
      }
      setValues(emptyValues);
      setErrors({});
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const showBloodLeakDateTime = values.bloodLeaks === BLOOD_LEAK_DETECTED_ANSWER;
  const showAirDetectorDateTime = values.airDetector === AIR_DETECTED_ANSWER;

  return (
    <Modal
      open={open}
      modalHeading={t('haemodialysisMachineCheckFormTitle', 'Dialysis Machine Check')}
      primaryButtonText={isSaving ? t('saving', 'Saving...') : t('save', 'Save')}
      primaryButtonDisabled={isSaving}
      secondaryButtonText={t('cancel', 'Cancel')}
      onRequestClose={onClose}
      onRequestSubmit={handleSubmit}
      size="lg">
      <div className={styles.formBody}>
        <Stack gap={4}>
          <TextInput
            id="machineCheckDate"
            type="datetime-local"
            labelText={MACHINE_CHECK_FIELDS.machineCheckDate.label}
            value={toDatetimeLocalValue(values.machineCheckDate)}
            invalid={Boolean(errors.machineCheckDate)}
            invalidText={errors.machineCheckDate}
            onChange={(e) => update('machineCheckDate', e.target.value)}
          />
          <CodedSelectField
            id="bloodLeaks"
            label={MACHINE_CHECK_FIELDS.bloodLeaks.label}
            value={values.bloodLeaks ?? ''}
            options={BLOOD_LEAK_OPTIONS}
            error={errors.bloodLeaks}
            chooseLabel={t('chooseOption', 'Choose an option')}
            onChange={(v) => update('bloodLeaks', v)}
          />
          {showBloodLeakDateTime ? (
            <TextInput
              id="bloodLeakDateTime"
              type="datetime-local"
              labelText={MACHINE_CHECK_FIELDS.bloodLeakDateTime.label}
              value={toDatetimeLocalValue(values.bloodLeakDateTime)}
              invalid={Boolean(errors.bloodLeakDateTime)}
              invalidText={errors.bloodLeakDateTime}
              onChange={(e) => update('bloodLeakDateTime', e.target.value)}
            />
          ) : null}
          <CodedSelectField
            id="airDetector"
            label={MACHINE_CHECK_FIELDS.airDetector.label}
            value={values.airDetector ?? ''}
            options={AIR_DETECTOR_OPTIONS}
            error={errors.airDetector}
            chooseLabel={t('chooseOption', 'Choose an option')}
            onChange={(v) => update('airDetector', v)}
          />
          {showAirDetectorDateTime ? (
            <TextInput
              id="airDetectorDateTime"
              type="datetime-local"
              labelText={MACHINE_CHECK_FIELDS.airDetectorDateTime.label}
              value={toDatetimeLocalValue(values.airDetectorDateTime)}
              invalid={Boolean(errors.airDetectorDateTime)}
              invalidText={errors.airDetectorDateTime}
              onChange={(e) => update('airDetectorDateTime', e.target.value)}
            />
          ) : null}
        </Stack>

        <div className={styles.formGrid}>
          <NumericFieldInput
            id="dialysisFluidTemperature"
            def={MACHINE_CHECK_FIELDS.dialysisFluidTemperature}
            value={values.dialysisFluidTemperature ?? ''}
            error={errors.dialysisFluidTemperature}
            onChange={(v) => update('dialysisFluidTemperature', v)}
          />
          <NumericFieldInput
            id="conductivity"
            def={MACHINE_CHECK_FIELDS.conductivity}
            value={values.conductivity ?? ''}
            error={errors.conductivity}
            onChange={(v) => update('conductivity', v)}
          />
          <NumericFieldInput
            id="transmembranePressure"
            def={MACHINE_CHECK_FIELDS.transmembranePressure}
            value={values.transmembranePressure ?? ''}
            error={errors.transmembranePressure}
            onChange={(v) => update('transmembranePressure', v)}
          />
        </div>
      </div>
    </Modal>
  );
};

export default DialysisMachineCheckForm;
