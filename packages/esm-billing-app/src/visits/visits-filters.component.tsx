import React from 'react';
import { Layer, Select, SelectItem, DatePicker, DatePickerInput } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import styles from './visits-filters.scss';

export type DateRangePreset = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'custom';

export interface VisitFilterValues {
  dateRangePreset: DateRangePreset;
  customStart?: Date;
  customEnd?: Date;
}

export function getDateRange(filters: VisitFilterValues): [Date, Date] {
  const endOfToday = dayjs().endOf('day').toDate();
  switch (filters.dateRangePreset) {
    case 'yesterday': {
      const y = dayjs().subtract(1, 'day');
      return [y.startOf('day').toDate(), y.endOf('day').toDate()];
    }
    case 'last7days':
      return [dayjs().subtract(7, 'days').startOf('day').toDate(), endOfToday];
    case 'last30days':
      return [dayjs().subtract(30, 'days').startOf('day').toDate(), endOfToday];
    case 'thisMonth':
      return [dayjs().startOf('month').toDate(), endOfToday];
    case 'custom':
      return [filters.customStart ?? dayjs().startOf('day').toDate(), filters.customEnd ?? endOfToday];
    default:
      return [dayjs().startOf('day').toDate(), endOfToday];
  }
}

interface VisitFiltersProps {
  values: VisitFilterValues;
  onChange: (values: VisitFilterValues) => void;
}

const VisitFilters: React.FC<VisitFiltersProps> = ({ values, onChange }) => {
  const { t } = useTranslation();

  const handlePresetChange = (preset: DateRangePreset) => {
    if (preset === 'custom') {
      onChange({
        ...values,
        dateRangePreset: 'custom',
        customStart: values.customStart ?? dayjs().startOf('day').toDate(),
        customEnd: values.customEnd ?? dayjs().endOf('day').toDate(),
      });
    } else {
      onChange({ ...values, dateRangePreset: preset });
    }
  };

  const handleCustomRangeChange = ([start, end]: Array<Date>) => {
    if (start && end) {
      onChange({
        ...values,
        dateRangePreset: 'custom',
        customStart: dayjs(start).startOf('day').toDate(),
        customEnd: dayjs(end).endOf('day').toDate(),
      });
    }
  };

  return (
    <div className={styles.filterBar}>
      <div className={styles.filterGroup}>
        <span className={styles.filterLabel}>{t('dateRange', 'Date range')}</span>
        <Layer>
          <Select
            id="visits-date-range"
            labelText=""
            hideLabel
            size="md"
            value={values.dateRangePreset}
            onChange={(e) => handlePresetChange(e.target.value as DateRangePreset)}>
            <SelectItem value="today" text={t('today', 'Today')} />
            <SelectItem value="yesterday" text={t('yesterday', 'Yesterday')} />
            <SelectItem value="last7days" text={t('last7Days', 'Last 7 days')} />
            <SelectItem value="last30days" text={t('last30Days', 'Last 30 days')} />
            <SelectItem value="thisMonth" text={t('thisMonth', 'This month')} />
            <SelectItem value="custom" text={t('custom', 'Custom')} />
          </Select>
        </Layer>
      </div>

      {values.dateRangePreset === 'custom' && (
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>{t('customRange', 'Custom range')}</span>
          <Layer>
            <DatePicker
              datePickerType="range"
              maxDate={new Date()}
              value={[values.customStart, values.customEnd].filter(Boolean) as Array<Date>}
              onChange={handleCustomRangeChange}>
              <DatePickerInput
                id="visits-custom-start"
                placeholder="mm/dd/yyyy"
                labelText={t('startDate', 'Start date')}
                size="md"
              />
              <DatePickerInput
                id="visits-custom-end"
                placeholder="mm/dd/yyyy"
                labelText={t('endDate', 'End date')}
                size="md"
              />
            </DatePicker>
          </Layer>
        </div>
      )}
    </div>
  );
};

export default VisitFilters;
