import { Stack } from '@carbon/react';
import { Activity, Chemistry, Pills, Stethoscope } from '@carbon/react/icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSHRSummary, Visit } from '../../hooks/useSHRSummary';
import SectionHeader from '../headers/section-header.component';
import VisitHeader from '../headers/visit-header.component';
import styles from './expansion-pannel.scss';
import TriageSection from '../sections/triage-component';
import ConsultationSection from '../sections/consultation.component';
import LabOrdersection from '../sections/lab-order.component';
import PrescriptionSection from '../sections/prescription.component';

interface ExpansionPannelProps {
  visit: Visit;
}

const ExpansionPannel: React.FC<ExpansionPannelProps> = ({ visit }) => {
  const { t } = useTranslation();
  return (
    <Stack className={styles.expansionPannelContainer}>
      <VisitHeader visit={visit} />
      <SectionHeader
        icon={Activity}
        reporter={`Completed by ${visit.professional[0]?.identifier}`}
        time={'48 minutes ago'}
        title={t('triage', 'Triage')}
        type="red"
      />
      <TriageSection visit={visit} />
      <hr />
      <SectionHeader
        icon={Stethoscope}
        reporter={`Completed by ${visit.professional[0]?.identifier}`}
        time={'48 minutes ago'}
        title={t('consultation', 'Consultation')}
        type="red"
      />
      <ConsultationSection visit={visit} />
      <hr />
      <SectionHeader
        icon={Chemistry}
        reporter={`Completed by ${visit.professional[0]?.identifier}`}
        time={'48 minutes ago'}
        title={t('labOrder', 'Lab order')}
        type="red"
      />
      <LabOrdersection visit={visit} />
      <hr />
      <SectionHeader
        icon={Pills}
        reporter={`Completed by ${visit.professional[0]?.identifier}`}
        time={'48 minutes ago'}
        title={t('prescriptions', 'Prescriptions')}
        type="red"
      />
      <PrescriptionSection visit={visit} />
      <hr />
    </Stack>
  );
};

export default ExpansionPannel;
