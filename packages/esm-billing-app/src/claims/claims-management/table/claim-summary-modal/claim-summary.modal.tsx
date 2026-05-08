import {
  Button,
  ModalBody,
  ModalFooter,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Tag,
} from '@carbon/react';
import { formatDate, parseDate } from '@openmrs/esm-framework';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './claim-summary.scss';
import upperCase from 'lodash-es/upperCase';
import capitalize from 'lodash-es/capitalize';
import { useCurrencyFormatting } from '../../../../helpers/currency';
import { SHA_INTERVENTION_LABELS } from '../../../../constants';

// type ExtendedClaim = FacilityClaim & {
//   id: string;
//   providerName: string;
//   patientName: string;
//   patientId?: string;
// };

export const ClaimSummaryModal = ({ closeModal, claimId }: { closeModal: () => void; claimId: string }) => {
  const { t } = useTranslation();
  // const { claims } = useFacilityClaims();
  // const { format: formatCurrency } = useCurrencyFormatting();

  // const claim = claims.find((c) => c.id === claimId) as ExtendedClaim | undefined;

  // if (claim) {
  //   return (
  //     <React.Fragment>
  //       <ModalBody>
  //         <p>{t('claimNotFound', 'Claim not found')}</p>
  //       </ModalBody>
  //       <ModalFooter>
  //         <Button kind="primary" onClick={closeModal} type="button">
  //           {t('close', 'Close')}
  //         </Button>
  //       </ModalFooter>
  //     </React.Fragment>
  //   );
  // }

  // const personData = claim.bill?.patient?.person ?? claim.patient?.person;

  // const rawPatientDisplay = personData?.display || claim.bill?.patient?.display || claim.patientName || '-';
  // const cleanPatientName = rawPatientDisplay.includes(' - ')
  //   ? rawPatientDisplay.split(' - ').slice(1).join(' - ').trim()
  //   : rawPatientDisplay;
  // const patientName = upperCase(cleanPatientName);
  // const patientGender = personData?.gender ?? '-';
  // const patientAge = personData?.age != null ? `${personData.age} yrs` : '-';

  // const rawBirthdate = personData?.birthdate ?? personData?.birthDate;
  // const patientDob = rawBirthdate ? formatDate(new Date(rawBirthdate)) : '-';

  // const rawProviderDisplay = claim.provider?.person?.display || claim.provider?.display || claim.providerName || '-';
  // const providerName = rawProviderDisplay.includes(' - ')
  //   ? rawProviderDisplay.split(' - ').slice(1).join(' - ').trim()
  //   : rawProviderDisplay;

  // const diagnosesRaw =
  //   (claim.visit?.encounters as any[])?.flatMap((encounter: any) => {
  //     if (!encounter.diagnoses?.length) {
  //       return [];
  //     }
  //     return encounter.diagnoses
  //       .filter((d: any) => !d.voided)
  //       .map((d: any) => ({
  //         uuid: d.uuid,
  //         display: d.diagnosis?.coded?.display || d.diagnosis?.nonCoded || d.diagnosis?.display || d.display || '',
  //         certainty: d.certainty,
  //         rank: d.rank ?? 2,
  //       }))
  //       .filter((d: any) => Boolean(d.display));
  //   }) ?? [];

  // const seenUuids = new Set<string>();
  // const diagnoses = diagnosesRaw
  //   .filter((d) => {
  //     if (seenUuids.has(d.uuid)) {
  //       return false;
  //     }
  //     seenUuids.add(d.uuid);
  //     return true;
  //   })
  //   .sort((a, b) => a.rank - b.rank);

  // const interventions = claim.interventions ?? [];

  // const isPHCClaim = claim.claimCode === 'auto' || claim.adjustment === 'PHC Claim';

  // const providedItems = claim.bill?.providedItems ?? [];

  // const billingHeaders = [
  //   { key: 'item', header: t('item', 'Item') },
  //   { key: 'qty', header: t('qty', 'Qty') },
  //   { key: 'unitPrice', header: t('unitPrice', 'Unit Price') },
  //   { key: 'total', header: t('total', 'Total') },
  // ];

  // const billingRows = providedItems.map((item, idx) => ({
  //   id: `${idx}`,
  //   item: item.item?.display || '-',
  //   qty: item.numberOfConsumptions ?? 1,
  //   unitPrice: formatCurrency(item.price ?? 0),
  //   total: formatCurrency((item.price ?? 0) * (item.numberOfConsumptions ?? 1)),
  // }));

  // const claimedTotal = providedItems.reduce(
  //   (sum, item) => sum + (item.price ?? 0) * (item.numberOfConsumptions ?? 1),
  //   0,
  // );

  // const displayTotal = isPHCClaim ? 0 : claimedTotal > 0 ? claimedTotal : claim.claimedTotal ?? 0;

  return (
    <React.Fragment>
      <ModalBody>
        <div className={styles.invoiceContainer}>
          <div className={styles.invoiceHeader}>
            <div className={styles.invoiceTitle}>
              <h3>{t('claimSummary', 'CLAIM SUMMARY')}</h3>
            </div>
            <div className={styles.claimNumber}>
              <span className={styles.claimNumberLabel}>{t('claimNo', 'Claim No.')}</span>
              {/* <span className={styles.claimNumberValue}>{claim.claimCode || 'N/A'}</span> */}
            </div>
          </div>
        </div>

        {/* <div className={styles.infoGrid}>
            <div className={styles.infoBlock}>
              <h4 className={styles.blockTitle}>{t('billTo', 'BILL TO')}</h4>
              <div className={styles.infoContent}>
                <p className={styles.primaryInfo}>{patientName}</p>
                <p className={styles.secondaryInfo}>
                  {patientGender} &bull; {patientAge}
                </p>
                <p className={styles.secondaryInfo}>
                  {t('dob', 'DOB')}: {patientDob}
                </p>
              </div>
            </div>

            <div className={styles.infoBlock}>
              <h4 className={styles.blockTitle}>{t('provider', 'PROVIDER')}</h4>
              <div className={styles.infoContent}>
                <p className={styles.primaryInfo}>{providerName}</p>
              </div>
            </div>
          </div>

          <div className={styles.visitSection}>
            <h4 className={styles.sectionTitle}>{t('visitInformation', 'VISIT INFORMATION')}</h4>
            <div className={styles.visitGrid}>
              <div className={styles.visitField}>
                <span className={styles.visitLabel}>{t('visitType', 'Visit Type')}</span>
                <span className={styles.visitValue}>{claim.visitType?.display || claim.use || '-'}</span>
              </div>
              <div className={styles.visitField}>
                <span className={styles.visitLabel}>{t('serviceFrom', 'Service From')}</span>
                <span className={styles.visitValue}>{claim.dateFrom ? formatDate(new Date(claim.dateFrom)) : '-'}</span>
              </div>
              <div className={styles.visitField}>
                <span className={styles.visitLabel}>{t('serviceTo', 'Service To')}</span>
                <span className={styles.visitValue}>{claim.dateTo ? formatDate(new Date(claim.dateTo)) : '-'}</span>
              </div>
            </div>
          </div>

          {diagnoses.length > 0 && (
            <div className={styles.diagnosesSection}>
              <h4 className={styles.sectionTitle}>{t('diagnoses', 'DIAGNOSES')}</h4>
              <ul className={styles.diagnosesList}>
                {diagnoses.map((d) => (
                  <li key={d.uuid} className={styles.diagnosisItem}>
                    {capitalize(d.display)}
                    {d.certainty === 'CONFIRMED' && (
                      <Tag type="green" size="sm" className={styles.certaintyTag}>
                        {t('confirmed', 'Confirmed')}
                      </Tag>
                    )}
                    {d.certainty === 'PROVISIONAL' && (
                      <Tag type="warm-gray" size="sm" className={styles.certaintyTag}>
                        {t('provisional', 'Provisional')}
                      </Tag>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className={styles.lineItemsSection}>
            <h4 className={styles.sectionTitle}>{t('servicesProvided', 'SERVICES PROVIDED')}</h4>
            {interventions.length === 0 ? (
              <p className={styles.noItems}>{t('noInterventions', 'No interventions recorded')}</p>
            ) : (
              <div className={styles.interventionsList}>
                {interventions.map((code) => (
                  <div key={code} className={styles.interventionItem}>
                    <span className={styles.interventionCode}>{code}</span>
                    <span className={styles.interventionSeparator}>&mdash;</span>
                    <span className={styles.interventionName}>{SHA_INTERVENTION_LABELS[code] ?? code}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!isPHCClaim && (
            <div className={styles.lineItemsSection}>
              <h4 className={styles.sectionTitle}>{t('billingDetails', 'BILLING DETAILS')}</h4>
              {billingRows.length === 0 ? (
                <p className={styles.noItems}>{t('noLineItems', 'No billing details available')}</p>
              ) : (
                <DataTable rows={billingRows} headers={billingHeaders}>
                  {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
                    <Table {...getTableProps()} size="md" useZebraStyles={false}>
                      <TableHead>
                        <TableRow>
                          {headers.map((header) => (
                            <TableHeader {...getHeaderProps({ header })} key={header.key}>
                              {header.header}
                            </TableHeader>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow {...getRowProps({ row })} key={row.id}>
                            {row.cells.map((cell) => (
                              <TableCell key={cell.id}>{cell.value}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </DataTable>
              )}
            </div>
          )}

          <div className={styles.financialSummary}>
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>{t('claimedAmount', 'Claimed Amount')}</span>
              <span className={styles.totalValue}>
                {isPHCClaim ? (
                  <span className={styles.phcTotalNote}>{formatCurrency(0)}</span>
                ) : (
                  formatCurrency(displayTotal)
                )}
              </span>
            </div>
          </div>
        </div> */}
      </ModalBody>

      <ModalFooter>
        <Button kind="primary" onClick={closeModal} type="button">
          {t('close', 'Close')}
        </Button>
      </ModalFooter>
    </React.Fragment>
  );
};
