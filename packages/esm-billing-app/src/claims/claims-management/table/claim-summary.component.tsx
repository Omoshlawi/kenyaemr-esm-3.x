import {
  Button,
  ModalBody,
  ModalFooter,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Tag,
} from '@carbon/react';
import { Diagnosis, Encounter, formatDate, parseDate, useFeatureFlag, useVisit } from '@openmrs/esm-framework';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './claim-summary-modal/claim-summary.scss';
import upperCase from 'lodash-es/upperCase';
import capitalize from 'lodash-es/capitalize';
import { useCurrencyFormatting } from '../../../helpers/currency';
import { SHA_INTERVENTION_LABELS } from '../../../constants';

type ShaBenefitSelection = {
  packages?: unknown;
  interventions?: unknown;
};

export const ClaimSummary = ({
  claimId,
  embedded = false,
  closeModal,
}: {
  claimId: string;
  embedded?: boolean;
  closeModal?: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <React.Fragment>
      <div className={styles.invoiceContainer}>
        <div className={styles.invoiceHeader}>
          <div className={styles.invoiceTitle}>
            <h3>{t('claimSummary', 'CLAIM SUMMARY')}</h3>
          </div>
          <div className={styles.claimNumber}>
            <span className={styles.claimNumberLabel}>{t('claimNo', 'Claim No.')}</span>
          </div>
        </div>
      </div>

      {!embedded ? (
        <Button kind="primary" onClick={() => closeModal?.()} type="button">
          {t('close', 'Close')}
        </Button>
      ) : null}
    </React.Fragment>
  );
};
