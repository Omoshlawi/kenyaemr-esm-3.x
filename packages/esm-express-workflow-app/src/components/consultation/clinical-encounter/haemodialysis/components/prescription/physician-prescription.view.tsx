import React from 'react';
import type { PhysicianPrescription } from '../../types';
import { prescriptionToFields } from '../../utils/formatters';
import FieldGrid from '../shared/field-grid.component';
import SectionCard from '../shared/section-card.component';
import sharedStyles from '../shared/shared.scss';

type Props = {
  data?: PhysicianPrescription;
};

const PhysicianPrescriptionView: React.FC<Props> = ({ data }) => (
  <SectionCard title="2. Physician Prescription">
    {data ? (
      <FieldGrid fields={prescriptionToFields(data)} />
    ) : (
      <div className={sharedStyles.emptyState}>No physician prescription recorded yet.</div>
    )}
  </SectionCard>
);

export default PhysicianPrescriptionView;
