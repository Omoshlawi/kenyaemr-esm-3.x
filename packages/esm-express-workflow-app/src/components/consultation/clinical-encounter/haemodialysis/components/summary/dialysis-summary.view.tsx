import React from 'react';
import type { DialysisSummary, SignatureBlock } from '../../types';
import { displayValue, summaryToFields } from '../../utils/formatters';
import FieldGrid from '../shared/field-grid.component';
import SectionCard from '../shared/section-card.component';
import sharedStyles from '../shared/shared.scss';
import styles from './dialysis-summary.scss';

type Props = {
  data?: DialysisSummary;
  signatures?: SignatureBlock;
};

const DialysisSummaryView: React.FC<Props> = ({ data, signatures }) => (
  <SectionCard title="5. Dialysis Summary">
    {data ? (
      <>
        <FieldGrid fields={summaryToFields(data)} />
        <div className={styles.commentsBlock}>
          <div className={styles.commentsLabel}>Comments</div>
          <div className={styles.commentsText}>{displayValue(data.comments)}</div>
          <div className={styles.commentsLabel}>Additional Remarks / Emergency Instructions</div>
          <div className={styles.remarksBox}>{displayValue(data.additionalRemarks)}</div>
        </div>
        <div className={styles.signatures}>
          <div className={styles.signatureBlock}>
            <div className={styles.signatureHeading}>Dialysis Nurse</div>
            <div>Name: {displayValue(signatures?.nurseName)}</div>
            <div>NCK No: {displayValue(signatures?.nurseNckNo)}</div>
            <div>Date: {displayValue(signatures?.nurseDate)}</div>
            <div className={styles.signatureLine} />
            <div className={styles.signatureCaption}>Signature</div>
          </div>
          <div className={styles.signatureBlock}>
            <div className={styles.signatureHeading}>Doctor / Nephrologist</div>
            <div>Name: {displayValue(signatures?.doctorName)}</div>
            <div>KMPDC No: {displayValue(signatures?.doctorKmpdcNo)}</div>
            <div>Date: {displayValue(signatures?.doctorDate)}</div>
            <div className={styles.signatureLine} />
            <div className={styles.signatureCaption}>Signature</div>
          </div>
          <div className={styles.signatureBlock}>
            <div className={styles.signatureHeading}>Hospital Stamp</div>
            <div className={styles.signatureLine} />
            <div className={styles.signatureCaption}>Official stamp</div>
          </div>
        </div>
      </>
    ) : (
      <div className={sharedStyles.emptyState}>No dialysis summary recorded yet.</div>
    )}
  </SectionCard>
);

export default DialysisSummaryView;
