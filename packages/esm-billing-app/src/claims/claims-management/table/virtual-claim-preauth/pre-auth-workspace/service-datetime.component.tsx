import React from 'react';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import classNames from 'classnames';
import { OpenmrsDatePicker, ResponsiveWrapper } from '@openmrs/esm-framework';
import { SelectItem, TimePicker, TimePickerSelect } from '@carbon/react';
import { type amPm } from '@openmrs/esm-patient-common-lib';
import get from 'lodash-es/get';
import styles from './service-datetime.scss';

interface Field {
  name: string;
  label: string;
}

interface DateField {
  name: string;
  label: string | React.ReactElement;
}

interface ServiceDateTimeFieldProps {
  control: Control<any>;
  errors?: FieldErrors<any>;
  dateField: DateField;
  timeField: Field;
  timeFormatField: Field;
  minDate?: dayjs.ConfigType;
  maxDate?: dayjs.ConfigType;
  disabled?: boolean;
}

const ServiceDateTimeField: React.FC<ServiceDateTimeFieldProps> = ({
  control,
  errors = {},
  dateField,
  timeField,
  timeFormatField,
  minDate,
  maxDate,
  disabled,
}) => {
  const { t } = useTranslation();

  const minDateObj = minDate ? dayjs(minDate).startOf('day') : null;
  const maxDateObj = maxDate ? dayjs(maxDate).endOf('day') : null;

  const timeFieldError = get(errors, timeField.name);
  const timeFormatFieldError = get(errors, timeFormatField.name);

  return (
    <div className={classNames(styles.dateTimeSection, styles.sectionField)}>
      <Controller
        name={dateField.name}
        control={control}
        render={({ field, fieldState }) => (
          <ResponsiveWrapper>
            <OpenmrsDatePicker
              {...field}
              value={field.value as unknown as Date}
              className={styles.datePicker}
              id={`${dateField.name}Input`}
              data-testid={`${dateField.name}Input`}
              maxDate={maxDateObj}
              minDate={minDateObj}
              labelText={dateField.label}
              invalid={Boolean(fieldState?.error?.message)}
              invalidText={fieldState?.error?.message}
            />
          </ResponsiveWrapper>
        )}
      />
      <ResponsiveWrapper>
        <Controller
          name={timeField.name}
          control={control}
          render={({ field: { onBlur, onChange, value } }) => (
            <div className={styles.timePickerContainer}>
              <TimePicker
                className={styles.timePicker}
                disabled={disabled}
                id={timeField.name}
                invalid={Boolean((timeFieldError as any)?.message)}
                invalidText={(timeFieldError as any)?.message}
                labelText={timeField.label}
                onBlur={onBlur}
                onChange={(event) => onChange(event.target.value)}
                pattern="^(0[1-9]|1[0-2]):([0-5][0-9])$"
                value={value as string}>
                <Controller
                  name={timeFormatField.name}
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <TimePickerSelect
                      aria-label={timeFormatField.label}
                      className={classNames({
                        [styles.timePickerSelectError]: Boolean(timeFormatFieldError),
                      })}
                      disabled={disabled}
                      id={`${timeFormatField.name}Input`}
                      onChange={(event) => onChange(event.target.value as amPm)}
                      value={value as amPm}>
                      <SelectItem value="AM" text={t('AM', 'AM')} />
                      <SelectItem value="PM" text={t('PM', 'PM')} />
                    </TimePickerSelect>
                  )}
                />
              </TimePicker>
              {timeFormatFieldError && (
                <div className={styles.timerPickerError}>{(timeFormatFieldError as any)?.message}</div>
              )}
            </div>
          )}
        />
      </ResponsiveWrapper>
    </div>
  );
};

export default ServiceDateTimeField;
