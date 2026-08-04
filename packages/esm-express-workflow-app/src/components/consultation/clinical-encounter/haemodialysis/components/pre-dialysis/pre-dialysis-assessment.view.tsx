import React from 'react';
import type { PreDialysisAssessment } from '../../types';
import { preDialysisToFields } from '../../utils/formatters';
import FieldGrid from '../shared/field-grid.component';
import HistoricalSectionCard from '../shared/historical-section-card.component';
import sharedStyles from '../shared/shared.scss';

type Props = {
  data?: PreDialysisAssessment;
};

const PreDialysisAssessmentView: React.FC<Props> = ({ data }) => (
  <HistoricalSectionCard title="1. Pre-Dialysis Assessment">
    {data ? (
      <FieldGrid fields={preDialysisToFields(data)} />
    ) : (
      <div className={sharedStyles.emptyState}>
        No pre-dialysis assessment recorded yet. Use Add to capture diagnosis, date, pre-dialysis and prescription.
      </div>
    )}
  </HistoricalSectionCard>
);

export default PreDialysisAssessmentView;
