import React from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, useFormContext } from 'react-hook-form';
import {
  FormGroup,
  RadioButton,
  RadioButtonGroup,
  Select,
  SelectItem,
  Stack,
  TextArea,
  TextInput,
} from '@carbon/react';
import RequiredLabel from '../components/required-label.component';
import { asStringField, getPreauthFieldError, preauthField } from '../../utils';
import { CARCINOMA_STAGES, METASTASES_OPTIONS, TREATMENT_SETTINGS } from '../../constants';
import { type PreauthFormData } from '../pre-auth-schema';
import styles from '../pre-auth-form.scss';

const OncologyDetails: React.FC = () => {
  const { t } = useTranslation();
  const {
    control,
    formState: { errors },
  } = useFormContext<PreauthFormData>();

  return (
    <div className={styles.twoCol}>
      <FormGroup legendText={t('oncologyDetails', 'Oncology details')}>
        <Stack gap={4}>
          <Controller
            name={preauthField('carcinoma_staging')}
            control={control}
            render={({ field }) => (
              <Select {...asStringField(field)} id="staging" labelText={t('carcinomaStaging', 'Carcinoma staging')}>
                {CARCINOMA_STAGES.map((s) => (
                  <SelectItem key={s} value={s} text={s.replace(/_/g, ' ')} />
                ))}
              </Select>
            )}
          />
          <Controller
            name={preauthField('comorbidity')}
            control={control}
            render={({ field }) => (
              <TextArea
                {...asStringField(field)}
                id="comorbidity"
                labelText={t('comorbidity', 'Comorbidity')}
                rows={2}
              />
            )}
          />
          <Controller
            name={preauthField<PreauthFormData>('metastases')}
            control={control}
            render={({ field }) => {
              const value = (field.value as Array<string> | undefined) ?? [];
              return (
                <FormGroup legendText={<RequiredLabel>{t('metastases', 'Metastases')}</RequiredLabel>}>
                  <div className={styles.checkboxGroup}>
                    {METASTASES_OPTIONS.map((m) => (
                      <label key={m} className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={value.includes(m)}
                          onChange={(e) => {
                            field.onChange(e.target.checked ? [...value, m] : value.filter((x) => x !== m));
                          }}
                        />
                        {m}
                      </label>
                    ))}
                  </div>
                  {getPreauthFieldError(errors, 'metastases') && (
                    <p className={styles.fieldError}>{getPreauthFieldError(errors, 'metastases')}</p>
                  )}
                </FormGroup>
              );
            }}
          />
          <Controller
            name={preauthField('treatment_setting')}
            control={control}
            render={({ field }) => {
              const value = (field.value as Array<string> | undefined) ?? [];
              return (
                <FormGroup legendText={<RequiredLabel>{t('treatmentSetting', 'Treatment setting')}</RequiredLabel>}>
                  <div className={styles.checkboxGroup}>
                    {TREATMENT_SETTINGS.map((ts) => (
                      <label key={ts} className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={value.includes(ts)}
                          onChange={(e) => {
                            field.onChange(e.target.checked ? [...value, ts] : value.filter((x) => x !== ts));
                          }}
                        />
                        {ts.replace(/_/g, ' ')}
                      </label>
                    ))}
                  </div>
                  {getPreauthFieldError(errors, 'treatment_setting') && (
                    <p className={styles.fieldError}>{getPreauthFieldError(errors, 'treatment_setting')}</p>
                  )}
                </FormGroup>
              );
            }}
          />
          <div className={styles.twoCol}>
            <Controller
              name={preauthField('number_of_sessions_required')}
              control={control}
              render={({ field }) => (
                <TextInput
                  {...asStringField(field)}
                  id="onco-sessions"
                  type="number"
                  labelText={<RequiredLabel>{t('numberOfSessions', 'Number of sessions')}</RequiredLabel>}
                  invalid={!!getPreauthFieldError(errors, 'number_of_sessions_required')}
                  invalidText={getPreauthFieldError(errors, 'number_of_sessions_required')}
                />
              )}
            />
            <Controller
              name={preauthField('cost_per_session')}
              control={control}
              render={({ field }) => (
                <TextInput
                  {...asStringField(field)}
                  id="onco-cost"
                  type="number"
                  labelText={<RequiredLabel>{t('costPerSession', 'Cost per session (KES)')}</RequiredLabel>}
                  invalid={!!getPreauthFieldError(errors, 'cost_per_session')}
                  invalidText={getPreauthFieldError(errors, 'cost_per_session')}
                />
              )}
            />
          </div>
          <Controller
            name={preauthField('is_co_insured')}
            control={control}
            render={({ field }) => (
              <RadioButtonGroup
                legendText={t('isCoInsured', 'Co-insured')}
                name={`onco-co-insured-${field.name}`}
                valueSelected={field.value === true ? 'yes' : field.value === false ? 'no' : ''}
                onChange={(value) => field.onChange(value === 'yes')}>
                <RadioButton id="onco-co-insured-yes" labelText={t('yes', 'Yes')} value="yes" />
                <RadioButton id="onco-co-insured-no" labelText={t('no', 'No')} value="no" />
              </RadioButtonGroup>
            )}
          />
        </Stack>
      </FormGroup>
    </div>
  );
};

export default OncologyDetails;
