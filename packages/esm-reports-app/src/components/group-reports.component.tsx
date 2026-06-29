import React, { useMemo, useState } from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel, InlineLoading, InlineNotification } from '@carbon/react';
import { type SwitchEventHandlersParams } from '@carbon/react/lib/components/Switch/Switch';
import { useTranslation } from 'react-i18next';
import useGroupedReports from '../hooks/useReports';
import { type ReportCategory, type ReportDescriptor } from '../types';
import ReportPanel from './report-table/report-panel.component';
import ReportTable from './report-table/report-table.component';

import styles from './group-reports.scss';

type GroupReportsProps = {};

const GroupReports: React.FC<GroupReportsProps> = () => {
  const { t } = useTranslation();
  const { reports, isLoading, error } = useGroupedReports();

  if (isLoading) {
    return <InlineLoading description={t('loadingReports', 'Loading reports...')} />;
  }

  if (error) {
    return (
      <InlineNotification
        kind="error"
        lowContrast
        title={t('errorLoadingReports', 'Error loading reports')}
        subtitle={error?.message}
      />
    );
  }

  return (
    <div className={styles.groupReportsContainer}>
      <Tabs>
        <TabList contained fullWidth>
          {reports.map((group, index) => (
            <Tab key={`tab-${index}-${group.name}`}>{group.name}</Tab>
          ))}
        </TabList>
        <TabPanels>
          {reports.map((group, index) => (
            <TabPanel key={`tab-panel-${index}-${group.name}`}>
              <ReportGroupPanel group={group} />
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </div>
  );
};

type ReportGroupPanelProps = {
  group: ReportCategory;
};

const ReportGroupPanel: React.FC<ReportGroupPanelProps> = ({ group }) => {
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleSwitchChange = ({ index }: SwitchEventHandlersParams) => {
    setSelectedIndex(typeof index === 'number' ? index : 0);
  };

  const reports = selectedIndex === 0 ? group.indicator : group.patientFollowUpReports;

  const tableHeaders = useMemo(
    () => [
      { key: 'name', header: t('name', 'Name') },
      { key: 'description', header: t('description', 'Description') },
    ],
    [t],
  );

  const tableRows = useMemo(
    () =>
      (reports ?? []).map((report: ReportDescriptor) => ({
        id: report.uuid,
        name: report.name,
        description: report.description ?? '--',
      })),
    [reports],
  );

  return (
    <div className={styles.reportGroupPanel}>
      <ReportPanel onSwitchChange={handleSwitchChange} />
      <ReportTable
        tableHeaders={tableHeaders}
        tableRows={tableRows}
        tableTitle={group.name}
        tableDescription={t('reportTableDescription', 'List of reports in this category')}
      />
    </div>
  );
};

export default GroupReports;
