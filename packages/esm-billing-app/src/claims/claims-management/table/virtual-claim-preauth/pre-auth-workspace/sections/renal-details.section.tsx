import React from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, useFormContext } from 'react-hook-form';
import { FormGroup, RadioButton, RadioButtonGroup, Select, SelectItem, Stack, TextInput } from '@carbon/react';
import ServiceDateTimeField from '../service-datetime.component';
import RequiredLabel from '../components/required-label.component';
import { asStringField, getPreauthFieldError, preauthField } from '../../utils';
import { FREQUENCY_OPTIONS } from '../../constants';
import { type PreauthFormData } from '../pre-auth-schema';
import styles from '../pre-auth-form.scss';

const RenalDetails: React.FC = () => {
  const { t } = useTranslation();
  const {
    control,
    formState: { errors },
  } = useFormContext<PreauthFormData>();

  return (
    <div className={styles.twoCol}>
      <FormGroup legendText={t('renalDetails', 'Renal details')}>
        <Stack gap={4}>
          <Controller
            name={preauthField('number_of_sessions_required')}
            control={control}
            render={({ field }) => (
              <TextInput
                {...asStringField(field)}
                id="sessions"
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
                id="cost-session"
                type="number"
                labelText={<RequiredLabel>{t('costPerSession', 'Cost per session (KES)')}</RequiredLabel>}
                invalid={!!getPreauthFieldError(errors, 'cost_per_session')}
                invalidText={getPreauthFieldError(errors, 'cost_per_session')}
              />
            )}
          />
          <Controller
            name={preauthField('frequency_of_sessions')}
            control={control}
            render={({ field }) => (
              <Select
                {...asStringField(field)}
                id="frequency"
                labelText={t('frequencyOfSessions', 'Frequency of sessions')}>
                {FREQUENCY_OPTIONS.map((f) => (
                  <SelectItem key={f} value={f} text={f.replace(/_/g, ' ')} />
                ))}
              </Select>
            )}
          />
          <ServiceDateTimeField
            control={control}
            errors={errors}
            dateField={{ name: 'renal_date', label: t('renalDate', 'Renal date') }}
            timeField={{ name: 'renal_date_time', label: t('renalTime', 'Renal time') }}
            timeFormatField={{ name: 'renal_date_time_format', label: t('renalTimeFormat', 'AM/PM') }}
          />
          <Controller
            name={preauthField('is_co_insured')}
            control={control}
            render={({ field }) => (
              <RadioButtonGroup
                legendText={t('isCoInsured', 'Co-insured')}
                name={`co-insured-${field.name}`}
                valueSelected={field.value === true ? 'yes' : field.value === false ? 'no' : ''}
                onChange={(value) => field.onChange(value === 'yes')}>
                <RadioButton id="co-insured-yes" labelText={t('yes', 'Yes')} value="yes" />
                <RadioButton id="co-insured-no" labelText={t('no', 'No')} value="no" />
              </RadioButtonGroup>
            )}
          />
        </Stack>
      </FormGroup>
    </div>
  );
};

export default RenalDetails;
