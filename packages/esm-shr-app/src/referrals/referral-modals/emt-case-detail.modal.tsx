import React, { useCallback, useRef } from 'react';
import { Button, Layer, ModalBody, ModalFooter, ModalHeader, Tag, Tile } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import styles from './referral-modals.scss';
import { EmtCase } from '../../types';
import { formatDatetime, parseDate, showModal } from '@openmrs/esm-framework';

type ReferraLDetailProps = {
  item: EmtCase;
  onClose?: () => void;
};

const EmtCaseDetailModal: React.FC<ReferraLDetailProps> = ({ item: referralDetail, onClose }) => {
  const { t } = useTranslation();
  const isOpeningAcceptModal = useRef(false);

  const detailItems: Array<{ label: string; value: string }> = [
    {
      label: t('ambulance', 'Ambulance'),
      value: referralDetail.ambulanceFrCode || t('notAvailable', 'Not available'),
    },
    {
      label: t('dateRequested', 'Date requested'),
      value: referralDetail.requestedAt
        ? formatDatetime(parseDate(referralDetail.requestedAt))
        : t('notAvailable', 'Not available'),
    },
    {
      label: t('facilityCode', 'Facility Code'),
      value: referralDetail.facilityFrCode || t('notAvailable', 'Not available'),
    },
    {
      label: t('caseNumber', 'Case Number'),
      value: referralDetail.caseNumber || t('notAvailable', 'Not available'),
    },
    {
      label: t('interventions', 'Intervenstions'),
      value: referralDetail.interventions.length
        ? referralDetail.interventions.join(', ')
        : t('notAvailable', 'Not available'),
    },
  ];

  const handleAccept = useCallback(() => {
    if (isOpeningAcceptModal.current) {
      return;
    }

    isOpeningAcceptModal.current = true;
    onClose?.();

    // Defer so the detail modal fully closes before opening accept.
    window.setTimeout(() => {
      const dismiss = showModal('accept-emt-case-modal', {
        onClose: () => dismiss(),
        item: referralDetail,
      });
    }, 0);
  }, [onClose, referralDetail]);

  return (
    <>
      <ModalHeader title={t('emtCaseDetail', 'EMT Case Detail')} closeModal={onClose} />
      <ModalBody>
        <div className={styles.container}>
          <Layer>
            <Tile className={styles.summaryCard}>
              <div className={styles.summaryHeader}>
                <div>
                  <div className={styles.summaryLabel}>{t('crId', 'CR Id')}</div>
                  <strong className={styles.summaryTitle}>
                    {referralDetail.crId || t('notAvailable', 'Not available')}
                  </strong>
                </div>
                <Tag type="blue">{referralDetail.status || t('notAvailable', 'Not available')}</Tag>
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
                {referralDetail.referralNotes || t('noNotesProvided', 'No notes provided.')}
              </div>
            </Tile>
          </Layer>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          {t('close', 'Close')}
        </Button>
        <Button kind="primary" onClick={handleAccept}>
          {t('acceptCase', 'Accept Case')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default EmtCaseDetailModal;
