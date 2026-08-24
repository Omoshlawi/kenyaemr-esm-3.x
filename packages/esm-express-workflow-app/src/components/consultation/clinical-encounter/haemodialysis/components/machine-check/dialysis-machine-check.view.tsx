import React from 'react';
import { useTranslation } from 'react-i18next';
import type { DialysisMachineCheck } from '../../types';
import { machineCheckToFields } from '../../utils/formatters';
import FieldGrid from '../shared/field-grid.component';
import HistoricalSectionCard from '../shared/historical-section-card.component';
import sharedStyles from '../shared/shared.scss';

type Props = {
  data?: DialysisMachineCheck;
  canAdd: boolean;
  hasInitial: boolean;
  onAdd: () => void;
};

const DialysisMachineCheckView: React.FC<Props> = ({ data, canAdd, hasInitial, onAdd }) => {
  const { t } = useTranslation();

  return (
    <HistoricalSectionCard
      title="3. Dialysis Machine Check"
      showAdd={canAdd}
      onAddClick={onAdd}
      addLabel={t('haemodialysisAddMachineCheck', 'Add machine check')}>
      {data ? (
        <FieldGrid fields={machineCheckToFields(data)} />
      ) : (
        <div className={sharedStyles.emptyState}>
          {hasInitial
            ? t(
                'haemodialysisMachineCheckReady',
                'Initial assessment saved. Record dialysis machine checks before intra-dialytic monitoring.',
              )
            : t('haemodialysisMachineCheckWaiting', 'Complete the initial assessment first.')}
        </div>
      )}
    </HistoricalSectionCard>
  );
};

export default DialysisMachineCheckView;
