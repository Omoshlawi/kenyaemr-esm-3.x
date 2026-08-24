import React from 'react';
import { Activity, Chemistry, Favorite, Medication, Search, type CarbonIconType } from '@carbon/react/icons';
import type { ScreeningStatus } from '../../types';
import { getCodedAnswerLabel } from '../../constants/coded-answers';
import { formatScreeningTestDate } from '../../utils/screening-history';
import { displayValue } from '../../utils/formatters';
import HistoricalSectionCard from '../shared/historical-section-card.component';
import sharedStyles from '../shared/shared.scss';
import styles from './screening-status.scss';

type Props = {
  data?: ScreeningStatus;
};

type ScreeningCard = {
  key: string;
  label: string;
  value: string;
  date?: string;
  tone?: 'positive' | 'negative' | 'neutral';
  icon: CarbonIconType;
};

const codedLabel = (value?: string): string => {
  if (!value?.trim()) {
    return '';
  }
  return getCodedAnswerLabel(value) || value;
};

const serologyTone = (label: string): 'positive' | 'negative' | 'neutral' => {
  const normalized = label.trim().toLowerCase();
  if (normalized.startsWith('positive')) {
    return 'positive';
  }
  if (normalized.startsWith('negative')) {
    return 'negative';
  }
  return 'neutral';
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

const buildCards = (data?: ScreeningStatus): ScreeningCard[] => {
  const hiv = codedLabel(data?.hivStatus);
  const hepatitisC = codedLabel(data?.hepatitisCStatus);
  const hepatitisB = codedLabel(data?.hepatitisBStatus);
  const syphilis = codedLabel(data?.syphilisStatus);

  return [
    {
      key: 'bloodGroup',
      label: 'Blood Group',
      value: codedLabel(data?.bloodGroup) || '—',
      icon: Favorite,
    },
    {
      key: 'hivStatus',
      label: 'HIV Status',
      value: hiv || '—',
      date: formatScreeningTestDate(data?.hivTestDate),
      tone: hiv ? serologyTone(hiv) : 'neutral',
      icon: Activity,
    },
    {
      key: 'hepatitisCStatus',
      label: 'Hepatitis C Status',
      value: hepatitisC || '—',
      date: formatScreeningTestDate(data?.hepatitisCTestDate),
      tone: hepatitisC ? serologyTone(hepatitisC) : 'neutral',
      icon: Chemistry,
    },
    {
      key: 'hepatitisBStatus',
      label: 'Hepatitis B Status',
      value: hepatitisB || '—',
      date: formatScreeningTestDate(data?.hepatitisBTestDate),
      tone: hepatitisB ? serologyTone(hepatitisB) : 'neutral',
      icon: Chemistry,
    },
    {
      key: 'syphilisStatus',
      label: 'Syphilis Status',
      value: syphilis || '—',
      date: formatScreeningTestDate(data?.syphilisTestDate),
      tone: syphilis ? serologyTone(syphilis) : 'neutral',
      icon: Search,
    },
    {
      key: 'drugAllergy',
      label: 'Drug Allergy',
      value: displayValue(data?.drugAllergy),
      icon: Medication,
    },
  ];
};

const ScreeningStatusView: React.FC<Props> = ({ data }) => (
  <HistoricalSectionCard title="Screening Status">
    {hasScreeningData(data) ? (
      <div className={styles.grid}>
        {buildCards(data).map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.key} className={styles.card}>
              <span className={styles.iconWrap} aria-hidden="true">
                <Icon size={16} />
              </span>
              <div>
                <div className={styles.label}>{card.label}</div>
                <div className={`${styles.value} ${card.tone ? styles[card.tone] : ''}`}>
                  {card.value}
                  {card.date ? <span className={styles.date}> ({card.date})</span> : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <div className={sharedStyles.emptyState}>No screening status recorded yet.</div>
    )}
  </HistoricalSectionCard>
);

export default ScreeningStatusView;
