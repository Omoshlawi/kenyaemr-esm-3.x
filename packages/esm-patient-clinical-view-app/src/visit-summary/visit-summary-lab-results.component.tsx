import React from 'react';
import { useTranslation } from 'react-i18next';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from '@carbon/react';
import { ArrowUp, ArrowDown } from '@carbon/react/icons';
import type { VisitSummary } from './visit-summary.resource';
import styles from './visit-summary.scss';

type LabResultsProps = {
  labResults: VisitSummary['labResults'];
};

type LabResult = VisitSummary['labResults'][number]['results'][number];

const ResultCell: React.FC<{ result: LabResult }> = ({ result }) => {
  const { t } = useTranslation();
  const code = result.interpretation?.code;
  const isHigh = code === 'H' || code === 'HH';
  const isLow = code === 'L' || code === 'LL';

  const className = isHigh ? styles.labInterpretationHigh : isLow ? styles.labInterpretationLow : undefined;

  return (
    <span className={className}>
      <strong>
        {result.value} {result.units}
      </strong>
      {isHigh && (
        <>
          {' '}
          <ArrowUp size={12} /> {t('high', 'High')}
        </>
      )}
      {isLow && (
        <>
          {' '}
          <ArrowDown size={12} /> {t('low', 'Low')}
        </>
      )}
    </span>
  );
};

const refRangeLabel = (r: LabResult): string => {
  if (r.lowNormal !== null && r.hiNormal !== null) {
    return `${r.lowNormal} – ${r.hiNormal}`;
  }
  if (r.hiNormal !== null) {
    return `< ${r.hiNormal}`;
  }
  if (r.lowNormal !== null) {
    return `> ${r.lowNormal}`;
  }
  return '—';
};

const VisitSummaryLabResults: React.FC<LabResultsProps> = ({ labResults }) => {
  const { t } = useTranslation();

  const hasAnyResult = labResults?.some((entry) => entry.results.length > 0);
  if (!hasAnyResult) {
    return null;
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>{t('labResults', 'Lab Results')}</h2>
      </div>
      <div className={styles.tableContainer}>
        <TableContainer>
          <Table size="sm" useZebraStyles className={styles.table}>
            <TableHead>
              <TableRow>
                <TableHeader>{t('test', 'Test')}</TableHeader>
                <TableHeader>{t('result', 'Result')}</TableHeader>
                <TableHeader>{t('refRange', 'Ref Range')}</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {labResults.map((entry) =>
                entry.isPanel ? (
                  <PanelGroup key={entry.panelUuid ?? entry.panel} entry={entry} />
                ) : (
                  entry.results.map((r) => (
                    <TableRow key={r.testUuid}>
                      <TableCell>{r.test}</TableCell>
                      <TableCell>
                        <ResultCell result={r} />
                      </TableCell>
                      <TableCell>{refRangeLabel(r)}</TableCell>
                    </TableRow>
                  ))
                ),
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </div>
  );
};

type PanelGroupProps = {
  entry: VisitSummary['labResults'][number];
};

const PanelGroup: React.FC<PanelGroupProps> = ({ entry }) => (
  <>
    <TableRow className={styles.panelHeaderRow}>
      <TableCell colSpan={3}>{entry.panel}</TableCell>
    </TableRow>
    {entry.results.map((r) => (
      <TableRow key={r.testUuid} className={styles.panelResultRow}>
        <TableCell>{r.test}</TableCell>
        <TableCell>
          <ResultCell result={r} />
        </TableCell>
        <TableCell>{refRangeLabel(r)}</TableCell>
      </TableRow>
    ))}
  </>
);

export default VisitSummaryLabResults;
