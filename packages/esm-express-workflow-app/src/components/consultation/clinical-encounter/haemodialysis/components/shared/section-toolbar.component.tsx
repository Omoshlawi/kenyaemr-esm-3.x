import React from 'react';
import { useTranslation } from 'react-i18next';
import { Add, ChartColumn, Table as TableIcon } from '@carbon/react/icons';
import styles from './section-toolbar.scss';

export type SectionViewMode = 'graph' | 'table';

type SectionToolbarProps = {
  showViewToggle?: boolean;
  viewMode: SectionViewMode;
  onViewModeChange: (mode: SectionViewMode) => void;
  onAddClick?: () => void;
  isAddButtonDisabled?: boolean;
  addLabel?: string;
};

export const SectionToolbar: React.FC<SectionToolbarProps> = ({
  showViewToggle = true,
  viewMode,
  onViewModeChange,
  onAddClick,
  isAddButtonDisabled = false,
  addLabel,
}) => {
  const { t } = useTranslation();

  return (
    <div className={styles.sectionToolbar}>
      {showViewToggle ? (
        <div className={styles.viewToggle}>
          <button
            type="button"
            className={`${styles.iconButton} ${viewMode === 'graph' ? styles.iconButtonActive : ''}`}
            aria-label={t('haemodialysisSectionView', 'View')}
            aria-pressed={viewMode === 'graph'}
            onClick={() => onViewModeChange('graph')}>
            <ChartColumn size={16} />
          </button>
          <button
            type="button"
            className={`${styles.iconButton} ${viewMode === 'table' ? styles.iconButtonActive : ''}`}
            aria-label={t('haemodialysisSectionHistoryTable', 'Table')}
            aria-pressed={viewMode === 'table'}
            onClick={() => onViewModeChange('table')}>
            <TableIcon size={16} />
          </button>
        </div>
      ) : null}
      {onAddClick ? (
        <button type="button" className={styles.addButton} disabled={isAddButtonDisabled} onClick={onAddClick}>
          <span>{addLabel ?? t('add', 'Add')}</span>
          <Add size={16} />
        </button>
      ) : null}
    </div>
  );
};

export default SectionToolbar;

/** Black header/section Add control (same styling as labour care guide toolbar). */
export const FormAddButton: React.FC<{
  onClick: () => void;
  addLabel?: string;
  disabled?: boolean;
}> = ({ onClick, addLabel, disabled = false }) => (
  <SectionToolbar
    showViewToggle={false}
    viewMode="graph"
    onViewModeChange={() => undefined}
    onAddClick={onClick}
    isAddButtonDisabled={disabled}
    addLabel={addLabel}
  />
);
