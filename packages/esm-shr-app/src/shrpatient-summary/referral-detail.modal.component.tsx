import React from 'react';
import { itemDetails } from '../types';
import { Button, Layer, ModalBody, ModalFooter, ModalHeader, Tag, Tile } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import styles from './referral-detail.scss';

type Referral = {
  uuid: string;
  Category: string;
  reasons: string;
  priority: string;
  dateRequested: string;
  requesterCode: string;
  performer: string;
  referralNote: string;
};

type ReferraLDetailProps = {
  item: itemDetails;
  onClose?: () => void;
};

const getPriorityLabel = (priority?: string) => {
  if (!priority) {
    return null;
  }

  return <Tag type="blue">{priority}</Tag>;
};

const ReferralDetailModal: React.FC<ReferraLDetailProps> = ({ item, onClose }) => {
  const referralDetail = item as unknown as Referral;
  const { t } = useTranslation();

  const detailItems = [
    {
      label: t('category', 'Category'),
      value: referralDetail.Category || t('notAvailable', 'Not available'),
    },
    {
      label: t('priority', 'Priority'),
      value: referralDetail.priority || t('notAvailable', 'Not available'),
    },
    {
      label: t('dateRequested', 'Date requested'),
      value: referralDetail.dateRequested || t('notAvailable', 'Not available'),
    },
    {
      label: t('requesterCode', 'Requester code'),
      value: referralDetail.requesterCode || t('notAvailable', 'Not available'),
    },

    {
      label: t('reasons', 'Reasons'),
      value: referralDetail.reasons || t('notAvailable', 'Not available'),
    },
  ];

  return (
    <>
      <ModalHeader title={t('referralDetail', 'Referral Detail')} closeModal={onClose} />
      <ModalBody>
        <div className={styles.container}>
          <Layer>
            <Tile className={styles.summaryCard}>
              <div className={styles.summaryHeader}>
                <div>
                  <div className={styles.summaryLabel}>{t('performer', 'Performer')}</div>
                  <div className={styles.summaryTitle}>
                    {referralDetail.performer || t('notAvailable', 'Not available')}
                  </div>
                </div>
                {referralDetail.priority ? getPriorityLabel(referralDetail.priority) : null}
              </div>

              <div className={styles.detailGrid}>
                {detailItems.map((item) => (
                  <div key={item.label} className={styles.detailItem}>
                    <div className={styles.detailLabel}>{item.label}</div>
                    <div className={styles.detailValue}>{item.value}</div>
                  </div>
                ))}
              </div>
            </Tile>
          </Layer>

          <Layer>
            <Tile className={styles.notesCard}>
              <div className={styles.notesLabel}>{t('notes', 'Notes')}</div>
              <div className={styles.notesContent}>
                {referralDetail.referralNote || t('noNotesProvided', 'No notes provided.')}
              </div>
            </Tile>
          </Layer>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          {t('close', 'Close')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default ReferralDetailModal;
