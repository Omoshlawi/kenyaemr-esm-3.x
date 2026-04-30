import React, { useState } from 'react';
import { Button, ModalBody, ModalFooter, ModalHeader, Select, SelectItem, TextInput } from '@carbon/react';
import { openmrsFetch, restBaseUrl, showSnackbar } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';

type ClaimCloseModalProps = {
  onClose: () => void;
  billUuid?: string;
  billNumber?: string;
  visit_uuid?: string;
};

const REASON_OPTIONS = [
  'WRONG_PATIENT',
  'NO_SERVICE_GIVEN',
  'WRONG_BENEFIT',
  'EXPIRED_VISIT',
  'EXHAUSTED_BENEFIT',
  'TIME_BARRED',
  'OTHER_REASONS',
];

const ClaimCloseModal: React.FC<ClaimCloseModalProps> = ({ onClose, billUuid, visit_uuid }) => {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [type, setType] = useState('OTHER_REASONS');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const body: any = {
        cancel_reason_text: text,
        cancel_reason_type: type,
        visit_uuid: visit_uuid,
      };
      if (billUuid) {
        body.bill_uuid = billUuid;
      }

      await openmrsFetch(`${restBaseUrl}/insuranceclaims/bill/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      showSnackbar({
        kind: 'success',
        title: t('closeClaim', 'Close Claim'),
        subtitle: t('claimClosedSuccessfully', 'Claim closed successfully'),
        timeoutInMs: 3000,
      });

      onClose();
    } catch (err: any) {
      showSnackbar({
        kind: 'error',
        title: t('closeClaimError', 'Close Claim Error'),
        subtitle: err?.message ?? t('closeClaimFailed', 'Failed to close claim'),
        timeoutInMs: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ModalHeader>{t('closeClaim', 'Close Claim')}</ModalHeader>
      <ModalBody>
        <div style={{ marginBottom: 12 }}>
          <TextInput
            id="cancel-reason-text"
            labelText={t('cancelReason', 'Cancel reason')}
            placeholder={t('enterCancelReason', 'Enter a detailed cancellation reason')}
            value={text}
            onChange={(e) => setText((e.target as HTMLInputElement).value)}
          />
        </div>

        <div>
          <Select
            id="cancel-reason-type"
            labelText={t('cancelReasonType', 'Cancel reason type')}
            value={type}
            onChange={(e) => setType((e.target as HTMLSelectElement).value)}>
            {REASON_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt} text={t(opt, opt)} />
            ))}
          </Select>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose} type="button">
          {t('close', 'Close')}
        </Button>
        <Button kind="primary" onClick={handleSubmit} disabled={isSubmitting || !text.trim()} type="button">
          {isSubmitting ? t('closing', 'Closing...') : t('closeClaim', 'Close Claim')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default ClaimCloseModal;
