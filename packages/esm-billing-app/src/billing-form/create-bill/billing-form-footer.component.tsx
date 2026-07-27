import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonSet, InlineLoading } from '@carbon/react';

import styles from './billing-form.scss';

interface BillingFormFooterProps {
  isSubmitting: boolean;
  disabled: boolean;
  onCancel: () => void;
}

const BillingFormFooter: React.FC<BillingFormFooterProps> = ({ isSubmitting, disabled, onCancel }) => {
  const { t } = useTranslation();

  return (
    <ButtonSet className={styles.buttonSet}>
      <Button className={styles.button} kind="secondary" onClick={onCancel}>
        {t('cancel', 'Cancel')}
      </Button>
      <Button className={styles.button} kind="primary" type="submit" disabled={disabled || isSubmitting}>
        {isSubmitting ? <InlineLoading description={t('saving', 'Saving...')} /> : t('saveAndClose', 'Save & close')}
      </Button>
    </ButtonSet>
  );
};

export default BillingFormFooter;
