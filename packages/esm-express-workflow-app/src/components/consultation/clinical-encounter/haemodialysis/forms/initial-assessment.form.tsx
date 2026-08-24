import React, { useEffect, useState } from 'react';
import { Checkbox, Modal, Stack, TextInput } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { useConfig } from '@openmrs/esm-framework';
import DiagnosisSearch from '../../../../anaesthetic/forms/icd11-diagnosis-search.component';
import type { ExpressWorkflowConfig } from '../../../../../config-schema';
import {
  ACCESS_TYPE_OPTIONS,
  BLOOD_GROUP_OPTIONS,
  DIALYSATE_ACID_CONCENTRATE_ANSWER,
  DIALYSATE_COMPOSITION_OPTIONS,
  DIALYSATE_POTASSIUM_BATH_ANSWER,
  DIALYSATE_SODIUM_BICARBONATE_ANSWER,
  DIALYZER_TYPE_OPTIONS,
  FLUX_TYPE_OPTIONS,
  HEPATITIS_B_STATUS_OPTIONS,
  HEPATITIS_C_STATUS_OPTIONS,
  HIV_STATUS_OPTIONS,
  MEMBRANE_TYPE_OPTIONS,
  OTHERS_CONCEPT_ANSWER,
  SYPHILIS_STATUS_OPTIONS,
  type CodedAnswerOption,
} from '../constants/coded-answers';
import {
  INITIAL_PRE_DIALYSIS_FIELDS,
  INITIAL_PRESCRIPTION_FIELDS,
  SCREENING_FIELDS,
} from '../constants/field-definitions';
import { validateInitialAssessment, type InitialAssessmentFormValues } from '../utils/validators';
import { calculateBodyMassIndex } from '../utils/body-mass-index';
import {
  CodedCheckboxGroup,
  CodedSelectField,
  NumericFieldInput,
  TextAreaFieldInput,
  TextFieldInput,
} from './typed-form-fields';
import type { ScreeningStatus } from '../types';
import { getSerologyDateKey, hasCapturedBloodGroup, type SerologyKey } from '../utils/screening-history';
import styles from './forms.scss';

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (values: InitialAssessmentFormValues) => boolean | Promise<boolean>;
  previousScreening?: ScreeningStatus;
};

const todayDate = () => new Date().toISOString().slice(0, 10);

const buildInitialValues = (previous?: ScreeningStatus): InitialAssessmentFormValues => ({
  diagnosis: null,
  sessionDate: todayDate(),
  screening: {
    bloodGroup: previous?.bloodGroup ?? '',
    hivStatus: previous?.hivStatus ?? '',
    hivTestDate: previous?.hivTestDate?.slice(0, 10) || todayDate(),
    hepatitisCStatus: previous?.hepatitisCStatus ?? '',
    hepatitisCTestDate: previous?.hepatitisCTestDate?.slice(0, 10) || todayDate(),
    hepatitisBStatus: previous?.hepatitisBStatus ?? '',
    hepatitisBTestDate: previous?.hepatitisBTestDate?.slice(0, 10) || todayDate(),
    syphilisStatus: previous?.syphilisStatus ?? '',
    syphilisTestDate: previous?.syphilisTestDate?.slice(0, 10) || todayDate(),
    drugAllergy: previous?.drugAllergy ?? '',
  },
  screeningRepeats: {},
  preDialysis: {},
  prescription: {},
});

type SerologyFieldProps = {
  id: string;
  label: string;
  value: string;
  testDate?: string;
  options: CodedAnswerOption[];
  previousValue?: string;
  repeating: boolean;
  required: boolean;
  chooseLabel: string;
  error?: string;
  dateError?: string;
  onRepeatChange: (repeating: boolean) => void;
  onChange: (value: string) => void;
  onDateChange: (value: string) => void;
};

const SerologyStatusField: React.FC<SerologyFieldProps> = ({
  id,
  label,
  value,
  testDate,
  options,
  previousValue,
  repeating,
  required,
  chooseLabel,
  error,
  dateError,
  onRepeatChange,
  onChange,
  onDateChange,
}) => {
  const { t } = useTranslation();
  const hasPrevious = Boolean(previousValue);
  const showEditor = !hasPrevious || repeating;

  return (
    <div className={styles.serologyField}>
      <CodedSelectField
        id={id}
        label={label}
        value={value}
        options={options}
        error={error}
        required={required && showEditor}
        disabled={hasPrevious && !repeating}
        helperText={
          hasPrevious && !repeating
            ? t('haemodialysisLatestResultHint', 'Latest recorded result. Select Repeat test to update.')
            : hasPrevious
            ? t('haemodialysisRepeatTestHint', 'Enter the new result and test date.')
            : undefined
        }
        chooseLabel={chooseLabel}
        onChange={onChange}
      />
      {hasPrevious ? (
        <Checkbox
          id={`${id}-repeat`}
          className={styles.repeatCheckbox}
          labelText={t('haemodialysisRepeatTest', 'Repeat test')}
          checked={repeating}
          onChange={(_, { checked }) => onRepeatChange(checked)}
        />
      ) : null}
      <TextInput
        id={`${id}-test-date`}
        type="date"
        labelText={t('haemodialysisTestDate', 'Test date')}
        value={testDate ?? ''}
        required={showEditor}
        readOnly={!showEditor}
        invalid={Boolean(dateError)}
        invalidText={dateError}
        onChange={(event) => onDateChange(event.target.value)}
      />
    </div>
  );
};

const InitialAssessmentForm: React.FC<Props> = ({ open, onClose, onSave, previousScreening }) => {
  const { t } = useTranslation();
  const config = useConfig<ExpressWorkflowConfig>();
  const icd11DataSourceUuid = config?.icd11DataSourceUuid ?? '';
  const [values, setValues] = useState<InitialAssessmentFormValues>(() => buildInitialValues(previousScreening));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const bloodGroupLocked = hasCapturedBloodGroup(previousScreening);

  useEffect(() => {
    if (!open) {
      return;
    }
    setValues(buildInitialValues(previousScreening));
    setErrors({});
  }, [open, previousScreening]);

  const updateScreening = (key: string, value: string) => {
    setValues((v) => ({ ...v, screening: { ...v.screening, [key]: value } }));
  };

  const updateSerologyRepeat = (key: SerologyKey, repeating: boolean) => {
    setValues((current) => {
      const dateKey = getSerologyDateKey(key);
      const screening = repeating
        ? { ...current.screening, [dateKey]: todayDate() }
        : {
            ...current.screening,
            [key]: previousScreening?.[key] ?? '',
            [dateKey]: previousScreening?.[dateKey]?.slice(0, 10) || todayDate(),
          };
      return {
        ...current,
        screening,
        screeningRepeats: { ...current.screeningRepeats, [key]: repeating },
      };
    });
  };

  const isRepeating = (key: SerologyKey) => Boolean(values.screeningRepeats?.[key]);

  const updatePre = (key: string, value: string) => {
    setValues((v) => {
      const preDialysis = { ...v.preDialysis, [key]: value };
      if (key === 'weightBefore' || key === 'height') {
        preDialysis.bodyMassIndex = calculateBodyMassIndex(preDialysis.weightBefore, preDialysis.height);
      }
      return { ...v, preDialysis };
    });
  };

  const updateRx = (key: string, value: string) => {
    setValues((v) => ({ ...v, prescription: { ...v.prescription, [key]: value } }));
  };

  const toggleDialysateComposition = (answerUuid: string, checked: boolean) => {
    setValues((current) => {
      const existing = current.prescription.dialysateComposition;
      const selected = Array.isArray(existing) ? existing : existing ? [existing] : [];
      const next = checked
        ? Array.from(new Set([...selected, answerUuid]))
        : selected.filter((value) => value !== answerUuid);
      return {
        ...current,
        prescription: {
          ...current.prescription,
          dialysateComposition: next,
        },
      };
    });
  };

  const handleSubmit = async () => {
    const nextErrors = validateInitialAssessment(values, previousScreening);
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
      setValues(buildInitialValues(previousScreening));
      setErrors({});
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const dialysateSelected = values.prescription.dialysateComposition;
  const dialysateValues = Array.isArray(dialysateSelected)
    ? dialysateSelected
    : dialysateSelected
    ? [dialysateSelected]
    : [];

  return (
    <Modal
      open={open}
      modalHeading={t('haemodialysisInitialFormTitle', 'Haemodialysis — Initial Assessment')}
      primaryButtonText={isSaving ? t('saving', 'Saving...') : t('save', 'Save')}
      primaryButtonDisabled={isSaving}
      secondaryButtonText={t('cancel', 'Cancel')}
      onRequestClose={onClose}
      onRequestSubmit={handleSubmit}
      size="lg">
      <div className={styles.formBody}>
        <h4 className={styles.formSection}>{t('biodata', 'Bio data')}</h4>
        <Stack gap={4}>
          <DiagnosisSearch
            id="haemo-diagnosis"
            labelText={t('mainDiagnosis', 'Main Diagnosis (ICD-11)')}
            value={values.diagnosis}
            config={{
              dataSourceUuid: icd11DataSourceUuid,
              minChars: 3,
            }}
            placeholder={t(
              'selectOrSearchDiagnosis',
              'Select from list or type at least 3 letters to search ICD-11 diagnosis',
            )}
            onChange={(diagnosis) => setValues((v) => ({ ...v, diagnosis }))}
            required
            invalid={Boolean(errors.diagnosis)}
            invalidText={errors.diagnosis}
          />
          <TextInput
            id="haemo-session-date"
            type="date"
            labelText={t('date', 'Date')}
            required
            value={values.sessionDate}
            invalid={Boolean(errors.sessionDate)}
            invalidText={errors.sessionDate}
            onChange={(e) => setValues((v) => ({ ...v, sessionDate: e.target.value }))}
          />
        </Stack>

        <h4 className={styles.formSection}>{t('screeningStatus', 'Screening Status')}</h4>
        <div className={styles.formGrid}>
          <CodedSelectField
            id="bloodGroup"
            label={SCREENING_FIELDS.bloodGroup.label}
            value={values.screening.bloodGroup ?? ''}
            options={BLOOD_GROUP_OPTIONS}
            error={errors['screening.bloodGroup']}
            required={SCREENING_FIELDS.bloodGroup.required && !bloodGroupLocked}
            disabled={bloodGroupLocked}
            helperText={
              bloodGroupLocked
                ? t('haemodialysisBloodGroupReadOnly', 'Captured at initial registration and displayed as read-only.')
                : undefined
            }
            chooseLabel={t('chooseOption', 'Choose an option')}
            onChange={(v) => updateScreening('bloodGroup', v)}
          />
          <SerologyStatusField
            id="hivStatus"
            label={SCREENING_FIELDS.hivStatus.label}
            value={values.screening.hivStatus ?? ''}
            testDate={values.screening.hivTestDate}
            options={HIV_STATUS_OPTIONS}
            previousValue={previousScreening?.hivStatus}
            repeating={isRepeating('hivStatus')}
            required={SCREENING_FIELDS.hivStatus.required}
            chooseLabel={t('chooseOption', 'Choose an option')}
            error={errors['screening.hivStatus']}
            dateError={errors['screening.hivTestDate']}
            onRepeatChange={(repeating) => updateSerologyRepeat('hivStatus', repeating)}
            onChange={(v) => updateScreening('hivStatus', v)}
            onDateChange={(v) => updateScreening('hivTestDate', v)}
          />
          <SerologyStatusField
            id="hepatitisCStatus"
            label={SCREENING_FIELDS.hepatitisCStatus.label}
            value={values.screening.hepatitisCStatus ?? ''}
            testDate={values.screening.hepatitisCTestDate}
            options={HEPATITIS_C_STATUS_OPTIONS}
            previousValue={previousScreening?.hepatitisCStatus}
            repeating={isRepeating('hepatitisCStatus')}
            required={SCREENING_FIELDS.hepatitisCStatus.required}
            chooseLabel={t('chooseOption', 'Choose an option')}
            error={errors['screening.hepatitisCStatus']}
            dateError={errors['screening.hepatitisCTestDate']}
            onRepeatChange={(repeating) => updateSerologyRepeat('hepatitisCStatus', repeating)}
            onChange={(v) => updateScreening('hepatitisCStatus', v)}
            onDateChange={(v) => updateScreening('hepatitisCTestDate', v)}
          />
          <SerologyStatusField
            id="hepatitisBStatus"
            label={SCREENING_FIELDS.hepatitisBStatus.label}
            value={values.screening.hepatitisBStatus ?? ''}
            testDate={values.screening.hepatitisBTestDate}
            options={HEPATITIS_B_STATUS_OPTIONS}
            previousValue={previousScreening?.hepatitisBStatus}
            repeating={isRepeating('hepatitisBStatus')}
            required={SCREENING_FIELDS.hepatitisBStatus.required}
            chooseLabel={t('chooseOption', 'Choose an option')}
            error={errors['screening.hepatitisBStatus']}
            dateError={errors['screening.hepatitisBTestDate']}
            onRepeatChange={(repeating) => updateSerologyRepeat('hepatitisBStatus', repeating)}
            onChange={(v) => updateScreening('hepatitisBStatus', v)}
            onDateChange={(v) => updateScreening('hepatitisBTestDate', v)}
          />
          <SerologyStatusField
            id="syphilisStatus"
            label={SCREENING_FIELDS.syphilisStatus.label}
            value={values.screening.syphilisStatus ?? ''}
            testDate={values.screening.syphilisTestDate}
            options={SYPHILIS_STATUS_OPTIONS}
            previousValue={previousScreening?.syphilisStatus}
            repeating={isRepeating('syphilisStatus')}
            required={SCREENING_FIELDS.syphilisStatus.required}
            chooseLabel={t('chooseOption', 'Choose an option')}
            error={errors['screening.syphilisStatus']}
            dateError={errors['screening.syphilisTestDate']}
            onRepeatChange={(repeating) => updateSerologyRepeat('syphilisStatus', repeating)}
            onChange={(v) => updateScreening('syphilisStatus', v)}
            onDateChange={(v) => updateScreening('syphilisTestDate', v)}
          />
          <TextFieldInput
            id="drugAllergy"
            def={{
              ...SCREENING_FIELDS.drugAllergy,
              helperText: t('haemodialysisDrugAllergyHint', 'Review and update drug allergy at every dialysis visit.'),
            }}
            value={values.screening.drugAllergy ?? ''}
            error={errors['screening.drugAllergy']}
            onChange={(v) => updateScreening('drugAllergy', v)}
          />
        </div>

        <h4 className={styles.formSection}>{t('preDialysisAssessment', '1. Pre-Dialysis Assessment')}</h4>
        <div className={styles.formGrid}>
          <NumericFieldInput
            id="weightBefore"
            def={INITIAL_PRE_DIALYSIS_FIELDS.weightBefore}
            value={values.preDialysis.weightBefore ?? ''}
            error={errors.weightBefore}
            onChange={(v) => updatePre('weightBefore', v)}
          />
          <NumericFieldInput
            id="targetDryWeight"
            def={INITIAL_PRE_DIALYSIS_FIELDS.targetDryWeight}
            value={values.preDialysis.targetDryWeight ?? ''}
            error={errors.targetDryWeight}
            onChange={(v) => updatePre('targetDryWeight', v)}
          />
          <NumericFieldInput
            id="interdialyticWeightGain"
            def={INITIAL_PRE_DIALYSIS_FIELDS.interdialyticWeightGain}
            value={values.preDialysis.interdialyticWeightGain ?? ''}
            error={errors.interdialyticWeightGain}
            onChange={(v) => updatePre('interdialyticWeightGain', v)}
          />
          <NumericFieldInput
            id="height"
            def={INITIAL_PRE_DIALYSIS_FIELDS.height}
            value={values.preDialysis.height ?? ''}
            error={errors.height}
            onChange={(v) => updatePre('height', v)}
          />
          <NumericFieldInput
            id="bodyMassIndex"
            def={INITIAL_PRE_DIALYSIS_FIELDS.bodyMassIndex}
            value={values.preDialysis.bodyMassIndex ?? ''}
            error={errors.bodyMassIndex}
            readOnly
          />
          <TextFieldInput
            id="bloodPressure"
            def={INITIAL_PRE_DIALYSIS_FIELDS.bloodPressure}
            value={values.preDialysis.bloodPressure ?? ''}
            error={errors.bloodPressure}
            onChange={(v) => updatePre('bloodPressure', v)}
          />
          <NumericFieldInput
            id="pulse"
            def={INITIAL_PRE_DIALYSIS_FIELDS.pulse}
            value={values.preDialysis.pulse ?? ''}
            error={errors.pulse}
            onChange={(v) => updatePre('pulse', v)}
          />
          <NumericFieldInput
            id="temperature"
            def={INITIAL_PRE_DIALYSIS_FIELDS.temperature}
            value={values.preDialysis.temperature ?? ''}
            error={errors.temperature}
            onChange={(v) => updatePre('temperature', v)}
          />
          <NumericFieldInput
            id="respiratoryRate"
            def={INITIAL_PRE_DIALYSIS_FIELDS.respiratoryRate}
            value={values.preDialysis.respiratoryRate ?? ''}
            error={errors.respiratoryRate}
            onChange={(v) => updatePre('respiratoryRate', v)}
          />
          <NumericFieldInput
            id="oxygenSaturation"
            def={INITIAL_PRE_DIALYSIS_FIELDS.oxygenSaturation}
            value={values.preDialysis.oxygenSaturation ?? ''}
            error={errors.oxygenSaturation}
            onChange={(v) => updatePre('oxygenSaturation', v)}
          />
          <NumericFieldInput
            id="bloodSugar"
            def={INITIAL_PRE_DIALYSIS_FIELDS.bloodSugar}
            value={values.preDialysis.bloodSugar ?? ''}
            error={errors.bloodSugar}
            onChange={(v) => updatePre('bloodSugar', v)}
          />
          <CodedSelectField
            id="accessType"
            label={INITIAL_PRE_DIALYSIS_FIELDS.accessType.label}
            value={values.preDialysis.accessType ?? ''}
            options={ACCESS_TYPE_OPTIONS}
            error={errors.accessType}
            required={INITIAL_PRE_DIALYSIS_FIELDS.accessType.required}
            chooseLabel={t('chooseOption', 'Choose an option')}
            onChange={(v) => updatePre('accessType', v)}
          />
          <TextAreaFieldInput
            id="additionalAssessment"
            label={INITIAL_PRE_DIALYSIS_FIELDS.additionalAssessment.label}
            value={values.preDialysis.additionalAssessment ?? ''}
            error={errors.additionalAssessment}
            onChange={(v) => updatePre('additionalAssessment', v)}
          />
          <NumericFieldInput
            id="accessSite"
            def={INITIAL_PRE_DIALYSIS_FIELDS.accessSite}
            value={values.preDialysis.accessSite ?? ''}
            error={errors.accessSite}
            onChange={(v) => updatePre('accessSite', v)}
          />
          <TextFieldInput
            id="doctorNephrologist"
            def={INITIAL_PRE_DIALYSIS_FIELDS.doctorNephrologist}
            value={values.preDialysis.doctorNephrologist ?? ''}
            error={errors.doctorNephrologist}
            onChange={(v) => updatePre('doctorNephrologist', v)}
          />
        </div>

        <h4 className={styles.formSection}>{t('physicianPrescription', '2. Physician Prescription')}</h4>
        <div className={styles.formGrid}>
          <CodedSelectField
            id="dialyzerType"
            label={INITIAL_PRESCRIPTION_FIELDS.dialyzerType.label}
            value={values.prescription.dialyzerType ?? ''}
            options={DIALYZER_TYPE_OPTIONS}
            error={errors['prescription.dialyzerType']}
            required={INITIAL_PRESCRIPTION_FIELDS.dialyzerType.required}
            chooseLabel={t('chooseOption', 'Choose an option')}
            onChange={(v) => updateRx('dialyzerType', v)}
          />
          <CodedSelectField
            id="membraneType"
            label={INITIAL_PRESCRIPTION_FIELDS.membraneType.label}
            value={values.prescription.membraneType ?? ''}
            options={MEMBRANE_TYPE_OPTIONS}
            error={errors['prescription.membraneType']}
            required={INITIAL_PRESCRIPTION_FIELDS.membraneType.required}
            chooseLabel={t('chooseOption', 'Choose an option')}
            onChange={(v) => updateRx('membraneType', v)}
          />
          {values.prescription.membraneType === OTHERS_CONCEPT_ANSWER ? (
            <TextFieldInput
              id="specifyOtherMembraneType"
              def={INITIAL_PRESCRIPTION_FIELDS.specifyOtherMembraneType}
              value={values.prescription.specifyOtherMembraneType ?? ''}
              error={errors['prescription.specifyOtherMembraneType']}
              onChange={(v) => updateRx('specifyOtherMembraneType', v)}
            />
          ) : null}
          <CodedSelectField
            id="fluxType"
            label={INITIAL_PRESCRIPTION_FIELDS.fluxType.label}
            value={values.prescription.fluxType ?? ''}
            options={FLUX_TYPE_OPTIONS}
            error={errors['prescription.fluxType']}
            required={INITIAL_PRESCRIPTION_FIELDS.fluxType.required}
            chooseLabel={t('chooseOption', 'Choose an option')}
            onChange={(v) => updateRx('fluxType', v)}
          />
          <NumericFieldInput
            id="dialyzerSize"
            def={INITIAL_PRESCRIPTION_FIELDS.dialyzerSize}
            value={values.prescription.dialyzerSize ?? ''}
            error={errors['prescription.dialyzerSize']}
            onChange={(v) => updateRx('dialyzerSize', v)}
          />
          <NumericFieldInput
            id="prescribedFrequencyPerWeek"
            def={INITIAL_PRESCRIPTION_FIELDS.prescribedFrequencyPerWeek}
            value={values.prescription.prescribedFrequencyPerWeek ?? ''}
            error={errors['prescription.prescribedFrequencyPerWeek']}
            onChange={(v) => updateRx('prescribedFrequencyPerWeek', v)}
          />
          <NumericFieldInput
            id="bfr"
            def={INITIAL_PRESCRIPTION_FIELDS.bfr}
            value={values.prescription.bfr ?? ''}
            error={errors['prescription.bfr']}
            onChange={(v) => updateRx('bfr', v)}
          />
          <CodedCheckboxGroup
            label={INITIAL_PRESCRIPTION_FIELDS.dialysateComposition.label}
            options={DIALYSATE_COMPOSITION_OPTIONS}
            selected={dialysateValues}
            error={errors['prescription.dialysateComposition']}
            required={INITIAL_PRESCRIPTION_FIELDS.dialysateComposition.required}
            onToggle={toggleDialysateComposition}
          />
          {dialysateValues.includes(DIALYSATE_ACID_CONCENTRATE_ANSWER) ? (
            <NumericFieldInput
              id="acidConcentrateAmount"
              def={INITIAL_PRESCRIPTION_FIELDS.acidConcentrateAmount}
              value={values.prescription.acidConcentrateAmount ?? ''}
              error={errors['prescription.acidConcentrateAmount']}
              onChange={(v) => updateRx('acidConcentrateAmount', v)}
            />
          ) : null}
          {dialysateValues.includes(DIALYSATE_SODIUM_BICARBONATE_ANSWER) ? (
            <NumericFieldInput
              id="sodiumBicarbonateConcentration"
              def={INITIAL_PRESCRIPTION_FIELDS.sodiumBicarbonateConcentration}
              value={values.prescription.sodiumBicarbonateConcentration ?? ''}
              error={errors['prescription.sodiumBicarbonateConcentration']}
              onChange={(v) => updateRx('sodiumBicarbonateConcentration', v)}
            />
          ) : null}
          {dialysateValues.includes(DIALYSATE_POTASSIUM_BATH_ANSWER) ? (
            <NumericFieldInput
              id="potassiumBathConcentration"
              def={INITIAL_PRESCRIPTION_FIELDS.potassiumBathConcentration}
              value={values.prescription.potassiumBathConcentration ?? ''}
              error={errors['prescription.potassiumBathConcentration']}
              onChange={(v) => updateRx('potassiumBathConcentration', v)}
            />
          ) : null}
          {dialysateValues.includes(OTHERS_CONCEPT_ANSWER) ? (
            <>
              <TextFieldInput
                id="dialysateCompositionOther"
                def={INITIAL_PRESCRIPTION_FIELDS.dialysateCompositionOther}
                value={values.prescription.dialysateCompositionOther ?? ''}
                error={errors['prescription.dialysateCompositionOther']}
                onChange={(v) => updateRx('dialysateCompositionOther', v)}
              />
              <TextFieldInput
                id="otherDialysateAmount"
                def={INITIAL_PRESCRIPTION_FIELDS.otherDialysateAmount}
                value={values.prescription.otherDialysateAmount ?? ''}
                error={errors['prescription.otherDialysateAmount']}
                onChange={(v) => updateRx('otherDialysateAmount', v)}
              />
            </>
          ) : null}
          <NumericFieldInput
            id="dfr"
            def={INITIAL_PRESCRIPTION_FIELDS.dfr}
            value={values.prescription.dfr ?? ''}
            error={errors['prescription.dfr']}
            onChange={(v) => updateRx('dfr', v)}
          />
          <NumericFieldInput
            id="ufGoal"
            def={INITIAL_PRESCRIPTION_FIELDS.ufGoal}
            value={values.prescription.ufGoal ?? ''}
            error={errors['prescription.ufGoal']}
            onChange={(v) => updateRx('ufGoal', v)}
          />
          <NumericFieldInput
            id="heparinDose"
            def={INITIAL_PRESCRIPTION_FIELDS.heparinDose}
            value={values.prescription.heparinDose ?? ''}
            error={errors['prescription.heparinDose']}
            onChange={(v) => updateRx('heparinDose', v)}
          />
          <NumericFieldInput
            id="duration"
            def={INITIAL_PRESCRIPTION_FIELDS.duration}
            value={values.prescription.duration ?? ''}
            error={errors['prescription.duration']}
            onChange={(v) => updateRx('duration', v)}
          />
        </div>
      </div>
    </Modal>
  );
};

export default InitialAssessmentForm;
