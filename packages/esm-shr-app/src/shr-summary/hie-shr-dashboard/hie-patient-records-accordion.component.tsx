import React, { useMemo, useState } from 'react';
import { Tag } from '@carbon/react';
import { EmptyState } from '@openmrs/esm-patient-common-lib';
import { formatDatetime } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import SHRDataTable from '../../shrpatient-summary/shrDataTable.component';
import ReferralSummaryAction from '../../shrpatient-summary/referral-summary-actions.component';
import type { itemDetails, SHRSummary } from '../../types';
import EmergencyEpisodesSection from './emergency-episodes.component';
import styles from './hie-shr-dashboard.scss';

type TableHeader = {
  key: string;
  header: string;
};

type RecordSection = {
  key: string;
  title: string;
  headers: TableHeader[];
  rows: Array<itemDetails | (itemDetails & { actions?: React.ReactNode })>;
};

type SummaryTab = {
  key: string;
  title: string;
  count: number;
  kind?: 'blue' | 'red' | 'gray';
};

interface HiePatientRecordsAccordionProps {
  data: SHRSummary | null;
  retrievedAt?: Date | null;
}

const formatRetrievedAt = (value?: Date | null): string => {
  if (!value) {
    return '--';
  }
  try {
    return formatDatetime(value);
  } catch {
    return value.toLocaleString();
  }
};

const OverviewPanel: React.FC<{ tabs: SummaryTab[]; onSelect: (key: string) => void }> = ({ tabs, onSelect }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.overviewGrid}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={styles.overviewCard}
          onClick={() => onSelect(tab.key)}
          disabled={tab.count === 0}>
          <span className={styles.overviewCardTitle}>{tab.title}</span>
          <span className={styles.overviewCardCount}>{tab.count}</span>
          <span className={styles.overviewCardHint}>
            {tab.count > 0
              ? t('viewRecords', 'View records')
              : t('noRecordsInSection', 'No {{section}} records available', { section: tab.title.toLowerCase() })}
          </span>
        </button>
      ))}
    </div>
  );
};

const HiePatientRecordsAccordion: React.FC<HiePatientRecordsAccordionProps> = ({ data, retrievedAt }) => {
  const { t } = useTranslation();
  const emergencyEpisodes = data?.emergencyEpisodes ?? [];

  const sections = useMemo<RecordSection[]>(() => {
    if (!data) {
      return [];
    }

    const referrals = (data.referrals ?? []).map((ref) => ({
      ...ref,
      actions: <ReferralSummaryAction item={ref} />,
    }));

    return [
      {
        key: 'vitals',
        title: t('vitals', 'Vitals'),
        headers: [
          { key: 'name', header: t('name', 'Name') },
          { key: 'value', header: t('value', 'Value') },
          { key: 'dateRecorded', header: t('dateRecorded', 'Date Recorded') },
        ],
        rows: data.vitals ?? [],
      },
      {
        key: 'diagnosis',
        title: t('diagnoses', 'Diagnoses'),
        headers: [
          { key: 'name', header: t('name', 'Name') },
          { key: 'value', header: t('value', 'Value') },
          { key: 'dateRecorded', header: t('dateRecorded', 'Date Recorded') },
        ],
        rows: data.diagnosis ?? [],
      },
      {
        key: 'conditions',
        title: t('conditions', 'Conditions'),
        headers: [
          { key: 'name', header: t('name', 'Name') },
          { key: 'onsetDate', header: t('onsetDate', 'Onset Date') },
          { key: 'status', header: t('status', 'Status') },
          { key: 'dateRecorded', header: t('dateRecorded', 'Date Recorded') },
        ],
        rows: data.conditions ?? [],
      },
      {
        key: 'allergies',
        title: t('allergies', 'Allergies'),
        headers: [
          { key: 'allergen', header: t('allergen', 'Allergen') },
          { key: 'reaction', header: t('reaction', 'Reaction') },
          { key: 'severity', header: t('severity', 'Severity') },
          { key: 'onsetDate', header: t('onsetDate', 'Onset Date') },
          { key: 'dateRecorded', header: t('dateRecorded', 'Date Recorded') },
        ],
        rows: data.allergies ?? [],
      },
      {
        key: 'labResults',
        title: t('labResults', 'Lab results'),
        headers: [
          { key: 'name', header: t('name', 'Name') },
          { key: 'value', header: t('value', 'Value') },
          { key: 'dateRecorded', header: t('dateRecorded', 'Date Recorded') },
        ],
        rows: data.labResults ?? [],
      },
      {
        key: 'complaints',
        title: t('complaints', 'Complaints'),
        headers: [
          { key: 'name', header: t('name', 'Name') },
          { key: 'value', header: t('value', 'Value') },
          { key: 'onsetDate', header: t('onsetDate', 'Onset Date') },
          { key: 'dateRecorded', header: t('dateRecorded', 'Date Recorded') },
        ],
        rows: data.complaints ?? [],
      },
      {
        key: 'medications',
        title: t('medications', 'Medications'),
        headers: [
          { key: 'name', header: t('name', 'Name') },
          { key: 'onsetDate', header: t('onsetDate', 'Onset Date') },
          { key: 'value', header: t('value', 'Value') },
          { key: 'status', header: t('status', 'Status') },
          { key: 'dateRecorded', header: t('dateRecorded', 'Date Recorded') },
        ],
        rows: data.medications ?? [],
      },
      {
        key: 'referrals',
        title: t('referrals', 'Referrals'),
        headers: [
          { key: 'requesterCode', header: t('requesterCode', 'Requester Code') },
          { key: 'Category', header: t('Category', 'Category') },
          { key: 'priority', header: t('priority', 'Priority') },
          { key: 'dateRequested', header: t('dateRequested', 'Date Requested') },
          { key: 'actions', header: t('actions', 'Actions') },
        ],
        rows: referrals,
      },
    ];
  }, [data, t]);

  const navTabs = useMemo<SummaryTab[]>(() => {
    const topLevelKeys = ['vitals', 'diagnosis', 'conditions', 'allergies', 'labResults', 'complaints', 'referrals'];

    const sectionTabs = topLevelKeys
      .map((key) => sections.find((section) => section.key === key))
      .filter((section): section is RecordSection => Boolean(section))
      .map((section) => ({
        key: section.key,
        title: section.title,
        count: section.rows.length,
        kind: 'blue' as const,
      }));

    return [
      {
        key: 'overview',
        title: t('overview', 'Overview'),
        count: sections.reduce((sum, section) => sum + section.rows.length, 0) + emergencyEpisodes.length,
        kind: 'gray',
      },
      ...sectionTabs,
      {
        key: 'emergency',
        title: t('emergency', 'Emergency'),
        count: emergencyEpisodes.length,
        kind: 'red',
      },
    ];
  }, [emergencyEpisodes.length, sections, t]);

  const overviewTabs = useMemo<SummaryTab[]>(
    () => [
      ...sections.map((section) => ({
        key: section.key,
        title: section.title,
        count: section.rows.length,
        kind: 'blue' as const,
      })),
      {
        key: 'emergency',
        title: t('emergency', 'Emergency'),
        count: emergencyEpisodes.length,
        kind: 'red' as const,
      },
    ],
    [emergencyEpisodes.length, sections, t],
  );

  const totalRecords = sections.reduce((sum, section) => sum + section.rows.length, 0) + emergencyEpisodes.length;
  const fieldCount = overviewTabs.filter((tab) => tab.count > 0).length;

  const defaultTab = emergencyEpisodes.length > 0 ? 'emergency' : 'overview';
  const [selectedTab, setSelectedTab] = useState(defaultTab);

  if (!data || totalRecords === 0) {
    return <EmptyState displayText={t('shrRecords', 'SHR Records')} headerTitle={t('shrRecords', 'SHR Records')} />;
  }

  const activeSection = sections.find((section) => section.key === selectedTab);

  return (
    <div className={styles.recordsAccordion}>
      <div className={styles.recordsHeader}>
        <h4 className={styles.recordsTitle}>{t('shrPatientSHRSummary', 'PATIENT SHR SUMMARY')}</h4>
        <p className={styles.recordsMeta}>
          {t('hiePatientHistoryMeta', 'GET /hie-patient-history · {{count}} fields · retrieved {{retrievedAt}}', {
            count: fieldCount,
            retrievedAt: formatRetrievedAt(retrievedAt ?? new Date()),
          })}
        </p>
      </div>

      <div className={styles.summaryTabs} role="tablist" aria-label={t('shrPatientSHRSummary', 'PATIENT SHR SUMMARY')}>
        {navTabs.map((tab) => {
          const isSelected = selectedTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`${styles.summaryTab} ${isSelected ? styles.summaryTabSelected : ''}`}
              onClick={() => setSelectedTab(tab.key)}>
              <span className={styles.summaryTabLabel}>{tab.title}</span>
              <span className={styles.summaryTabCount}>
                {tab.key === 'overview' ? t('summary', 'summary') : tab.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className={styles.summaryPanel} role="tabpanel">
        {selectedTab === 'overview' && <OverviewPanel tabs={overviewTabs} onSelect={setSelectedTab} />}

        {selectedTab === 'emergency' && <EmergencyEpisodesSection episodes={emergencyEpisodes} />}

        {activeSection && (
          <>
            <div className={styles.sectionHeadingRow}>
              <h5 className={styles.sectionHeading}>{activeSection.title}</h5>
              <Tag size="sm" type={activeSection.rows.length > 0 ? 'blue' : 'gray'}>
                {activeSection.rows.length}
              </Tag>
            </div>
            {activeSection.rows.length > 0 ? (
              <SHRDataTable data={activeSection.rows} tableHeaders={activeSection.headers} />
            ) : (
              <p className={styles.emptySection}>
                {t('noRecordsInSection', 'No {{section}} records available', {
                  section: activeSection.title.toLowerCase(),
                })}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default HiePatientRecordsAccordion;
