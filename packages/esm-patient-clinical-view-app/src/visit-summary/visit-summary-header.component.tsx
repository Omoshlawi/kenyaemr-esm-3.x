import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Search } from '@carbon/react';
import { ChevronDown, Printer, Time } from '@carbon/react/icons';
import classNames from 'classnames';
import { formatDate, showModal, usePatient, type Visit } from '@openmrs/esm-framework';
import type { VitalItem } from './visit-summary.resource';
import styles from './visit-summary.scss';

type VisitSummaryHeaderProps = {
  patientUuid: string;
  visitUuid: string;
  visitDate: string;
  visitType: string;
  weight: VitalItem | undefined;
  visits: Visit[];
  onVisitChange: (uuid: string) => void;
};

function formatVisitDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

const VisitSummaryHeader: React.FC<VisitSummaryHeaderProps> = ({
  patientUuid,
  visitUuid,
  visitDate,
  visitType,
  weight,
  visits,
  onVisitChange,
}) => {
  const { t } = useTranslation();
  const { patient } = usePatient(patientUuid);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredVisits = useMemo(() => {
    if (!searchTerm) {
      return visits;
    }
    const lower = searchTerm.toLowerCase();
    return visits.filter((v) => {
      const label = `${formatVisitDate(v.startDatetime)} ${v.visitType?.display ?? ''}`;
      return label.toLowerCase().includes(lower);
    });
  }, [visits, searchTerm]);

  const handleVisitSelect = (uuid: string) => {
    onVisitChange(uuid);
    setDropdownOpen(false);
    setSearchTerm('');
  };

  const handlePrintPreview = () => {
    const dispose = showModal('visit-summary-print-preview-modal', {
      visitUuid,
      patient,
      onClose: () => dispose(),
      size: 'lg',
    });
  };

  const triggerLabel = useMemo(() => {
    if (!visitDate) {
      return t('selectVisit', 'Select visit');
    }
    return `${formatVisitDate(visitDate)} ${visitType ?? ''}`.trim();
  }, [visitDate, visitType, t]);

  const patientName = useMemo(() => {
    if (!patient?.name?.[0]) {
      return '';
    }
    const name = patient.name[0];
    return `${name.given?.join(' ') ?? ''} ${name.family ?? ''}`.trim();
  }, [patient]);

  const patientAge = useMemo(() => {
    if (!patient?.birthDate) {
      return null;
    }
    return new Date().getFullYear() - new Date(patient.birthDate).getFullYear();
  }, [patient]);

  const patientDOB = useMemo(() => {
    if (!patient?.birthDate) {
      return null;
    }
    return formatDate(new Date(patient.birthDate));
  }, [patient]);

  const patientGender = useMemo(() => {
    if (!patient?.gender) {
      return null;
    }
    return patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1).toLowerCase();
  }, [patient]);

  const patientMRN = useMemo(() => {
    return patient?.identifier?.find((id) => id.type?.text === 'OpenMRS ID' || id.system?.includes('openmrs'))?.value;
  }, [patient]);

  return (
    <div className={styles.pageHeader}>
      <div className={styles.visitSelectorWrapper} ref={dropdownRef}>
        <button
          type="button"
          className={styles.visitSelectorTrigger}
          onClick={() => setDropdownOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={dropdownOpen}>
          <div className={styles.visitSelectorContent}>
            <span className={styles.visitSelectorLabel}>{t('visitSummary', 'VISIT SUMMARY')}:</span>
            <span className={styles.visitSelectorValue}>{triggerLabel}</span>
          </div>
          <ChevronDown
            size={16}
            className={classNames(styles.visitSelectorChevron, { [styles.visitSelectorChevronOpen]: dropdownOpen })}
          />
        </button>

        {dropdownOpen && (
          <div className={styles.visitDropdownPanel} role="listbox">
            <div className={styles.visitDropdownSearch}>
              <Search
                size="sm"
                labelText=""
                placeholder={t('searchVisits', 'Search visits...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
            <ul className={styles.visitDropdownList}>
              {filteredVisits.map((visit) => {
                const label = `${formatVisitDate(visit.startDatetime)} ${visit.visitType?.display ?? ''}`;
                const isSelected = visit.uuid === visitUuid;
                return (
                  <li key={visit.uuid} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      className={classNames(styles.visitDropdownItem, {
                        [styles.visitDropdownItemSelected]: isSelected,
                      })}
                      onClick={() => handleVisitSelect(visit.uuid)}>
                      <Time
                        size={16}
                        className={classNames(styles.visitDropdownIcon, {
                          [styles.visitDropdownIconSelected]: isSelected,
                        })}
                      />
                      <span>{label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.patientName}>{patientName}</h1>
          <div className={styles.patientDemographics}>
            {patientMRN && (
              <span className={styles.demographicItem}>
                <span>{t('mrn', 'MRN')}:</span> {patientMRN}
              </span>
            )}
            {patientDOB && (
              <span className={styles.demographicItem}>
                <span>{t('dob', 'DOB')}:</span> {patientDOB}
                {patientAge !== null && ` (${patientAge}y)`}
              </span>
            )}
            {patientGender && (
              <span className={styles.demographicItem}>
                <span>{t('gender', 'Gender')}:</span> {patientGender}
              </span>
            )}
            {weight?.value && (
              <span className={styles.demographicItem}>
                <span>{t('weight', 'Weight')}:</span> {weight.value}
                {weight.unit}
              </span>
            )}
          </div>
        </div>
        <div className={styles.headerActions}>
          <Button kind="ghost" size="sm" renderIcon={Printer} onClick={handlePrintPreview}>
            {t('print', 'Print')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VisitSummaryHeader;
