import React from 'react';
import type { ScreeningStatus } from '../../types';
import { screeningToFields } from '../../utils/formatters';
import FieldGrid from '../shared/field-grid.component';
import HistoricalSectionCard from '../shared/historical-section-card.component';
import sharedStyles from '../shared/shared.scss';

type Props = {
  data?: ScreeningStatus;
};

const hasScreeningData = (data?: ScreeningStatus): boolean =>
  Boolean(
    data?.bloodGroup ||
      data?.hivStatus ||
      data?.hepatitisCStatus ||
      data?.hepatitisBStatus ||
      data?.syphilisStatus ||
      data?.drugAllergy,
  );

const ScreeningStatusView: React.FC<Props> = ({ data }) => (
  <HistoricalSectionCard title="Screening Status">
    {hasScreeningData(data) ? (
      <FieldGrid fields={screeningToFields(data)} />
    ) : (
      <div className={sharedStyles.emptyState}>No screening status recorded yet.</div>
    )}
  </HistoricalSectionCard>
);

export default ScreeningStatusView;
