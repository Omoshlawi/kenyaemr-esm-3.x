import React, { useState } from 'react';
import { Button, ModalBody, ModalFooter, ModalHeader, TextInput } from '@carbon/react';
import { openmrsFetch, restBaseUrl, showSnackbar } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';

type ClaimEditLineModalProps = {
  onClose: () => void;
  claimLineId?: string;
  quantity?: number;
  scheme_code?: string;
  unit_price?: string | number;
};

const ClaimEditLineModal: React.FC<ClaimEditLineModalProps> = ({
  onClose,
  claimLineId,
  quantity,
  scheme_code,
  unit_price,
}) => {
  const { t } = useTranslation();
  const [q, setQ] = useState<number>(Number(quantity ?? 1));
  const [scheme, setScheme] = useState<string>(scheme_code ?? '');
  const [price, setPrice] = useState<string>(String(unit_price ?? ''));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!claimLineId) {
      return;
    }
    setIsSubmitting(true);
    try {
      const body = {
        claim_line_id: String(claimLineId),
        quantity: Number(q),
        unit_price: String(price),
      };

      await openmrsFetch(`${restBaseUrl}/insuranceclaims/line/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      showSnackbar({
        kind: 'success',
        title: t('editLine', 'Edit line'),
        subtitle: t('lineEdited', 'Line edited successfully'),
        timeoutInMs: 3000,
      });

      onClose();
    } catch (err: any) {
      showSnackbar({
        kind: 'error',
        title: t('editLineError', 'Edit line error'),
        subtitle: err?.message ?? t('editLineFailed', 'Failed to edit line'),
        timeoutInMs: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ModalHeader closeModal={onClose}>{t('editLine', 'Edit line item')}</ModalHeader>
      <ModalBody>
        <div style={{ marginBottom: 12 }}>
          <TextInput
            id="claim-line-quantity"
            labelText={t('quantity', 'Quantity')}
            value={String(q)}
            onChange={(e) => setQ(Number((e.target as HTMLInputElement).value))}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <TextInput
            id="claim-line-scheme"
            labelText={t('schemeCode', 'Scheme code')}
            value={scheme}
            onChange={(e) => setScheme((e.target as HTMLInputElement).value)}
          />
        </div>

        <div>
          <TextInput
            id="claim-line-unit-price"
            labelText={t('unitPrice', 'Unit price')}
            value={price}
            onChange={(e) => setPrice((e.target as HTMLInputElement).value)}
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose} type="button">
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="primary" onClick={handleSubmit} disabled={isSubmitting} type="button">
          {isSubmitting ? t('saving', 'Saving...') : t('save', 'Save')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default ClaimEditLineModal;
