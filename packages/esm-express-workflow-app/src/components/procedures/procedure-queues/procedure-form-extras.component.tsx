import React, { FC, useEffect, useState } from 'react';
import styles from './procedure-form-extras.scss';
import { useTranslation } from 'react-i18next';
import { addPatientToQueue, useProcedureServiceQueues } from './procedure-queues.resources';
import { Column, Grid, InlineNotification, Layer, Select, SelectItem, SelectSkeleton } from '@carbon/react';
import { type OpenmrsResource, showSnackbar, useConfig, useLayoutType, type Visit } from '@openmrs/esm-framework';
import type { OrderBasketItem, Queue } from '../../../types';
import type { ExpressWorkflowConfig } from '../../../config-schema';

type ProcedureFormExtrasProps = {
  registerSubmitCallback: (callback: (value: OrderBasketItem) => void) => void;
  visitContext: Visit;
  patient: fhir.Patient;
};
const ProcedureFormExtras: FC<ProcedureFormExtrasProps> = ({ registerSubmitCallback, visitContext, patient }) => {
  const {
    queueStatusConceptUuids: { waitingStatus },
  } = useConfig<ExpressWorkflowConfig>();
  const { t } = useTranslation();
  const { procedureQueues, isLoadingQueues } = useProcedureServiceQueues();
  const [value, onChange] = useState<Queue>();

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const queueUuid = event.target.value;
    const selectedRoom = procedureQueues.find((queue) => queue.uuid === queueUuid);
    onChange(selectedRoom);
  };

  //   useEffect(() => {
  //     registerSubmitCallback((value: OrderBasketItem) => {
  //       // Move patient to the queue room if a room was selected in the QueueFields component
  //       if (value) {
  //         addPatientToQueue({
  //           visit: {
  //             uuid: visitContext.uuid,
  //           },
  //           queueEntry: {
  //             status: {
  //               uuid: waitingStatus,
  //             },
  //             priority: {
  //               uuid: '',
  //             },
  //             queue: {
  //               uuid: value?.uuid,
  //             },
  //             patient: {
  //               uuid: patient.id,
  //             },
  //             startedAt: new Date(),
  //             sortWeight: 0,
  //           },
  //         })
  //           .then(() => {
  //             showSnackbar({
  //               title: t('success', 'Success'),
  //               subtitle: t('addedToQueue', 'Patient added to queue'),
  //             });
  //           })
  //           .catch((e) => {
  //             showSnackbar({
  //               title: t('error', 'Error'),
  //               subtitle: t('errorAddingToQueue', 'An error occurred while adding the patient to the queue'),
  //             });
  //           });
  //       }
  //     });
  //   }, [patient.id, registerSubmitCallback, t, value, visitContext.uuid, waitingStatus]);

  return (
    <Grid className={styles.gridRow}>
      <Column lg={16} md={8} sm={4}>
        <InputWrapper>
          <section className={styles.section}>
            {isLoadingQueues ? (
              <SelectSkeleton />
            ) : procedureQueues.length === 0 ? (
              <InlineNotification
                className={styles.inlineNotification}
                kind="error"
                lowContrast
                subtitle={t('configureQueueRooms', 'Please configure procedure queue rooms to continue.')}
                title={t('noQueueRoomsConfigured', 'No queue rooms configured')}
              />
            ) : (
              <Select
                labelText={t('selectProcedureRoom', 'Select a procedure room')}
                id="procedureRoom"
                name="procedureRoom"
                invalidText={t('required', 'Required')}
                // The select's value is now driven solely by the value prop's uuid
                value={value?.uuid || ''}
                helperText={t(
                  'patientWillBeAddedToSelectedQueueRoom',
                  'The patient will be added to the selected queue room when you save.',
                )}
                onChange={handleSelectChange}>
                {/* Placeholder option */}
                <SelectItem text={t('selectOption', 'Choose an option')} value="" />

                {procedureQueues.map((queue) => {
                  const locationSuffix = (queue?.location as unknown as OpenmrsResource)?.display
                    ? ` - ${(queue.location as unknown as OpenmrsResource).display}`
                    : '';

                  return (
                    <SelectItem
                      key={queue.uuid}
                      text={`${queue.queueRooms?.[0]?.display}${locationSuffix}`}
                      value={queue.uuid}
                    />
                  );
                })}
              </Select>
            )}
          </section>
        </InputWrapper>
      </Column>
    </Grid>
  );
};

export default ProcedureFormExtras;

function InputWrapper({ children }) {
  const isTablet = useLayoutType() === 'tablet';
  return (
    <Layer level={isTablet ? 1 : 0}>
      <div className={styles.field}>{children}</div>
    </Layer>
  );
}
