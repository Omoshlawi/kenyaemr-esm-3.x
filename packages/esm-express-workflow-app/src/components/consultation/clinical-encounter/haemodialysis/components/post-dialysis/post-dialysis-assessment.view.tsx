import React from 'react';
import { useTranslation } from 'react-i18next';
import type { PostDialysisAssessment } from '../../types';
import { postDialysisToFields } from '../../utils/formatters';
import FieldGrid from '../shared/field-grid.component';
import HistoricalSectionCard from '../shared/historical-section-card.component';
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
    <HistoricalSectionCard
      title="4. Post-Dialysis Assessment"
      showAdd={canAdd}
      onAddClick={onAdd}
      addLabel={t('haemodialysisAddPostDialysis', 'Add post-dialysis')}>
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
    </HistoricalSectionCard>
  );
};

export default PostDialysisAssessmentView;
