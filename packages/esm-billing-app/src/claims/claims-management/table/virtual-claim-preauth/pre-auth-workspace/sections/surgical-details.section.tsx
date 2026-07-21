import React from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, useFormContext } from 'react-hook-form';
import { FormGroup, Select, SelectItem, Stack, TextArea } from '@carbon/react';
import ServiceDateTimeField from '../service-datetime.component';
import RequiredLabel from '../components/required-label.component';
import { asStringField, getPreauthFieldError, preauthField } from '../../utils';
import { ANAESTHESIA_TYPES } from '../../constants';
import { type PreauthFormData } from '../pre-auth-schema';
import styles from '../pre-auth-form.scss';

const SURGICAL_TEXT_FIELDS = [
  'chief_complaint',
  'vital_signs',
  'history_of_present_illness',
  'physical_examination',
  'investigation_report_details',
] as const;

const SurgicalDetails: React.FC = () => {
  const { t } = useTranslation();
  const {
    control,
    formState: { errors },
  } = useFormContext<PreauthFormData>();

  return (
    <div className={styles.twoCol}>
      <FormGroup legendText={t('surgicalDetails', 'Surgical details')}>
        <Stack gap={4}>
          {SURGICAL_TEXT_FIELDS.map((f) => (
            <Controller
              key={f}
              name={preauthField(f)}
              control={control}
              render={({ field: fld }) => (
                <TextArea {...asStringField(fld)} id={f} labelText={t(f, f.replace(/_/g, ' '))} rows={2} />
              )}
            />
          ))}
          <Controller
            name={preauthField('type_of_anaesthesia')}
            control={control}
            render={({ field }) => (
              <Select
                {...asStringField(field)}
                id="anaesthesia"
                labelText={<RequiredLabel>{t('typeOfAnaesthesia', 'Type of anaesthesia')}</RequiredLabel>}
                invalid={!!getPreauthFieldError(errors, 'type_of_anaesthesia')}
                invalidText={getPreauthFieldError(errors, 'type_of_anaesthesia')}>
                {ANAESTHESIA_TYPES.map((a) => (
                  <SelectItem key={a} value={a} text={a} />
                ))}
              </Select>
            )}
          />
          <ServiceDateTimeField
            control={control}
            errors={errors}
            dateField={{ name: 'surgery_date', label: t('surgeryDate', 'Surgery date') }}
            timeField={{ name: 'surgery_date_time', label: t('surgeryTime', 'Surgery time') }}
            timeFormatField={{ name: 'surgery_date_time_format', label: t('surgeryTimeFormat', 'AM/PM') }}
          />
        </Stack>
      </FormGroup>
    </div>
  );
};

export default SurgicalDetails;
