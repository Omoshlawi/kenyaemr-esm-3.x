import React, { ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Tile,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  OverflowMenu,
  OverflowMenuItem,
  TableContainer,
  DataTableHeader,
} from '@carbon/react';
import styles from './program-enrollment.scss';
import isEmpty from 'lodash/isEmpty';
import dayjs from 'dayjs';
import { formatDate, launchWorkspace2, restBaseUrl, useVisit } from '@openmrs/esm-framework';
import orderBy from 'lodash/orderBy';
import { mutate } from 'swr';
import { useHeiOutcome } from '../hooks/useHeiOutcome';
import { usePatientChartStore } from '@openmrs/esm-patient-common-lib/src';

export interface ProgramEnrollmentProps {
  patientUuid: string;
  programName: string;
  enrollments: Array<any>;
  formEntrySub: any;
}
const shareObjProperty = { dateEnrolled: 'Enrolled on', dateCompleted: 'Date Completed' };
const programDetailsMap = {
  HIV: {
    dateEnrolled: 'Enrolled on',
    whoStage: 'WHO Stage',
    entryPoint: 'Entry Point',
    reason: 'Reason for discontinuation',
  },
  TB: {
    ...shareObjProperty,
    startDate: 'Date started regimen',
    regimenShortName: 'Regimen',
  },
  TPT: {
    ...shareObjProperty,
    tptDrugName: 'Regimen',
    tptDrugStartDate: 'Date started regimen',
    tptIndication: 'Indication for TPT',
  },
  'MCH - Mother Services': {
    ...shareObjProperty,
    lmp: 'LMP',
    eddLmp: 'EDD',
    gravida: 'Gravida',
    parity: 'Parity',
    gestationInWeeks: 'Gestation in weeks',
  },
  'MCH - Child Services': { ...shareObjProperty, entryPoint: 'Entry Point' },
  mchMother: {},
  mchChild: {},
  VMMC: {
    ...shareObjProperty,
  },
};

const ProgramEnrollment: React.FC<ProgramEnrollmentProps> = ({ enrollments = [], programName, patientUuid }) => {
  const { t } = useTranslation();
  const { mutateVisitContext, visitContext, patient: fhirPatient } = usePatientChartStore(patientUuid);
  const { currentVisit } = useVisit(patientUuid);
  const { heiOutcome } = useHeiOutcome(currentVisit?.patient?.uuid);
  const orderedEnrollments = orderBy(enrollments, 'dateEnrolled', 'desc');
  const headers: Array<DataTableHeader> = useMemo(
    () =>
      Object.entries(programDetailsMap[programName] ?? { ...shareObjProperty }).map(([key, value]) => ({
        key,
        header: value as ReactNode,
      })),
    [programName],
  );
  const rows = useMemo(
    () =>
      orderedEnrollments?.map((enrollment) => {
        const firstEncounter = enrollment?.firstEncounter ?? {};
        const enrollmentEncounterUuid = enrollment?.enrollmentEncounterUuid;
        return {
          id: `${enrollment.enrollmentUuid}`,
          ...enrollment,
          ...firstEncounter,
          changeReasons: Array.isArray(firstEncounter?.changeReasons) ? firstEncounter.changeReasons.join(', ') : '',
          enrollmentEncounterUuid: enrollmentEncounterUuid,
        };
      }),
    [orderedEnrollments],
  );

  const handleMutation = () => {
    const endPoints = [
      `${restBaseUrl}/kenyaemr/patientHistoricalEnrollment?patientUuid=`,
      `${restBaseUrl}/kenyaemr/patientCurrentEnrollment?patientUuid=`,
      `${restBaseUrl}/kenyaemr/eligiblePrograms?patientUuid=`,
    ];
    endPoints.forEach((endpoint) => {
      mutate((key) => typeof key === 'string' && key.startsWith(endpoint), undefined, { revalidate: true });
    });
  };

  const groupProps = useMemo(() => {
    return {
      patientUuid,
      patient: fhirPatient,
      mutateVisitContext: () => {
        handleMutation();
      },
      visitContext,
    };
  }, [patientUuid, fhirPatient, mutateVisitContext, visitContext]);

  const handleDiscontinue = (enrollment) => {
    launchWorkspace2(
      'patient-form-entry-workspace',
      {
        form: {
          uuid: enrollment?.discontinuationFormUuid,
        },
        encounterUuid: '',
        additionalProps: {
          enrollmentDetails: { dateEnrolled: new Date(enrollment.dateEnrolled), uuid: enrollment.enrollmentUuid },
        },
      },
      {},
      groupProps,
    );
  };

  const handleHeiOutcome = () => {
    launchWorkspace2(
      'patient-form-entry-workspace',
      {
        form: {
          uuid: 'd823f1ef-0973-44ee-b113-7090dc23257b',
        },
        encounterUuid: 'enrollmentEncounterUuid',
      },
      {},
      groupProps,
    );
  };

  const handleEditEnrollment = (enrollment) => {
    launchWorkspace2(
      'patient-form-entry-workspace',
      {
        workspaceTitle: enrollment?.enrollmentFormName,
        form: {
          uuid: enrollment?.enrollmentFormUuid,
        },
        additionalProps: {
          enrollmentDetails: { dateEnrolled: new Date(enrollment.dateEnrolled), uuid: enrollment.enrollmentUuid },
        },
        encounterUuid: enrollment?.enrollmentEncounterUuid,
      },
      {},
      groupProps,
    );
  };

  if (orderedEnrollments?.length === 0) {
    return null;
  }

  return (
    <Tile className={styles.whiteBackground}>
      <div className={styles.tileWrapper}>
        <DataTable size="sm" useZebraStyles rows={rows} headers={headers}>
          {({ rows, headers, getHeaderProps, getRowProps, getTableProps }) => (
            <TableContainer title={t('EnrollmentDetails', 'Enrollment History')} description="">
              <Table {...getTableProps()} aria-label="">
                <TableHead>
                  <TableRow>
                    {headers.map((header) => (
                      <TableHeader
                        key={header.key}
                        {...getHeaderProps({
                          header,
                        })}>
                        {header.header}
                      </TableHeader>
                    ))}
                    <TableHeader />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow
                      key={row.id}
                      {...getRowProps({
                        row,
                      })}>
                      {row.cells.map((cell) => (
                        <TableCell key={cell.id}>
                          {isEmpty(cell.value)
                            ? '--'
                            : dayjs(cell.value).isValid()
                            ? formatDate(new Date(cell.value))
                            : cell.value}
                        </TableCell>
                      ))}
                      <TableCell className="cds--table-column-menu">
                        {isEmpty(orderedEnrollments[index]?.dateCompleted) && (
                          <OverflowMenu size="sm" flipped>
                            <OverflowMenuItem
                              hasDivider
                              itemText={t('edit', 'Edit')}
                              onClick={() => handleEditEnrollment(orderedEnrollments[index])}
                            />
                            {heiOutcome?.heiNumber &&
                              !heiOutcome?.heiOutcomeEncounterUuid &&
                              orderedEnrollments[index]?.programName === 'MCH - Child Services' && (
                                <OverflowMenuItem
                                  hasDivider
                                  itemText={t('heiOutcome', 'Hei Outcome')}
                                  onClick={handleHeiOutcome}
                                />
                              )}
                            <OverflowMenuItem
                              isDelete
                              hasDivider
                              disabled={
                                heiOutcome?.heiNumber &&
                                !heiOutcome?.heiOutcomeEncounterUuid &&
                                orderedEnrollments[index]?.programName === 'MCH - Child Services'
                              }
                              itemText={t('discontinue', 'Discontinue')}
                              onClick={() => handleDiscontinue(orderedEnrollments[index])}
                            />
                          </OverflowMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataTable>
      </div>
    </Tile>
  );
};
export default ProgramEnrollment;
