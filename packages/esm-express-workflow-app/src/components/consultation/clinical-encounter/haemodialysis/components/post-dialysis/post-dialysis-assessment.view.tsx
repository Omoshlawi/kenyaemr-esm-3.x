import React from 'react';
import { Button } from '@carbon/react';
import { Add } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import type { PostDialysisAssessment } from '../../types';
import { postDialysisToFields } from '../../utils/formatters';
import FieldGrid from '../shared/field-grid.component';
import SectionCard from '../shared/section-card.component';
import sharedStyles from '../shared/shared.scss';

type Props = {
  data?: PostDialysisAssessment;
  canAdd: boolean;
  monitoringComplete?: boolean;
  onAdd: () => void;
};

const PostDialysisAssessmentView: React.FC<Props> = ({ data, canAdd, monitoringComplete, onAdd }) => {
  const { t } = useTranslation();

  return (
    <SectionCard
      title="4. Post-Dialysis Assessment"
      actions={
        canAdd ? (
          <Button kind="ghost" size="sm" renderIcon={Add} onClick={onAdd}>
            {t('haemodialysisAddPostDialysis', 'Add post-dialysis')}
          </Button>
        ) : null
      }>
      {data ? (
        <FieldGrid fields={postDialysisToFields(data)} />
      ) : (
        <div className={sharedStyles.emptyState}>
          {monitoringComplete
            ? t(
                'haemodialysisPostDialysisReady',
                'Intra-dialytic monitoring is complete. Add post-dialysis assessment to continue.',
              )
            : t(
                'haemodialysisPostDialysisWaiting',
                'Complete all intra-dialytic monitoring slots before post-dialysis assessment.',
              )}
        </div>
      )}
    </SectionCard>
  );
};

export default PostDialysisAssessmentView;
