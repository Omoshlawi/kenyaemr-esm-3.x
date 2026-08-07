import { formatDatetime, parseDate } from '@openmrs/esm-framework';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import OtpInput from 'react-otp-input';
import { EmtCase } from '../../types';
import styles from './referral-modals.scss';

const OtpVerificationStep: React.FC<{
  otp: string;
  setOtp: (otp: string) => void;
  emtCase: EmtCase;
  length: number;
}> = ({ otp, setOtp, emtCase, length }) => {
  const { t } = useTranslation();
  const containerStyle = useMemo(
    () => ({
      display: 'flex',
      gap: '8px',
      justifyContent: 'center',
      alignItems: 'center',
    }),
    [],
  );
  return (
    <div>
      <div className={styles.otpInfo}>
        <div>
          <strong>{t('phoneNumber', 'Phone number')}:</strong>
          <span>{emtCase?.consentMaskedTarget}</span>
        </div>
        <div>
          <strong>{t('expiresAt', 'Expires at')}:</strong>
          <span>{emtCase.consentExpiresAt ? formatDatetime(parseDate(emtCase.consentExpiresAt)) : '--'}</span>
        </div>
      </div>
      <OtpInput
        value={otp}
        onChange={setOtp}
        numInputs={length}
        inputType={'password'}
        renderInput={(p, i) => <input {...p} className={styles.input} />}
        renderSeparator={<span className={styles.separator}>-</span>}
        containerStyle={containerStyle}
        skipDefaultStyles={true}
        shouldAutoFocus
        placeholder="*"
      />
    </div>
  );
};

export default OtpVerificationStep;
