import {
  Button,
  ComboBox,
  DatePicker,
  DatePickerInput,
  Search,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
} from '@carbon/react';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ClaimsTable from './claim-table.component';
import { useClaims } from './use-facility-claims';
import styles from './claims-list-table.scss';
import { ProgressBarRound } from '@carbon/react/icons';
import { showModal } from '@openmrs/esm-framework';

const ClaimsManagementTable: React.FC = () => {
  const { t } = useTranslation();
  const { claims, isLoading, error } = useClaims();
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState<Date | null>(new Date());
  const [toDate, setToDate] = useState<Date | null>(new Date());
  const [statusFilter, setStatusFilter] = useState('all');

  const isPhc = activeTab === 1;

  const statusOptions = isPhc
    ? [
        { value: 'all', label: t('all', 'All') },
        { value: 'ENTERED', label: t('entered', 'Entered') },
        { value: 'CHECKED', label: t('checked', 'Checked') },
        { value: 'VALUATED', label: t('valuated', 'Valuated') },
        { value: 'REJECTED', label: t('rejected', 'Rejected') },
      ]
    : [
        { value: 'all', label: t('all', 'All') },
        { value: 'DRAFT', label: t('inProgress', 'In progress') },
        { value: 'PREAUTH_PENDING', label: t('awaitingPreauth', 'Awaiting preauth') },
        { value: 'PREAUTH_APPROVED', label: t('preauthApproved', 'Preauth approved') },
        { value: 'PREAUTH_REJECTED', label: t('preauthRejected', 'Preauth rejected') },
        { value: 'APPROVED', label: t('approved', 'Approved') },
        { value: 'REJECTED', label: t('rejected', 'Rejected') },
      ];

  const handleUpdateAllStatuses = () => {
    const dispose = showModal('manage-claim-request-modal', {
      closeModal: () => dispose(),
    });
  };

  const shifClaims = useMemo(
    () => claims.filter((c) => c.adjustment === 'Virtual claim' && !c.workflowState?.startsWith('ELECTIVE')),
    [claims],
  );

  const phcClaims = useMemo(() => claims.filter((c) => c.guaranteeId === 'auto' && !c.authorizationCode), [claims]);

  const applyFilters = (list: typeof claims) => {
    const term = search.trim().toLowerCase();

    const startOfFromDate = fromDate ? new Date(fromDate) : null;
    if (startOfFromDate) {
      startOfFromDate.setHours(0, 0, 0, 0);
    }

    const endOfToDate = toDate ? new Date(toDate) : null;
    if (endOfToDate) {
      endOfToDate.setHours(23, 59, 59, 999);
    }

    return list.filter((c) => {
      if (term) {
        const name = c.patient?.person?.display?.toLowerCase() ?? '';
        const code = c.claimCode?.toLowerCase() ?? '';
        if (!name.includes(term) && !code.includes(term)) {
          return false;
        }
      }
      if (statusFilter !== 'all' && c.status !== statusFilter) {
        return false;
      }
      if (startOfFromDate && c.dateFrom && new Date(c.dateFrom) < startOfFromDate) {
        return false;
      }
      if (endOfToDate && c.dateFrom && new Date(c.dateFrom) > endOfToDate) {
        return false;
      }
      return true;
    });
  };

  const filteredShifClaims = useMemo(
    () => applyFilters(shifClaims),
    [shifClaims, search, statusFilter, fromDate, toDate],
  );
  const filteredPhcClaims = useMemo(() => applyFilters(phcClaims), [phcClaims, search, statusFilter, fromDate, toDate]);

  return (
    <div className={styles.container}>
      <Tabs
        selectedIndex={activeTab}
        onChange={({ selectedIndex }) => {
          setActiveTab(selectedIndex);
          setStatusFilter('all');
        }}>
        <div className={styles.tabsRow}>
          <TabList aria-label={t('claimsTabs', 'Claims tabs')} contained activation="automatic">
            <Tab>
              {t('shifClaims', 'SHIF Claims')}&nbsp;
              <Tag type="blue" size="sm">
                {filteredShifClaims.length}
              </Tag>
            </Tab>
            <Tab>
              {t('phcClaims', 'PHC Claims')}&nbsp;
              <Tag type="green" size="sm">
                {filteredPhcClaims.length}
              </Tag>
            </Tab>
          </TabList>
          <div className={styles.tabsToolbar}>
            <Search
              size="sm"
              placeholder={t('searchPlaceholder', 'Search patient name or number')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              labelText=""
              className={styles.searchInput}
            />
            <ComboBox
              id="claims-status-filter"
              className={styles.statusSelect}
              size="sm"
              titleText=""
              placeholder={t('filterByStatus', 'Filter by status')}
              items={statusOptions}
              itemToString={(item) => item?.label ?? ''}
              selectedItem={statusOptions.find((o) => o.value === statusFilter) ?? null}
              onChange={({ selectedItem }) => setStatusFilter(selectedItem?.value ?? 'all')}
            />
            <DatePicker
              datePickerType="range"
              dateFormat="d/m/Y"
              value={[fromDate, toDate].filter(Boolean) as Array<Date>}
              onChange={(dates) => {
                setFromDate(dates[0] ?? null);
                setToDate(dates[1] ?? null);
              }}>
              <DatePickerInput id="claim-date-from" placeholder="dd/mm/yyyy" labelText="" size="sm" />
              <DatePickerInput id="claim-date-to" placeholder="dd/mm/yyyy" labelText="" size="sm" />
            </DatePicker>
            {isPhc && (
              <Button
                size="sm"
                kind="primary"
                renderIcon={ProgressBarRound}
                onClick={handleUpdateAllStatuses}
                className={styles.createElectiveButton}>
                {t('syncStatus', 'Sync status')}
              </Button>
            )}
          </div>
        </div>

        <TabPanels>
          <TabPanel>
            <ClaimsTable
              title={t('shifClaims', 'SHIF Claims')}
              includeClaimCode
              emptyStateText={t('noShifClaims', 'SHIF claims')}
              emptyStateHeader={t('noShifClaimsHeader', 'No SHIF claims found')}
              error={error}
              isLoading={isLoading}
              claims={filteredShifClaims}
            />
          </TabPanel>
          <TabPanel>
            <ClaimsTable
              title={t('phcClaims', 'PHC Claims')}
              includeClaimCode
              isPhc
              emptyStateText={t('noPhcClaims', 'PHC claims')}
              emptyStateHeader={t('noPhcClaimsHeader', 'No PHC claims found')}
              error={error}
              isLoading={isLoading}
              claims={filteredPhcClaims}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
};

export default ClaimsManagementTable;
