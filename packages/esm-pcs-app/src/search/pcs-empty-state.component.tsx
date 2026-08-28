import React from 'react';
import { Button } from '@carbon/react';
import { Reset } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import styles from '../pcs.scss';
import { EmptySvg } from '../empty-svg.component';

interface PcsEmptyStateProps {
  title: string;
  subtitle: string;
  /** Puts the patient's own details back into the filters. */
  onReset: () => void;
}

/** Shown both before a search has been made and when one returned nothing. */
const PcsEmptyState: React.FC<PcsEmptyStateProps> = ({ title, subtitle, onReset }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.pcsEmptyState}>
      <EmptySvg />
      <p className={styles.pcsEmptyTitle}>{title}</p>
      <p className={styles.pcsEmptySubtitle}>{subtitle}</p>
      <Button kind="ghost" size="sm" renderIcon={Reset} onClick={onReset}>
        {t('resetToPatient', 'Reset to patient details')}
      </Button>
    </div>
  );
};

export default PcsEmptyState;
