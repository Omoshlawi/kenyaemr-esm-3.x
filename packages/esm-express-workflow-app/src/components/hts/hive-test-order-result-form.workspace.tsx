import { useConfig, useLayoutType, Workspace2, Workspace2DefinitionProps } from '@openmrs/esm-framework';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Order } from '../../types';
import { Button, ButtonSet, Column, ComboBox, Dropdown, Form, InlineLoading } from '@carbon/react';
import styles from './hts-result-form.scss';
import classNames from 'classnames';
import z from 'zod';
import {
  HIVTestResultFormData,
  hivTestResultSchema,
  useConceptMembers,
  useInventory,
  useInventoryByConceptUuids,
} from './hts.resources';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ExpressWorkflowConfig } from '../../config-schema';

type HIVTestOrderResultFormProps = {
  order: Order;
};
const HIVTestOrderResultForm: React.FC<Workspace2DefinitionProps<HIVTestOrderResultFormProps, object, object>> = ({
  closeWorkspace,
  workspaceProps,
}) => {
  const { order } = workspaceProps ?? {};
  const resultoptions = useMemo(
    () => order?.concept?.answers?.map((a) => ({ label: a.name?.display, value: a.uuid })) ?? [],
    [order],
  );
  const { hivRapidTestConceptUuid, hivTestKitMembersConceptUuids, hivTestKitConceptUuid, hivTestResultsConceptUuids } =
    useConfig<ExpressWorkflowConfig>();
  const { members, error, isLoading } = useConceptMembers(hivTestKitConceptUuid);
  const { inventory, isLoading: isLoadingInventory, error: inventoryError } = useInventoryByConceptUuids();
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const form = useForm<HIVTestResultFormData>({
    resolver: zodResolver(hivTestResultSchema),
    defaultValues: { tests: [{ result: '', stockItem: '' }] },
  });
  const { append, fields, remove, update } = useFieldArray({ control: form.control, name: 'tests' });

  const kitItems = useMemo(
    () => [
      {
        order: 1,
        kitName: members?.find((m) => m.uuid === hivTestKitMembersConceptUuids.trinScreen)?.display,
        uuid: hivTestKitMembersConceptUuids.trinScreen,
      },
      {
        order: 1,
        kitName: members?.find((m) => m.uuid === hivTestKitMembersConceptUuids.standardQ)?.display,
        uuid: hivTestKitMembersConceptUuids.standardQ,
      },
      {
        order: 2,
        kitName: members?.find((m) => m.uuid === hivTestKitMembersConceptUuids.oneStep)?.display,
        uuid: hivTestKitMembersConceptUuids.oneStep,
      },
      {
        order: 3,
        kitName: members?.find((m) => m.uuid === hivTestKitMembersConceptUuids.firstResponse)?.display,
        uuid: hivTestKitMembersConceptUuids.firstResponse,
      },
    ],
    [
      members,
      hivTestKitMembersConceptUuids.trinScreen,
      hivTestKitMembersConceptUuids.standardQ,
      hivTestKitMembersConceptUuids.oneStep,
      hivTestKitMembersConceptUuids.firstResponse,
    ],
  );

  return (
    <Workspace2 title={t('hivOrderResults', 'HIV Order results')}>
      {isLoading || isLoadingInventory ? (
        <InlineLoading />
      ) : (
        <Form className={styles.form}>
          <div>
            {fields.map((field, i) => (
              <>
                <Column className={styles.fieldsSection} key={i}>
                  <Controller
                    control={form.control}
                    name={`tests.${i}.stockItem`}
                    render={({ field, fieldState }) => (
                      <ComboBox
                        id="hiv-rapid-test-stock-item"
                        itemToString={(item) => item?.kitName ?? ''}
                        items={kitItems
                          .filter((item) => item?.order === i + 1)
                          .map((item) => {
                            const invItem = inventory?.find((inv) => inv.conceptUuid === item.uuid);
                            const display = invItem
                              ? `${invItem.batchNumber} - ${item.kitName} | ${invItem.partyName} | QTY:${invItem.quantity}`
                              : `${item.kitName}`;
                            return { ...item, kitName: display };
                          })}
                        onChange={({ selectedItem }) => field.onChange(selectedItem)}
                        placeholder={t('chooseOptions', 'Choose an option')}
                        titleText={t('kitName', 'Kit name')}
                        invalid={Boolean(fieldState?.error?.message)}
                        invalidText={fieldState?.error?.message}
                        helperText={t(
                          'hivRapidTestStockItemHelperText',
                          'This is the lab kit used for the HRT test. It will be deducted from the stock item when the test is saved.',
                        )}
                      />
                    )}
                  />
                  <Controller
                    control={form.control}
                    name={`tests.${i}.result`}
                    render={({ field, fieldState }) => (
                      <Dropdown<{ label?: string; value: string }>
                        disabled={field?.disabled}
                        id="hiv-result"
                        invalid={Boolean(fieldState?.error?.message)}
                        invalidText={fieldState?.error?.message}
                        itemToString={(item) => item?.label ?? ''}
                        onChange={({ selectedItem }) => {
                          if ([1, 2].includes(i + 1) && selectedItem?.value === hivTestResultsConceptUuids.positive) {
                            append({ result: '', stockItem: '' });
                          }
                          field?.onChange(selectedItem);
                        }}
                        items={resultoptions}
                        label={t('chooseOptions', 'Choose an option')}
                        titleText={t('rsult', 'Result')}
                        type="default"
                      />
                    )}
                  />
                </Column>
                {i !== fields.length - 1 && <hr />}
              </>
            ))}
          </div>
          <ButtonSet className={classNames({ [styles.tablet]: isTablet, [styles.desktop]: !isTablet })}>
            <Button className={styles.button} kind="secondary" onClick={() => closeWorkspace()}>
              {t('cancel', 'Cancel')}
            </Button>
            <Button className={styles.button} kind="primary" type="submit" disabled={form.formState.isLoading}>
              {form.formState.isLoading ? (
                <InlineLoading description={t('saving', 'Saving')} />
              ) : (
                <span>{t('saveAndClose', 'Save & close')}</span>
              )}
            </Button>
          </ButtonSet>
        </Form>
      )}
    </Workspace2>
  );
};

export default HIVTestOrderResultForm;
