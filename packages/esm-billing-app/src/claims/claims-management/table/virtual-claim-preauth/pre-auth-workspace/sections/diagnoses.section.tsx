import React from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import { Button, FormGroup } from '@carbon/react';
import { TrashCan } from '@carbon/react/icons';
import DiagnosisSearch from '../diagnosis-component/diagnosis-component';
import RequiredLabel from '../components/required-label.component';
import { type PreauthFormData } from '../pre-auth-schema';
import styles from '../pre-auth-form.scss';

const DiagnosesSection: React.FC = () => {
  const { t } = useTranslation();
  const {
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext<PreauthFormData>();
  const {
    fields: diagnosisFields,
    append: appendDiagnosis,
    remove: removeDiagnosis,
  } = useFieldArray({
    control,
    name: 'diagnoses',
  });

  return (
    <div className={styles.twoCol}>
      <FormGroup legendText={<RequiredLabel>{t('diagnosesLabel', 'Diagnoses')}</RequiredLabel>}>
        {diagnosisFields.map((field, idx) => (
          <React.Fragment key={field.id}>
            <div className={styles.diagRow}>
              <Controller
                name={`diagnoses.${idx}.icd_code`}
                control={control}
                render={({ field: f }) => (
                  <DiagnosisSearch
                    id={`diag-${idx}`}
                    value={f.value}
                    display={getValues(`diagnoses.${idx}.display`) ?? ''}
                    onChange={(icdCode, displayName) => {
                      f.onChange(icdCode);
                      setValue(`diagnoses.${idx}.display`, displayName);
                    }}
                    invalid={!!errors.diagnoses?.[idx]?.icd_code}
                    invalidText={errors.diagnoses?.[idx]?.icd_code?.message}
                  />
                )}
              />
            </div>
            <div className={styles.addBtnContainer}>
              <Button
                kind="tertiary"
                size="sm"
                onClick={() => appendDiagnosis({ icd_code: '' })}
                className={styles.addBtn}>
                {t('addDiagnosis', '+ Add diagnosis')}
              </Button>
              {idx > 0 && (
                <Button
                  kind="danger"
                  size="sm"
                  renderIcon={TrashCan}
                  iconDescription={t('remove', 'Remove')}
                  hasIconOnly
                  onClick={() => removeDiagnosis(idx)}
                  className={styles.removeBtn}
                />
              )}
            </div>
          </React.Fragment>
        ))}
        {errors.diagnoses?.root && <p className={styles.fieldError}>{errors.diagnoses.root.message}</p>}
      </FormGroup>
    </div>
  );
};

export default DiagnosesSection;
