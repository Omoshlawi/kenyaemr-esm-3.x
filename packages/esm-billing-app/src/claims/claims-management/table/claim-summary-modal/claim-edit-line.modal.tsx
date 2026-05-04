import React, { useState } from 'react';
import { Button, ModalBody, ModalFooter, ModalHeader, TextInput } from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { editInsuranceClaimLine } from './claim.resource';
import styles from './claim-modals.scss';

type ClaimEditLineModalProps = {
  onClose: () => void;
  claimLineId?: string;
  quantity?: number;
  scheme_code?: string;
  unit_price?: string | number;
  visit_uuid?: string;
};

const ClaimEditLineModal: React.FC<ClaimEditLineModalProps> = ({
  onClose,
  claimLineId,
  quantity,
  scheme_code,
  unit_price,
  visit_uuid,
}) => {
  const { t } = useTranslation();
  const [q, setQ] = useState<number>(Number(quantity ?? 1));
  const [price, setPrice] = useState<string>(String(unit_price ?? ''));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!claimLineId) {
      return;
    }
    setIsSubmitting(true);
    try {
      await editInsuranceClaimLine(claimLineId, Number(q), String(price), visit_uuid);

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
        <div className={styles.formField}>
          <TextInput
            id="claim-line-quantity"
            labelText={t('quantity', 'Quantity')}
            value={String(q)}
            onChange={(e) => setQ(Number((e.target as HTMLInputElement).value))}
          />
        </div>

        <div className={styles.formField}>
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
