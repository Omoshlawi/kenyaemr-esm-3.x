import { Form, Select, SelectItem } from '@carbon/react';
import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import styles from '../payment-history.scss';
import { usePaymentFilterContext } from '../usePaymentFilterContext';
import { useTimeSheets } from '../../payment-points/payment-points.resource';

const schema = z.object({
  timesheet: z.string(),
});

type FormData = z.infer<typeof schema>;

export const TimesheetsFilter = () => {
  const { filters } = usePaymentFilterContext();
  const { cashiers } = filters;
  const { timesheets } = useTimeSheets();

  const uniqueBillsCashiersUUIDS = Array.from(new Set(cashiers));
  const selectedCashiersTimesheets = timesheets
    .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime())
    .filter((sheet) => {
      return uniqueBillsCashiersUUIDS.includes(sheet.cashier.uuid);
    });

  const { t } = useTranslation();
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      timesheet: undefined,
    },
  });

  const { register } = form;

  if (selectedCashiersTimesheets.length === 0) {
    return null;
  }

  return (
    <Form {...form}>
      <Select
        id="timesheet"
        {...register('timesheet')}
        labelText={t('timesheet', 'Timesheet')}
        className={styles.timesheetsFilter}>
        <SelectItem value={undefined} text={'No timesheet'} />
        {selectedCashiersTimesheets.map((sheet) => (
          <SelectItem
            value={sheet.uuid}
            text={`${sheet.display} ${uniqueBillsCashiersUUIDS.length > 1 ? `(${sheet.cashier.display})` : ''}`}
          />
        ))}
      </Select>
    </Form>
  );
};
