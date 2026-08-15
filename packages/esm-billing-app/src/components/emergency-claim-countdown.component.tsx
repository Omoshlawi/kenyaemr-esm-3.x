import React, { useEffect, useState } from 'react';
import { Tag } from '@carbon/react';
import { Time } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';

type EmergencyClaimCountdownProps = {
  expiry?: string | null;
  className?: string;
};

const pad = (n: number) => String(n).padStart(2, '0');

const EmergencyClaimCountdown: React.FC<EmergencyClaimCountdownProps> = ({ expiry, className }) => {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!expiry) {
    return null;
  }

  const expiryMs = new Date(expiry).getTime();
  if (Number.isNaN(expiryMs)) {
    return null;
  }

  const remaining = expiryMs - now;

  if (remaining <= 0) {
    return (
      <Tag type="red" size="sm" renderIcon={Time} className={className}>
        {t('emergencySubmitExpired', 'Submission window expired')}
      </Tag>
    );
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Green > 6h left, warm < 6h, red < 1h.
  const tagType = hours < 1 ? 'red' : hours < 6 ? 'magenta' : 'green';

  return (
    <Tag type={tagType} size="sm" renderIcon={Time} className={className}>
      {t('emergencySubmitWithin', 'Submit within {{time}}', {
        time: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
      })}
    </Tag>
  );
};

export default EmergencyClaimCountdown;
