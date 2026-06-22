import React from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import {
  PageHeader,
  PageHeaderContent,
  AppointmentsPictogram,
  OpenmrsDatePicker,
  ExtensionSlot,
} from '@openmrs/esm-framework';
import styles from './home-header.scss';

interface HomeHeaderProps {
  title: string;
  onDateChange?: (startDate: string, endDate: string) => void;
}

const HomeHeader: React.FC<HomeHeaderProps> = ({ title, onDateChange }) => {
  const { t } = useTranslation();
  const today = dayjs().toDate();
  const [startDate, setStartDate] = React.useState(today);
  const [endDate, setEndDate] = React.useState(today);

  const handleDateChange = (type: 'start' | 'end', date: string) => {
    if (type === 'start') {
      setStartDate(dayjs(date).startOf('day').toDate());
      onDateChange?.(dayjs(date).startOf('day').toISOString(), dayjs(endDate).endOf('day').toISOString());
    } else {
      setEndDate(dayjs(date).endOf('day').toDate());
      onDateChange?.(dayjs(startDate).startOf('day').toISOString(), dayjs(date).endOf('day').toISOString());
    }
  };

  return (
    <>
      <PageHeader className={styles.header} data-testid="home-header">
        <PageHeaderContent illustration={<AppointmentsPictogram />} title={title} />
        <ExtensionSlot name="provider-banner-info-slot" />
      </PageHeader>
      <div className={styles.dateFilters}>
        <div className={styles.dateInput}>
          <OpenmrsDatePicker
            id="start-date"
            labelText="Start Date"
            value={startDate}
            onChange={(date) => handleDateChange('start', typeof date === 'string' ? date : date.toISOString())}
          />
        </div>
        <div className={styles.dateInput}>
          <OpenmrsDatePicker
            id="end-date"
            labelText="End Date"
            value={endDate}
            onChange={(date) => handleDateChange('end', typeof date === 'string' ? date : date.toISOString())}
          />
        </div>
      </div>
    </>
  );
};

export default HomeHeader;
