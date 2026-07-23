import React from 'react';
import type { PreDialysisAssessment } from '../../types';
import { preDialysisToFields } from '../../utils/formatters';
import FieldGrid from '../shared/field-grid.component';
import SectionCard from '../shared/section-card.component';
import sharedStyles from '../shared/shared.scss';

type Props = {
  data?: PreDialysisAssessment;
  actions?: React.ReactNode;
};

const PreDialysisAssessmentView: React.FC<Props> = ({ data, actions }) => (
  <SectionCard title="1. Pre-Dialysis Assessment" actions={actions}>
    {data ? (
      <FieldGrid fields={preDialysisToFields(data)} />
    ) : (
      <div className={sharedStyles.emptyState}>
        No pre-dialysis assessment recorded yet. Use Add to capture diagnosis, date, pre-dialysis and prescription.
      </div>
    )}
  </SectionCard>
);

export default PreDialysisAssessmentView;
