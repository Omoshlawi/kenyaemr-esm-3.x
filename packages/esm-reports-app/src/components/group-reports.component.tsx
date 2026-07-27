import React, { useCallback, useMemo } from 'react';
import { Dropdown, InlineLoading, InlineNotification, Layer } from '@carbon/react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useGroupedReports from '../hooks/useReports';
import { type ReportDescriptor } from '../types';
import ReportTable from './report-table/report-table.component';

import styles from './group-reports.scss';

const ALL_GROUPS = '__all_groups__';

type ReportTypeValue = 'all' | 'indicator' | 'patientFollowUpReports';

const REPORT_TYPES: Array<ReportTypeValue> = ['all', 'indicator', 'patientFollowUpReports'];

type FilterItem = {
  id: string;
  label: string;
};

const GroupReports: React.FC = () => {
  const { t } = useTranslation();
  const { reports, isLoading, error } = useGroupedReports();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedGroup = searchParams.get('group') ?? ALL_GROUPS;
  const reportTypeParam = searchParams.get('type') as ReportTypeValue | null;
  const reportType: ReportTypeValue =
    reportTypeParam && REPORT_TYPES.includes(reportTypeParam) ? reportTypeParam : 'all';

  const updateFilter = useCallback(
    (key: string, value: string, defaultValue: string) => {
      setSearchParams(
        (params) => {
          const next = new URLSearchParams(params);
          if (!value || value === defaultValue) {
            next.delete(key);
          } else {
            next.set(key, value);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const groupItems = useMemo<Array<FilterItem>>(
    () => [
      { id: ALL_GROUPS, label: t('allGroups', 'All groups') },
      ...reports.map((group) => ({ id: group.name, label: group.name })),
    ],
    [reports, t],
  );

  const typeItems = useMemo<Array<FilterItem>>(
    () => [
      { id: 'all', label: t('allTypes', 'All types') },
      { id: 'indicator', label: t('indicators', 'Indicators') },
      { id: 'patientFollowUpReports', label: t('patientFollowUpReports', 'Patient Follow-up Reports') },
    ],
    [t],
  );

  const tableHeaders = useMemo(
    () => [
      { key: 'name', header: t('name', 'Name') },
      { key: 'group', header: t('group', 'Group') },
      { key: 'description', header: t('description', 'Description') },
    ],
    [t],
  );

  const tableRows = useMemo(() => {
    const rows: Array<{ id: string; name: string; group: string; description: string }> = [];
    const includeIndicators = reportType === 'all' || reportType === 'indicator';
    const includeFollowUp = reportType === 'all' || reportType === 'patientFollowUpReports';

    const collect = (list: Array<ReportDescriptor>, groupName: string) =>
      list.forEach((report) =>
        rows.push({
          id: report.uuid,
          name: report.name,
          group: groupName,
          description: report.description ?? '--',
        }),
      );

    reports
      .filter((group) => selectedGroup === ALL_GROUPS || group.name === selectedGroup)
      .forEach((group) => {
        if (includeIndicators) {
          collect(group.indicator, group.name);
        }
        if (includeFollowUp) {
          collect(group.patientFollowUpReports, group.name);
        }
      });

    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [reports, selectedGroup, reportType]);

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

  const filters = (
    <div className={styles.filtersContainer}>
      <Layer>
        <Dropdown
          id="group-filter"
          className={styles.filterDropdown}
          size="sm"
          titleText={''}
          label={t('filterByGroup', 'Filter by group')}
          items={groupItems}
          itemToString={(item: FilterItem | null) => item?.label ?? ''}
          selectedItem={groupItems.find((item) => item.id === selectedGroup) ?? groupItems[0]}
          onChange={({ selectedItem }: { selectedItem: FilterItem | null }) =>
            updateFilter('group', selectedItem?.id ?? ALL_GROUPS, ALL_GROUPS)
          }
        />
      </Layer>
      <Layer>
        <Dropdown
          id="type-filter"
          className={styles.filterDropdown}
          size="sm"
          titleText={''}
          label={t('filterByType', 'Filter by type')}
          items={typeItems}
          itemToString={(item: FilterItem | null) => item?.label ?? ''}
          selectedItem={typeItems.find((item) => item.id === reportType) ?? typeItems[0]}
          onChange={({ selectedItem }: { selectedItem: FilterItem | null }) =>
            updateFilter('type', selectedItem?.id ?? 'all', 'all')
          }
        />
      </Layer>
    </div>
  );

  return (
    <div className={styles.groupReportsContainer}>
      <ReportTable
        tableHeaders={tableHeaders}
        tableRows={tableRows}
        tableTitle={t('reports', 'Reports')}
        tableDescription={t('reportTableDescription', 'List of reports in the system, filtered by group and type.')}
        filters={filters}
      />
    </div>
  );
};

export default GroupReports;
