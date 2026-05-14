import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';

import styles from './nursing-treatment-sheet.scss';

type NursingTreatmentSheetProps = {
  patientUuid: string;
};

const getTableHeaders = (t: any) => ({
  medication: [
    { header: t('date', 'Date'), key: 'date' },
    { header: t('drug', 'Drug'), key: 'drug' },
    { header: t('dose', 'Dose'), key: 'dose' },
    { header: t('route', 'Route'), key: 'route' },
    { header: t('provider', 'Name'), key: 'provider' },
    { header: t('time', 'Time'), key: 'time' },
  ],
  fluid: [
    { header: t('date', 'Date'), key: 'date' },
    {
      header: t(
        'itemAndAdministrationInstructions',
        'Item & Administration Instructions (Volume, Frequency, Rate, Duration)',
      ),
      key: 'itemAndAdministrationInstructions',
    },
    { header: t('provider', 'Name'), key: 'provider' },
    { header: t('time', 'Time'), key: 'reviewDate' },
  ],
});

const NursingTreatmentSheet: React.FC<NursingTreatmentSheetProps> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const { medication: medicationHeaders, fluid: fluidHeaders } = getTableHeaders(t);

  return (
    <div className={styles.wrapper}>
      <div className={styles.sectionHeader}>
        <h3>{t('nursingTreatmentSheet', 'Nursing Treatment Sheet')}</h3>
        <p>{t('nursingTreatmentSheetDescription', 'UI preview only. Medication data integration will follow.')}</p>
      </div>

      <DataTable size="sm" useZebraStyles rows={[]} headers={medicationHeaders}>
        {({ rows, headers, getHeaderProps, getTableProps }) => (
          <TableContainer title={t('nursingTreatmentSheet', 'Nursing Treatment Sheet')}>
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  {headers.map((header) => (
                    <TableHeader {...getHeaderProps({ header })}>{header.header}</TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.cells.map((cell) => (
                      <TableCell key={cell.id}>{cell.value}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>

      <div className={styles.fluidSectionHeader}>
        <h3>{t('fluidsAndParenteralNutritionSection', 'FLuids and Parenteral Nutrition Section')}</h3>
        <p>
          {t(
            'fluidsAndParenteralNutritionDescription',
            'UI preview only. Fluid and parenteral nutrition integration will follow.',
          )}
        </p>
      </div>

      <DataTable size="sm" useZebraStyles rows={[]} headers={fluidHeaders}>
        {({ rows, headers, getHeaderProps, getTableProps }) => (
          <TableContainer title={t('fluidsAndParenteralNutritionSection', 'FLuids and Parenteral Nutrition Section')}>
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  {headers.map((header) => (
                    <TableHeader {...getHeaderProps({ header })}>{header.header}</TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.cells.map((cell) => (
                      <TableCell key={cell.id}>{cell.value}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
    </div>
  );
};

export default NursingTreatmentSheet;
