import React, { useState } from 'react';
import { Button, Modal, Stack } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { YES_NO_OPTIONS } from '../constants/coded-answers';
import { ADDITIONAL_MEDICATION_FIELDS, POST_DIALYSIS_FIELDS, SUMMARY_FIELDS } from '../constants/field-definitions';
import type { AdditionalMedicationRow, DialysisSummary, PostDialysisAssessment } from '../types';
import { validatePostDialysisAssessment, type PostDialysisFormValues } from '../utils/validators';
import { CodedSelectField, NumericFieldInput, TextAreaFieldInput, TextFieldInput } from './typed-form-fields';
import styles from './forms.scss';

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (values: PostDialysisFormValues) => boolean | Promise<boolean>;
};

const emptyValues: PostDialysisFormValues = {
  postDialysis: {},
  summary: {},
};

const emptyMedicationRow = (): AdditionalMedicationRow => ({});

const PostDialysisAssessmentForm: React.FC<Props> = ({ open, onClose, onSave }) => {
  const { t } = useTranslation();
  const [values, setValues] = useState<PostDialysisFormValues>(emptyValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const updatePost = (key: keyof PostDialysisAssessment, value: string) => {
    setValues((v) => ({ ...v, postDialysis: { ...v.postDialysis, [key]: value } }));
  };

  const updateSummary = (key: keyof DialysisSummary, value: string) => {
    setValues((v) => ({ ...v, summary: { ...v.summary, [key]: value } }));
  };

  const addMedication = () => {
    setValues((current) => ({
      ...current,
      postDialysis: {
        ...current.postDialysis,
        additionalMedications: [...(current.postDialysis.additionalMedications ?? []), emptyMedicationRow()],
      },
    }));
  };

  const updateMedication = (index: number, key: keyof AdditionalMedicationRow, value: string) => {
    setValues((current) => {
      const rows = [...(current.postDialysis.additionalMedications ?? [])];
      rows[index] = { ...rows[index], [key]: value };
      return {
        ...current,
        postDialysis: {
          ...current.postDialysis,
          additionalMedications: rows,
        },
      };
    });
  };

  const removeMedication = (index: number) => {
    setValues((current) => ({
      ...current,
      postDialysis: {
        ...current.postDialysis,
        additionalMedications: (current.postDialysis.additionalMedications ?? []).filter(
          (_, rowIndex) => rowIndex !== index,
        ),
      },
    }));
  };

  const handleSubmit = async () => {
    const nextErrors = validatePostDialysisAssessment(values);
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

  const medications = values.postDialysis.additionalMedications ?? [];

  return (
    <Modal
      open={open}
      modalHeading={t('haemodialysisPostFormTitle', 'Post-Dialysis Assessment & Summary')}
      primaryButtonText={isSaving ? t('saving', 'Saving...') : t('save', 'Save')}
      primaryButtonDisabled={isSaving}
      secondaryButtonText={t('cancel', 'Cancel')}
      onRequestClose={onClose}
      onRequestSubmit={handleSubmit}
      size="lg">
      <div className={styles.formBody}>
        <h4 className={styles.formSection}>{t('postDialysisAssessment', '4. Post-Dialysis Assessment')}</h4>
        <div className={styles.formGrid}>
          <NumericFieldInput
            id="weightAfter"
            def={POST_DIALYSIS_FIELDS.weightAfter}
            value={values.postDialysis.weightAfter ?? ''}
            error={errors.weightAfter}
            onChange={(v) => updatePost('weightAfter', v)}
          />
          <NumericFieldInput
            id="totalUfAchieved"
            def={POST_DIALYSIS_FIELDS.totalUfAchieved}
            value={values.postDialysis.totalUfAchieved ?? ''}
            error={errors.totalUfAchieved}
            onChange={(v) => updatePost('totalUfAchieved', v)}
          />
          <TextFieldInput
            id="postBp"
            def={POST_DIALYSIS_FIELDS.bloodPressure}
            value={values.postDialysis.bloodPressure ?? ''}
            error={errors.bloodPressure}
            onChange={(v) => updatePost('bloodPressure', v)}
          />
          <NumericFieldInput
            id="postPulse"
            def={POST_DIALYSIS_FIELDS.pulse}
            value={values.postDialysis.pulse ?? ''}
            error={errors.pulse}
            onChange={(v) => updatePost('pulse', v)}
          />
          <NumericFieldInput
            id="postTemperature"
            def={POST_DIALYSIS_FIELDS.temperature}
            value={values.postDialysis.temperature ?? ''}
            error={errors.temperature}
            onChange={(v) => updatePost('temperature', v)}
          />
          <NumericFieldInput
            id="postAccessSite"
            def={POST_DIALYSIS_FIELDS.accessSite}
            value={values.postDialysis.accessSite ?? ''}
            error={errors.accessSite}
            onChange={(v) => updatePost('accessSite', v)}
          />
          <TextFieldInput
            id="condition"
            def={POST_DIALYSIS_FIELDS.condition}
            value={values.postDialysis.condition ?? ''}
            error={errors.condition}
            onChange={(v) => updatePost('condition', v)}
          />
          <TextFieldInput
            id="complications"
            def={POST_DIALYSIS_FIELDS.complications}
            value={values.postDialysis.complications ?? ''}
            error={errors.complications}
            onChange={(v) => updatePost('complications', v)}
          />
          <NumericFieldInput
            id="fluidBalance"
            def={POST_DIALYSIS_FIELDS.fluidBalance}
            value={values.postDialysis.fluidBalance ?? ''}
            error={errors.fluidBalance}
            onChange={(v) => updatePost('fluidBalance', v)}
          />
          <NumericFieldInput
            id="postDialysisKtV"
            def={POST_DIALYSIS_FIELDS.postDialysisKtV}
            value={values.postDialysis.postDialysisKtV ?? ''}
            error={errors.postDialysisKtV}
            onChange={(v) => updatePost('postDialysisKtV', v)}
          />
          <NumericFieldInput
            id="machineKtV"
            def={POST_DIALYSIS_FIELDS.machineKtV}
            value={values.postDialysis.machineKtV ?? ''}
            error={errors.machineKtV}
            onChange={(v) => updatePost('machineKtV', v)}
          />
        </div>

        <div className={styles.medicationSection}>
          <div className={styles.medicationSectionHeader}>
            <h5 className={styles.formSubSection}>
              {t('additionalMedicationPrescribed', 'Additional Medication Prescribed / Administered')}
            </h5>
            <Button kind="ghost" size="sm" onClick={addMedication}>
              {t('addMedication', 'Add medication')}
            </Button>
          </div>
          {medications.map((row, index) => (
            <div key={`medication-${index}`} className={styles.medicationRow}>
              <div className={styles.medicationRowHeader}>
                <span>{t('medicationEntry', 'Medication {{number}}', { number: index + 1 })}</span>
                <Button kind="danger--ghost" size="sm" onClick={() => removeMedication(index)}>
                  {t('remove', 'Remove')}
                </Button>
              </div>
              <div className={styles.formGrid}>
                <TextFieldInput
                  id={`medication-name-${index}`}
                  def={ADDITIONAL_MEDICATION_FIELDS.name}
                  value={row.name ?? ''}
                  onChange={(v) => updateMedication(index, 'name', v)}
                />
                <TextFieldInput
                  id={`medication-dosage-${index}`}
                  def={ADDITIONAL_MEDICATION_FIELDS.dosage}
                  value={row.dosage ?? ''}
                  onChange={(v) => updateMedication(index, 'dosage', v)}
                />
                <TextFieldInput
                  id={`medication-administered-by-${index}`}
                  def={ADDITIONAL_MEDICATION_FIELDS.administeredBy}
                  value={row.administeredBy ?? ''}
                  onChange={(v) => updateMedication(index, 'administeredBy', v)}
                />
                <TextFieldInput
                  id={`medication-adverse-event-${index}`}
                  def={ADDITIONAL_MEDICATION_FIELDS.adverseEvent}
                  value={row.adverseEvent ?? ''}
                  onChange={(v) => updateMedication(index, 'adverseEvent', v)}
                />
              </div>
            </div>
          ))}
        </div>

        <Stack gap={4}>
          <TextAreaFieldInput
            id="postHdNurseNotes"
            label={POST_DIALYSIS_FIELDS.postHdNurseNotes.label}
            value={values.postDialysis.postHdNurseNotes ?? ''}
            error={errors.postHdNurseNotes}
            onChange={(v) => updatePost('postHdNurseNotes', v)}
          />
        </Stack>

        <h4 className={styles.formSection}>{t('dialysisSummary', '5. Dialysis Summary')}</h4>
        <div className={styles.formGrid}>
          <NumericFieldInput
            id="prescribedDuration"
            def={SUMMARY_FIELDS.prescribedDuration}
            value={values.summary.prescribedDuration ?? ''}
            error={errors['summary.prescribedDuration']}
            onChange={(v) => updateSummary('prescribedDuration', v)}
          />
          <NumericFieldInput
            id="actualDuration"
            def={SUMMARY_FIELDS.actualDuration}
            value={values.summary.actualDuration ?? ''}
            error={errors['summary.actualDuration']}
            onChange={(v) => updateSummary('actualDuration', v)}
          />
          <CodedSelectField
            id="adequacyAchieved"
            label={SUMMARY_FIELDS.adequacyAchieved.label}
            value={values.summary.adequacyAchieved ?? ''}
            options={YES_NO_OPTIONS}
            error={errors['summary.adequacyAchieved']}
            chooseLabel={t('chooseOption', 'Choose an option')}
            onChange={(v) => updateSummary('adequacyAchieved', v)}
          />
          <CodedSelectField
            id="toleratedProcedure"
            label={SUMMARY_FIELDS.toleratedProcedure.label}
            value={values.summary.toleratedProcedure ?? ''}
            options={YES_NO_OPTIONS}
            error={errors['summary.toleratedProcedure']}
            chooseLabel={t('chooseOption', 'Choose an option')}
            onChange={(v) => updateSummary('toleratedProcedure', v)}
          />
        </div>
        <Stack gap={4}>
          <TextAreaFieldInput
            id="comments"
            label={SUMMARY_FIELDS.comments.label}
            value={values.summary.comments ?? ''}
            error={errors['summary.comments']}
            onChange={(v) => updateSummary('comments', v)}
          />
          <TextAreaFieldInput
            id="additionalRemarks"
            label={SUMMARY_FIELDS.additionalRemarks.label}
            value={values.summary.additionalRemarks ?? ''}
            error={errors['summary.additionalRemarks']}
            onChange={(v) => updateSummary('additionalRemarks', v)}
          />
        </Stack>
      </div>
    </Modal>
  );
};

export default PostDialysisAssessmentForm;
