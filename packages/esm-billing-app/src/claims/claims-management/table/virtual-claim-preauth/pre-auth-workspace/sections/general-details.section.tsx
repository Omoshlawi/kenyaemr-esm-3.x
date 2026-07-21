import React from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, useFormContext } from 'react-hook-form';
import { TextArea, TextInput } from '@carbon/react';
import { type PreauthQueueItem } from '../../../../../../billing-form/social-health-authority/type';
import ServiceDateTimeField from '../service-datetime.component';
import RequiredLabel from '../components/required-label.component';
import { type PreauthFormData, type PreauthType } from '../pre-auth-schema';
import styles from '../pre-auth-form.scss';

interface GeneralDetailsProps {
  item?: PreauthQueueItem;
  preauthType: PreauthType;
}

const GeneralDetails: React.FC<GeneralDetailsProps> = ({ item, preauthType }) => {
  const { t } = useTranslation();
  const {
    control,
    formState: { errors },
  } = useFormContext<PreauthFormData>();

  return (
    <>
      <div className={styles.twoCol}>
        <ServiceDateTimeField
          control={control}
          errors={errors}
          dateField={{
            name: 'service_start',
            label: <RequiredLabel>{t('serviceStart', 'Service start')}</RequiredLabel>,
          }}
          timeField={{ name: 'service_start_time', label: t('startTime', 'Start time') }}
          timeFormatField={{ name: 'service_start_time_format', label: t('startTimeFormat', 'AM/PM') }}
        />
        <ServiceDateTimeField
          control={control}
          errors={errors}
          dateField={{ name: 'service_end', label: <RequiredLabel>{t('serviceEnd', 'Service end')}</RequiredLabel> }}
          timeField={{ name: 'service_end_time', label: t('endTime', 'End time') }}
          timeFormatField={{ name: 'service_end_time_format', label: t('endTimeFormat', 'AM/PM') }}
        />
      </div>

      {preauthType !== 'IMAGING' && (
        <div className={styles.twoCol}>
          <Controller
            name="clinical_indications"
            control={control}
            render={({ field }) => (
              <TextArea
                {...field}
                id="clinical-indications"
                labelText={t('clinicalIndications', 'Clinical indications')}
                placeholder={t('clinicalIndicationsHint', 'Describe clinical reasons...')}
                rows={3}
              />
            )}
          />
        </div>
      )}

      <div className={styles.twoCol}>
        <Controller
          name="unit_price"
          control={control}
          render={({ field }) => {
            const tariffNumeric = item?.tariff != null ? Number(item.tariff) : null;
            const hasTariffCap = tariffNumeric != null && tariffNumeric > 0;
            const exceedsTariff = hasTariffCap && field.value !== '' && Number(field.value) > tariffNumeric;
            const showError = !!errors.unit_price || exceedsTariff;
            const errorText =
              errors.unit_price?.message ??
              (exceedsTariff ? t('unitPriceExceedsTariff', 'Cannot exceed tariff') : undefined);

            return (
              <TextInput
                {...field}
                id="unit-price"
                type="number"
                min="0"
                max={hasTariffCap ? String(tariffNumeric) : undefined}
                labelText={
                  <RequiredLabel>
                    {hasTariffCap ? t('unitPriceWithTariff', 'Unit price (KES)') : t('unitPrice', 'Unit price (KES)')}
                  </RequiredLabel>
                }
                helperText={t(
                  'unitPriceHelp',
                  'Amount requested from SHA for this intervention. Pre-filled with the published tariff.',
                )}
                placeholder="0.00"
                invalid={showError}
                invalidText={errorText}
              />
            );
          }}
        />
      </div>

      <div className={styles.twoCol}>
        <Controller
          name="provider_notification_email"
          control={control}
          render={({ field }) => (
            <TextInput
              {...field}
              id="provider-email"
              type="email"
              labelText={<RequiredLabel>{t('providerEmail', 'Provider notification email')}</RequiredLabel>}
              invalid={!!errors.provider_notification_email}
              invalidText={errors.provider_notification_email?.message}
            />
          )}
        />
      </div>
    </>
  );
};

export default GeneralDetails;
