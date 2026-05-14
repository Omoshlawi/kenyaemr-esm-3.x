import React, { useMemo } from 'react';
import { Select, SelectItem, FormGroup } from '@carbon/react';
import styles from './time-picker-dropdown.scss';

const MINUTE_INTERVAL = 1;

function buildMinuteOptions() {
  return Array.from({ length: 60 / MINUTE_INTERVAL }, (_, index) => {
    const minute = String(index * MINUTE_INTERVAL).padStart(2, '0');
    return minute;
  });
}

interface TimePickerDropdownProps {
  id: string;
  labelText: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  invalidText?: string;
  existingTimeEntries?: Array<{ hour: number; time: string }>;
  minTime?: string;
}

const TimePickerDropdown: React.FC<TimePickerDropdownProps> = ({
  id,
  labelText,
  value,
  onChange,
  invalid = false,
  invalidText,
  existingTimeEntries = [],
  minTime,
}) => {
  const [hours, minutes] = value && value.includes(':') ? value.split(':') : ['', ''];
  const latestEntry = useMemo(() => {
    const allEntries = [...existingTimeEntries];
    if (minTime && /^\d{2}:\d{2}$/.test(minTime)) {
      allEntries.push({ hour: -1, time: minTime });
    }
    if (allEntries.length === 0) {
      return null;
    }
    const sorted = allEntries.slice().sort((a, b) => {
      const aTime = a.time.split(':').map(Number);
      const bTime = b.time.split(':').map(Number);
      const aTimeInMinutes = aTime[0] * 60 + aTime[1];
      const bTimeInMinutes = bTime[0] * 60 + bTime[1];
      return aTimeInMinutes - bTimeInMinutes;
    });
    return sorted[sorted.length - 1];
  }, [existingTimeEntries, minTime]);
  const minuteValues = useMemo(() => buildMinuteOptions(), []);

  const hourOptions = useMemo(() => {
    if (!latestEntry) {
      return Array.from({ length: 24 }, (_, i) => {
        const hour = i.toString().padStart(2, '0');
        return { value: hour, text: hour, disabled: false, reason: '' };
      });
    }
    const [latestHour, latestMinute] = latestEntry.time.split(':').map(Number);
    return Array.from({ length: 24 }, (_, i) => {
      const hour = i.toString().padStart(2, '0');
      let isDisabled = false;
      let disableReason = '';
      if (i < latestHour) {
        isDisabled = true;
        disableReason = 'before latest entry';
      } else if (i === latestHour && latestMinute >= 55) {
        isDisabled = true;
        disableReason = 'latest entry full hour';
      }
      const displayText = isDisabled ? `${hour} ${disableReason}` : hour;
      return {
        value: hour,
        text: displayText,
        disabled: isDisabled,
        reason: disableReason,
      };
    });
  }, [latestEntry]);

  const minuteOptions = useMemo(() => {
    if (!latestEntry || !hours) {
      return minuteValues.map((minute) => {
        return { value: minute, text: minute, disabled: false };
      });
    }
    const [latestHour, latestMinute] = latestEntry.time.split(':').map(Number);
    const currentHour = parseInt(hours);
    return minuteValues.map((minute) => {
      const minuteValue = parseInt(minute, 10);
      let isDisabled = false;
      let disableReason = '';
      if (currentHour < latestHour) {
        isDisabled = true;
        disableReason = 'before latest entry';
      } else if (currentHour === latestHour && minuteValue <= latestMinute) {
        isDisabled = true;
        disableReason = `≤ ${latestMinute} min`;
      }
      const displayText = isDisabled ? `${minute} ${disableReason}` : minute;
      return { value: minute, text: displayText, disabled: isDisabled };
    });
  }, [hours, latestEntry, minuteValues]);

  const handleHourChange = (selectedHour: string) => {
    if (!selectedHour || selectedHour === '') {
      return;
    }
    const hourOption = hourOptions.find((opt) => opt.value === selectedHour);
    if (hourOption && hourOption.disabled) {
      alert(`This hour (${selectedHour}) cannot be selected as it is before a previous entry.`);
      return;
    }
    let defaultMinute = '00';
    if (existingTimeEntries.length > 0 && latestEntry) {
      const [latestHour, latestMinute] = latestEntry.time.split(':').map(Number);
      const selectedHourInt = parseInt(selectedHour);
      if (selectedHourInt === latestHour) {
        const nextValidMinute = Math.ceil((latestMinute + 1) / MINUTE_INTERVAL) * MINUTE_INTERVAL;
        if (nextValidMinute < 60) {
          defaultMinute = nextValidMinute.toString().padStart(2, '0');
        } else {
          alert(`Hour ${selectedHour} has no available time slots after ${latestEntry.time}`);
          return;
        }
      }
    }
    const newTime = `${selectedHour}:${defaultMinute}`;
    onChange(newTime);
  };

  const handleMinuteChange = (selectedMinute: string) => {
    const newTime = `${hours || '00'}:${selectedMinute}`;
    if (existingTimeEntries.length > 0 && latestEntry && hours) {
      const currentHour = parseInt(hours);
      const currentMinute = parseInt(selectedMinute);
      const [latestHour, latestMinute] = latestEntry.time.split(':').map(Number);
      if (currentHour === latestHour && currentMinute <= latestMinute) {
        alert(`Cannot select ${selectedMinute} minutes. Must select a time after ${latestEntry.time}`);
        return;
      }
    }
    onChange(newTime);
  };

  return (
    <div className={styles.timePickerContainer}>
      <FormGroup legendText={labelText} invalid={invalid === true}>
        <div className={styles.timeInputsWrapper}>
          <div className={styles.timeInput}>
            <Select
              id={`${id}-hours`}
              labelText="Hours (HH)"
              value={hours}
              onChange={(e) => handleHourChange((e.target as HTMLSelectElement).value)}
              invalid={invalid === true}>
              <SelectItem value="" text="HH" />
              {hourOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.disabled ? '' : option.value}
                  text={option.text}
                  disabled={option.disabled}
                  className={option.disabled ? styles.disabledOption : undefined}
                />
              ))}
            </Select>
          </div>

          <div className={styles.separator}>:</div>

          <div className={styles.timeInput}>
            <Select
              id={`${id}-minutes`}
              labelText="Minutes (MM)"
              value={minutes}
              onChange={(e) => handleMinuteChange((e.target as HTMLSelectElement).value)}
              invalid={invalid === true}>
              <SelectItem value="" text="MM" />
              {minuteOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  text={option.text}
                  disabled={option.disabled}
                  className={option.disabled ? styles.disabledOption : undefined}
                />
              ))}
            </Select>
          </div>
        </div>

        {invalid && invalidText && <div className={styles.errorText}>{invalidText}</div>}
      </FormGroup>
    </div>
  );
};

export default TimePickerDropdown;
