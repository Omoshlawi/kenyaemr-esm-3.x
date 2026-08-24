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
  monitoringTerminated?: boolean;
  sessionAborted?: boolean;
  onAdd: () => void;
};

const PostDialysisAssessmentView: React.FC<Props> = ({
  data,
  canAdd,
  monitoringComplete,
  monitoringTerminated,
  sessionAborted,
  onAdd,
}) => {
  const { t } = useTranslation();

  const waitingMessage = sessionAborted
    ? t(
        'haemodialysisPostDialysisSessionStopped',
        'This dialysis session was stopped. Open New Dialysis to start another session.',
      )
    : monitoringTerminated
    ? t(
        'haemodialysisPostDialysisEmergencyReady',
        'Monitoring was stopped as an emergency. Add post-dialysis information and the dialysis summary.',
      )
    : monitoringComplete
    ? t(
        'haemodialysisPostDialysisReady',
        'Intra-dialytic monitoring is complete. Add post-dialysis assessment and the dialysis summary to continue.',
      )
    : t(
        'haemodialysisPostDialysisWaiting',
        'Complete intra-dialytic monitoring or record an emergency termination before post-dialysis information and the dialysis summary.',
      );

  return (
    <HistoricalSectionCard
      title="4. Post-Dialysis Assessment"
      showAdd={canAdd}
      onAddClick={onAdd}
      addLabel={t('haemodialysisAddPostDialysis', 'Add post-dialysis & summary')}>
      {data ? (
        <FieldGrid fields={postDialysisToFields(data)} />
      ) : (
        <div className={sharedStyles.emptyState}>{waitingMessage}</div>
      )}
    </HistoricalSectionCard>
  );
};

export default PostDialysisAssessmentView;
