import React from 'react';
import { Button } from '@carbon/react';
import { Add } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import type { DialysisMachineCheck } from '../../types';
import { machineCheckToFields } from '../../utils/formatters';
import FieldGrid from '../shared/field-grid.component';
import SectionCard from '../shared/section-card.component';
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
    <SectionCard
      title="Dialysis Machine Check"
      actions={
        canAdd ? (
          <Button kind="ghost" size="sm" renderIcon={Add} onClick={onAdd}>
            {t('haemodialysisAddMachineCheck', 'Add machine check')}
          </Button>
        ) : null
      }>
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
    </SectionCard>
  );
};

export default DialysisMachineCheckView;
