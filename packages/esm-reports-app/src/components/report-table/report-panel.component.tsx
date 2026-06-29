import React from 'react';
import { ContentSwitcher, Switch } from '@carbon/react';
import { type SwitchEventHandlersParams } from '@carbon/react/lib/components/Switch/Switch';
import { useTranslation } from 'react-i18next';

type ReportPanelProps = {
  onSwitchChange?: (params: SwitchEventHandlersParams) => void;
};

const ReportPanel: React.FC<ReportPanelProps> = ({ onSwitchChange }) => {
  const { t } = useTranslation();
  return (
    <ContentSwitcher size="lg" onChange={onSwitchChange ?? (() => undefined)} selectedIndex={0}>
      <Switch name="indicators" text={t('indicators', 'Indicators')} />
      <Switch name="patientFollowUpReports " text={t('patientFollowUpReports', 'Patient Follow-up Reports')} />
    </ContentSwitcher>
  );
};

export default ReportPanel;
