import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import classNames from 'classnames';
import {
  Dropdown,
  Button,
  ButtonSet,
  ComboBox,
  InlineLoading,
  InlineNotification,
  NumberInput,
  Stack,
  Column,
  Tag,
  ContentSwitcher,
  Switch,
  ProgressIndicator,
  ProgressStep,
  Checkbox,
  RadioButtonGroup,
  RadioButton,
  Section,
  Heading,
} from '@carbon/react';
import { ArrowLeft } from '@carbon/react/icons';
import {
  ResponsiveWrapper,
  restBaseUrl,
  useConfig,
  useLayoutType,
  showSnackbar,
  Workspace2DefinitionProps,
  Workspace2,
  usePatient,
  useVisit,
} from '@openmrs/esm-framework';
import { type Order } from '@openmrs/esm-patient-common-lib';
import { mutate } from 'swr';
import { useBillableItem } from '../../../../billable-services/billable-orders/useBillableItem';
import { processBillItems } from '../../../../billing.resource';
import { useCurrencyFormatting } from '../../../../helpers/currency';
import { BillingConfig } from '../../../../config-schema';
import { useClaimForVisit, useVisitAttribute } from './create-bill.resource';
import {
  addInterventionToVisit,
  restoreInterventionOnVisit,
  retireInterventionOnVisit,
  switchInterventionOnVisit,
  useHasSupplementaryPompsCoverage,
  useNonPomsfUtilization,
  useSHAInterventions,
  useSHASubBenefits,
} from '../../../../billing-form/social-health-authority/sha-virtual-claim.resource';
import styles from './create-bill.style.scss';
import { InterventionItem, PackageItem } from './type';
import { extractFetchError } from '../../../../claims/claims-management/table/virtual-claim-preauth/utils';
import { PREAUTH_TYPE_COLORS } from '../../../../claims/claims-management/table/virtual-claim-preauth/constants';
import { useFacilityRegistry } from '../../../../hooks/useFacilityRegistry';

type CreateBillWorkspaceProps = {
  patientUuid: string;
  order: Order;
  closeModal: () => void;
  medicationRequestBundle?: {
    request: fhir.MedicationRequest;
  };
};

type ShaMode = 'ADD' | 'SWITCH' | 'RESTORE' | 'RETIRE';

const createBillFormSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  unitPrice: z.string().min(1),
  quantity: z.number().min(1),
  needsShaAction: z.boolean().default(true),
  shaMode: z.enum(['ADD', 'SWITCH', 'RESTORE', 'RETIRE']).default('ADD'),
  packageCode: z.string().nullable().optional(),
  interventionCode: z.string().nullable().optional(),
  fromInterventionCode: z.string().nullable().optional(),
  restoreInterventionCode: z.string().nullable().optional(),
  retireInterventionCode: z.string().nullable().optional(),
  keepBilledLines: z.boolean().default(true),
  interventionPayload: z.any().nullable().optional(),
});

type CreateBillFormSchema = z.infer<typeof createBillFormSchema>;

interface BillFormProps {
  billableItem: any;
  quantityToDispense: number;
  createBillForm: any;
  errors: any;
  calculateTotal: () => number;
  comboBoxItems: Array<{
    id: string;
    text: string;
    unitPrice: number;
  }>;
}

interface MedicationBillFormProps extends Omit<BillFormProps, 'quantityToDispense'> {
  medicationRequestBundle: {
    request: fhir.MedicationRequest;
  };
}

const BillForm: React.FC<BillFormProps> = ({
  billableItem,
  quantityToDispense,
  createBillForm,
  errors,
  calculateTotal,
  comboBoxItems,
}) => {
  const { t } = useTranslation();
  const { format: formatCurrency } = useCurrencyFormatting();

  return (
    <Stack gap={4}>
      <Column>
        <div className={styles.formField}>
          <label className={styles.label}>{t('item', 'Item')}</label>
          <div className={styles.value}>{billableItem?.name ?? 'Service Not Found'}</div>
        </div>
      </Column>
      <Column>
        <Controller
          control={createBillForm.control}
          name="quantity"
          render={({ field }) => (
            <NumberInput
              {...field}
              id="quantity"
              label={t('quantity', 'Quantity')}
              min={1}
              max={quantityToDispense}
              value={field.value}
              onChange={(e, { value }) => field.onChange(value)}
            />
          )}
        />
      </Column>
      <Column>
        <Controller
          control={createBillForm.control}
          name="unitPrice"
          render={({ field }) => (
            <Dropdown
              {...field}
              onChange={({ selectedItem }) => {
                field.onChange(selectedItem?.unitPrice?.toString() ?? '');
                createBillForm.setValue('id', selectedItem?.id ?? '');
                createBillForm.setValue('text', selectedItem?.text ?? '');
              }}
              id="unit-price"
              itemToString={(item) => item?.text ?? ''}
              items={comboBoxItems}
              label={t('selectUnitPrice', 'Select Unit Price')}
              titleText={t('unitPrice', 'Unit Price')}
              type="default"
              invalid={!!errors.unitPrice}
              invalidText={errors.unitPrice?.message}
            />
          )}
        />
      </Column>
      <Column>
        <div className={styles.formField}>
          <label className={styles.label}>{t('total', 'Total')}</label>
          <div className={styles.value}>{formatCurrency(calculateTotal())}</div>
        </div>
      </Column>
    </Stack>
  );
};

const MedicationBillForm: React.FC<MedicationBillFormProps> = ({ medicationRequestBundle, ...props }) => {
  const quantityToDispense = medicationRequestBundle?.request?.dispenseRequest?.quantity?.value ?? 1;
  return <BillForm {...props} quantityToDispense={quantityToDispense} />;
};

const StandardBillForm: React.FC<Omit<BillFormProps, 'quantityToDispense'>> = (props) => {
  return <BillForm {...props} quantityToDispense={1} />;
};

type SHAStepProps = {
  patientCRId: string | null;
  patientUuid: string;
  visitUuid: string;
  control: any;
  errors: any;
  setValue: any;
  watch: any;
  schemeCode: string | null;
  activeCodes: Set<string>;
  inactiveCodes: Set<string>;
  currentInterventions: Array<any>;
  onUtilizationStatusChange: (isExhausted: boolean) => void;
  onBack: () => void;
  shaError: string | null;
  onClearError: () => void;
};

const SHAStep: React.FC<SHAStepProps> = ({
  patientCRId,
  patientUuid,
  visitUuid,
  control,
  errors,
  setValue,
  watch,
  schemeCode,
  activeCodes,
  inactiveCodes,
  currentInterventions,
  onUtilizationStatusChange,
  onBack,
  shaError,
  onClearError,
}) => {
  const { t } = useTranslation();

  const shaMode = (watch('shaMode') as ShaMode) ?? 'ADD';
  const packageCode = watch('packageCode') ?? null;
  const interventionCode = watch('interventionCode') ?? null;
  const restoreInterventionCode = watch('restoreInterventionCode') ?? null;
  const retireInterventionCode = watch('retireInterventionCode') ?? null;

  const focusedCode = shaMode === 'RESTORE' ? restoreInterventionCode : interventionCode;

  const { subBenefits, isLoading: loadingSubBenefits, error: subBenefitsError } = useSHASubBenefits(patientCRId ?? '');
  const {
    interventions,
    isLoading: loadingInterventions,
    error: interventionsError,
  } = useSHAInterventions(patientCRId ?? '', packageCode ?? '');

  const { hasSupplementaryCoverage, isLoading: loadingSupplementary } = useHasSupplementaryPompsCoverage(patientUuid);

  const shouldSkipUtilizationCheck = hasSupplementaryCoverage || loadingSupplementary;
  const effectivePatientCRId = shouldSkipUtilizationCheck ? '' : patientCRId ?? '';
  const { utilization, isLoading: loadingUtilization } = useNonPomsfUtilization(
    effectivePatientCRId,
    focusedCode ?? '',
  );

  const isCoverageExhausted = !shouldSkipUtilizationCheck && Boolean(utilization && utilization.eligibility === false);

  useEffect(() => {
    if (shouldSkipUtilizationCheck) {
      onUtilizationStatusChange(false);
      return;
    }
    if (!loadingUtilization && utilization) {
      onUtilizationStatusChange(isCoverageExhausted);
    }
    return () => onUtilizationStatusChange(false);
  }, [shouldSkipUtilizationCheck, isCoverageExhausted, loadingUtilization, utilization, onUtilizationStatusChange]);

  const packageItems: Array<PackageItem> = useMemo(
    () =>
      subBenefits.map((b) => ({
        code: b.code,
        name: b.name,
        label: `${b.code} — ${b.name}`,
      })),
    [subBenefits],
  );

  const interventionItems: Array<InterventionItem> = useMemo(
    () =>
      interventions
        .map((i) => {
          const isElective = Boolean((i as any).needs_manual_preauth_approval);
          const suffix = isElective
            ? ` — ${t('preauthRequired', 'Preauth required')}`
            : i?.payment_mechanism?.toUpperCase() === 'CAPITATION'
            ? ` — ${t('capitation', 'Capitation (PHC)')}`
            : i?.needs_preauth
            ? ` — ${t('preauthRequired', 'Preauth required')}`
            : ` — ${t('noPreauthNeeded', 'No preauth')}`;
          return {
            id: `intervention-${i.code}`,
            code: i.code,
            name: i.name,
            text: `${i.name}${suffix}`,
            disabled: false,
            isElective,
          };
        })
        .sort((a, b) => Number(a.isElective) - Number(b.isElective)),
    [interventions, t],
  );

  const targetInterventionItems = useMemo(
    () =>
      interventionItems.map((iv) => {
        const isActiveOnClaim = activeCodes.has(iv.code);
        const isInactiveOnClaim = inactiveCodes.has(iv.code);

        let disabled = iv.disabled;
        let suffix = iv.text;

        if (isActiveOnClaim) {
          disabled = true;
          suffix =
            shaMode === 'SWITCH'
              ? `${iv.text} — ${t('alreadyActive', 'Already active')}`
              : `${iv.text} — ${t('alreadyAttached', 'Already attached')}`;
        } else if (isInactiveOnClaim) {
          disabled = true;
          suffix = `${iv.text} — ${t('previouslyUsedUseRestore', 'Previously used — use Restore instead')}`;
        }

        return { ...iv, disabled, text: suffix, isActiveOnClaim, isInactiveOnClaim };
      }),
    [interventionItems, activeCodes, inactiveCodes, shaMode, t],
  );

  const switchableFromItems = useMemo(
    () =>
      currentInterventions
        .filter((iv: any) => (iv?.status ?? '').toUpperCase() === 'ACTIVE')
        .map((iv: any) => ({
          id: `current-${iv.intervention_code}`,
          code: iv.intervention_code,
          name: iv.intervention_name,
          text: `${iv.intervention_code} — ${iv.intervention_name}`,
        })),
    [currentInterventions],
  );

  const restorableItems = useMemo(
    () =>
      currentInterventions
        .filter((iv: any) => (iv?.status ?? '').toUpperCase() !== 'ACTIVE')
        .filter((iv: any) => !iv?.voided)
        .map((iv: any) => {
          const name = iv.intervention_name ?? t('unknownIntervention', 'Unknown intervention');
          return {
            id: `inactive-${iv.intervention_code}`,
            code: iv.intervention_code,
            name,
            text: `${iv.intervention_code} — ${name}`,
          };
        }),
    [currentInterventions, t],
  );

  const hasSwitchable = switchableFromItems.length > 0;
  const hasRestorable = restorableItems.length > 0;
  // SHA refuses to retire the last active intervention — a claim must keep at
  // least one. Offer the mode only when something would remain afterwards.
  const hasRetirable = switchableFromItems.length > 1;

  useEffect(() => {
    if (
      (shaMode === 'SWITCH' && !hasSwitchable) ||
      (shaMode === 'RESTORE' && !hasRestorable) ||
      (shaMode === 'RETIRE' && !hasRetirable)
    ) {
      setValue('shaMode', 'ADD');
      setValue('packageCode', null);
      setValue('interventionCode', null);
      setValue('fromInterventionCode', null);
      setValue('restoreInterventionCode', null);
      setValue('retireInterventionCode', null);
      setValue('interventionPayload', null);
      onClearError();
    }
  }, [shaMode, hasSwitchable, hasRestorable, hasRetirable, setValue, onClearError]);

  const selectedIntervention = useMemo(
    () => interventions.find((i) => i.code === interventionCode) ?? null,
    [interventions, interventionCode],
  );
  const selectedRestoreIntervention = useMemo(
    () => currentInterventions.find((iv: any) => iv.intervention_code === restoreInterventionCode) ?? null,
    [currentInterventions, restoreInterventionCode],
  );
  const selectedRetireIntervention = useMemo(
    () => currentInterventions.find((iv: any) => iv.intervention_code === retireInterventionCode) ?? null,
    [currentInterventions, retireInterventionCode],
  );

  const isSelectedElective = Boolean((selectedIntervention as any)?.needs_manual_preauth_approval);

  const schemeTagType = useMemo(() => {
    const upper = schemeCode?.toUpperCase();
    if (upper === 'PHC') {
      return 'teal';
    }
    if (upper === 'SHIF') {
      return 'blue';
    }
    return 'gray';
  }, [schemeCode]);

  const schemeLabel = useMemo(() => {
    const upper = schemeCode?.toUpperCase();
    if (upper === 'PHC') {
      return t('phcCapitation', 'PHC (Capitation)');
    }
    if (upper === 'SHIF') {
      return t('shif', 'SHIF');
    }
    return schemeCode ?? '';
  }, [schemeCode, t]);

  const TitleRow = (
    <div className={styles.sectionTitleRow}>
      <h5 className={styles.sectionTitle}>{t('shaInterventionDetails', 'SHA Intervention Details')}</h5>
      {schemeCode && (
        <Tag type={schemeTagType as any} size="md">
          {schemeLabel}
        </Tag>
      )}
    </div>
  );

  const BackLink = (
    <div className={styles.stepBackRow}>
      <Button kind="ghost" size="sm" onClick={onBack} renderIcon={ArrowLeft}>
        {t('backToBillDetails', 'Back to bill details')}
      </Button>
    </div>
  );

  const ErrorNotification = shaError ? (
    <div className={styles.inlineErrorRow}>
      <InlineNotification
        kind="error"
        lowContrast
        title={t('shaError', 'SHA error')}
        subtitle={shaError}
        onCloseButtonClick={onClearError}
      />
    </div>
  ) : null;

  if (!patientCRId) {
    return (
      <section>
        {BackLink}
        {ErrorNotification}
        {TitleRow}
        <InlineNotification
          kind="warning"
          lowContrast
          title={t('noCRNumber', 'No SHA CR number')}
          subtitle={t(
            'patientHasNoCRNumber',
            'This patient does not have a SHA CR number. Intervention cannot be added.',
          )}
        />
      </section>
    );
  }

  const renderPreauthTypeTag = (preauthType?: string | null) => {
    const type = (preauthType ?? '').toUpperCase();
    if (!type || type === 'NONE' || type === 'NORMAL') {
      return null;
    }
    return (
      <Tag type={PREAUTH_TYPE_COLORS[type] ?? 'gray'} size="lg" className={styles.tag}>
        {t('preauthTypeTag', '{{type}} preauth', { type })}
      </Tag>
    );
  };

  const renderInterventionPreview = () => {
    if (shaMode === 'RETIRE') {
      if (!selectedRetireIntervention) {
        return null;
      }
      const name = selectedRetireIntervention.intervention_name ?? selectedRetireIntervention.intervention_code;
      return (
        <Tag type="red" size="lg" className={styles.tag}>
          {name}: {t('willRetire', 'Will be retired (can be restored later)')}
        </Tag>
      );
    }

    if (shaMode === 'RESTORE') {
      if (!selectedRestoreIntervention) {
        return null;
      }
      const name = selectedRestoreIntervention.intervention_name ?? selectedRestoreIntervention.intervention_code;
      const isCapitation = (selectedRestoreIntervention.payment_mechanism ?? '').toUpperCase() === 'CAPITATION';
      const needsPreauth = Boolean(selectedRestoreIntervention.needs_preauth);
      if (isCapitation) {
        return (
          <Tag type="teal" size="lg" className={styles.tag}>
            {name}: {t('capitation', 'Capitation (PHC)')}
          </Tag>
        );
      }
      return (
        <>
          <Tag type={needsPreauth ? 'red' : 'green'} size="lg" className={styles.tag}>
            {name}: {t('willRestore', 'Will be restored to active')}
          </Tag>
          {needsPreauth && renderPreauthTypeTag((selectedRestoreIntervention as any).preauth_type)}
        </>
      );
    }

    if (!selectedIntervention) {
      return null;
    }
    const name = selectedIntervention.name;
    const isCapitation = selectedIntervention.payment_mechanism?.toUpperCase() === 'CAPITATION';
    const needsPreauth = Boolean((selectedIntervention as any).needs_preauth);
    const isElective = Boolean((selectedIntervention as any).needs_manual_preauth_approval);

    if (isElective) {
      return (
        <>
          <Tag type="purple" size="lg" className={styles.tag}>
            {name}: {t('PreauthillQueue', 'Preauth will be raised for SHA approval')}
          </Tag>
          {renderPreauthTypeTag((selectedIntervention as any).preauth_type)}
        </>
      );
    }
    if (isCapitation) {
      return (
        <Tag type="teal" size="lg" className={styles.tag}>
          {name}: {t('capitation', 'Capitation (PHC)')}
        </Tag>
      );
    }
    return (
      <>
        <Tag type={needsPreauth ? 'red' : 'green'} size="lg" className={styles.tag}>
          {name}: {needsPreauth ? t('preauthRequired', 'Preauth required') : t('noPreauthNeeded', 'No preauth needed')}
        </Tag>
        {needsPreauth && renderPreauthTypeTag((selectedIntervention as any).preauth_type)}
      </>
    );
  };

  const resetForMode = (next: ShaMode) => {
    setValue('packageCode', null);
    setValue('interventionCode', null);
    setValue('fromInterventionCode', null);
    setValue('restoreInterventionCode', null);
    setValue('retireInterventionCode', null);
    setValue('interventionPayload', null);
    onClearError();
  };

  return (
    <section>
      {BackLink}
      {ErrorNotification}
      {TitleRow}
      <p className={styles.sectionHelper}>
        {shaMode === 'ADD' &&
          t('shaAddHelper', 'Choose a SHA benefit package and intervention to attach to this claim.')}
        {shaMode === 'SWITCH' &&
          t(
            'shaSwitchHelper',
            'Retire an ACTIVE intervention and replace it with a new one. The retired intervention can be restored later.',
          )}
        {shaMode === 'RESTORE' &&
          t('shaRestoreHelper', 'Bring a previously-retired (INACTIVE) intervention back to ACTIVE on this claim.')}
        {shaMode === 'RETIRE' &&
          t(
            'shaRetireHelper',
            'Deactivate an ACTIVE intervention on this claim. It can be restored later. A claim must keep at least one active intervention.',
          )}
      </p>

      <Stack gap={4}>
        <Controller
          control={control}
          name="shaMode"
          render={({ field }) => {
            const modes: ShaMode[] = ['ADD', 'SWITCH', 'RESTORE', 'RETIRE'];
            const idx = Math.max(0, modes.indexOf(field.value as ShaMode));
            return (
              <ContentSwitcher
                size="sm"
                className={styles.switcher}
                selectedIndex={idx}
                onChange={({ index }) => {
                  const next: ShaMode = modes[index] ?? 'ADD';
                  field.onChange(next);
                  resetForMode(next);
                }}>
                <Switch name="ADD" text={t('add', 'Add')} />
                <Switch name="SWITCH" text={t('switch', 'Switch')} disabled={!hasSwitchable} />
                <Switch name="RESTORE" text={t('restore', 'Restore')} disabled={!hasRestorable} />
                <Switch name="RETIRE" text={t('retire', 'Retire')} disabled={!hasRetirable} />
              </ContentSwitcher>
            );
          }}
        />

        {shaMode === 'SWITCH' && (
          <Column>
            <Controller
              control={control}
              name="fromInterventionCode"
              render={({ field }) => {
                const selectedItem = switchableFromItems.find((i: any) => i.code === field.value) ?? null;
                return (
                  <ComboBox
                    ref={field.ref}
                    id="sha-bill-from-intervention"
                    titleText={t('switchFrom', 'Switch from (will be retired)')}
                    placeholder={t('chooseActiveIntervention', 'Choose currently-active intervention')}
                    items={switchableFromItems}
                    itemToString={(i: any) => (i ? i.text : '')}
                    selectedItem={selectedItem}
                    onChange={({ selectedItem }) => {
                      field.onChange(selectedItem ? selectedItem.code : null);
                      onClearError();
                    }}
                    invalid={!!errors.fromInterventionCode}
                    invalidText={errors.fromInterventionCode?.message}
                  />
                );
              }}
            />
          </Column>
        )}

        {shaMode === 'RESTORE' && (
          <Column>
            <Controller
              control={control}
              name="restoreInterventionCode"
              render={({ field }) => {
                const selectedItem = restorableItems.find((i: any) => i.code === field.value) ?? null;
                return (
                  <ComboBox
                    ref={field.ref}
                    id="sha-bill-restore-intervention"
                    titleText={t('restoreWhich', 'Restore which intervention')}
                    placeholder={t('chooseInactiveIntervention', 'Choose a previously-retired intervention')}
                    items={restorableItems}
                    itemToString={(i: any) => (i ? i.text : '')}
                    selectedItem={selectedItem}
                    onChange={({ selectedItem }) => {
                      field.onChange(selectedItem ? selectedItem.code : null);
                      onClearError();
                    }}
                    invalid={!!errors.restoreInterventionCode}
                    invalidText={errors.restoreInterventionCode?.message}
                  />
                );
              }}
            />
          </Column>
        )}

        {shaMode === 'RETIRE' && (
          <Column>
            <Controller
              control={control}
              name="retireInterventionCode"
              render={({ field }) => {
                const selectedItem = switchableFromItems.find((i: any) => i.code === field.value) ?? null;
                return (
                  <ComboBox
                    ref={field.ref}
                    id="sha-bill-retire-intervention"
                    titleText={t('retireWhich', 'Retire which intervention')}
                    placeholder={t('chooseActiveIntervention', 'Choose currently-active intervention')}
                    items={switchableFromItems}
                    itemToString={(i: any) => (i ? i.text : '')}
                    selectedItem={selectedItem}
                    onChange={({ selectedItem }) => {
                      field.onChange(selectedItem ? selectedItem.code : null);
                      onClearError();
                    }}
                    invalid={!!errors.retireInterventionCode}
                    invalidText={errors.retireInterventionCode?.message}
                  />
                );
              }}
            />
          </Column>
        )}

        {(shaMode === 'ADD' || shaMode === 'SWITCH') && (
          <Column>
            {loadingSubBenefits ? (
              <InlineLoading description={t('loadingSHABenefits', 'Loading SHA benefits...')} />
            ) : subBenefitsError ? (
              <InlineNotification
                kind="error"
                lowContrast
                title={t('errorLoadingBenefits', 'Error loading SHA benefits')}
                subtitle={subBenefitsError?.message}
              />
            ) : (
              <Controller
                control={control}
                name="packageCode"
                render={({ field }) => {
                  const selectedItem = packageItems.find((p) => p.code === field.value) ?? null;
                  return (
                    <ComboBox
                      ref={field.ref}
                      id="sha-bill-package"
                      titleText={
                        shaMode === 'SWITCH' ? t('switchToPackage', 'Switch to — Package') : t('package', 'Package')
                      }
                      placeholder={t('choosePackage', 'Choose package')}
                      items={packageItems}
                      itemToString={(item: PackageItem | null) => (item ? item.label : '')}
                      selectedItem={selectedItem}
                      onChange={({ selectedItem }) => {
                        field.onChange(selectedItem ? selectedItem.code : null);
                        setValue('interventionCode', null);
                        setValue('interventionPayload', null);
                        onClearError();
                      }}
                      shouldFilterItem={({ item, inputValue }: any) => {
                        if (!inputValue || !item) {
                          return true;
                        }
                        return item.label.toLowerCase().includes(inputValue.toLowerCase());
                      }}
                      invalid={!!errors.packageCode}
                      invalidText={errors.packageCode?.message}
                    />
                  );
                }}
              />
            )}
          </Column>
        )}

        {(shaMode === 'ADD' || shaMode === 'SWITCH') && packageCode && (
          <Column>
            {loadingInterventions ? (
              <InlineLoading description={t('loadingInterventions', 'Loading interventions...')} />
            ) : interventionsError ? (
              <InlineNotification
                kind="error"
                lowContrast
                title={t('errorLoadingInterventions', 'Error loading interventions')}
                subtitle={interventionsError?.message}
              />
            ) : (
              <Controller
                control={control}
                name="interventionCode"
                render={({ field }) => {
                  const selectedItem = targetInterventionItems.find((i: any) => i.code === field.value) ?? null;
                  return (
                    <ComboBox
                      ref={field.ref}
                      id="sha-bill-intervention"
                      titleText={
                        shaMode === 'SWITCH'
                          ? t('switchToIntervention', 'Switch to — Intervention')
                          : t('intervention', 'Intervention')
                      }
                      placeholder={t('chooseIntervention', 'Choose an intervention')}
                      items={targetInterventionItems}
                      itemToString={(i: any) => (i ? i.text : '')}
                      selectedItem={selectedItem}
                      onChange={({ selectedItem }) => {
                        if (selectedItem && !selectedItem.disabled) {
                          field.onChange(selectedItem.code);
                          const fullObj = interventions.find((i) => i.code === selectedItem.code);
                          setValue('interventionPayload', fullObj ?? null);
                        } else if (!selectedItem) {
                          field.onChange(null);
                          setValue('interventionPayload', null);
                        }
                        onClearError();
                      }}
                      shouldFilterItem={({ item, inputValue }: any) => {
                        if (!inputValue || !item) {
                          return true;
                        }
                        return item.text.toLowerCase().includes(inputValue.toLowerCase());
                      }}
                      invalid={!!errors.interventionCode}
                      invalidText={errors.interventionCode?.message}
                    />
                  );
                }}
              />
            )}
          </Column>
        )}

        {((shaMode !== 'RESTORE' && shaMode !== 'RETIRE' && interventionCode && selectedIntervention) ||
          (shaMode === 'RESTORE' && restoreInterventionCode && selectedRestoreIntervention) ||
          (shaMode === 'RETIRE' && retireInterventionCode && selectedRetireIntervention)) && (
          <Column>
            <div className={styles.tagRow}>{renderInterventionPreview()}</div>
          </Column>
        )}

        {shaMode !== 'RESTORE' && isSelectedElective && (
          <Column>
            <InlineNotification
              kind="info"
              lowContrast
              hideCloseButton
              aria-label={t('ivIntervention', 'Intervention')}
              title={t('ivIntervention', 'Intervention')}
              subtitle={t(
                'electiveInterventionSubtitle',
                'This intervention require SHA approval. Saving will raise a preauth — track it in the Preauth Queue before services are claimable.',
              )}
            />
          </Column>
        )}

        {shaMode === 'SWITCH' && (
          <Column>
            <Controller
              control={control}
              name="keepBilledLines"
              render={({ field }) => (
                <Checkbox
                  id="keep-billed-lines"
                  labelText={t(
                    'keepBilledLinesHelper',
                    'Keep existing billed lines on the retired intervention (will still bill alongside the new one)',
                  )}
                  checked={field.value}
                  onChange={(_, { checked }) => field.onChange(checked)}
                />
              )}
            />
          </Column>
        )}

        {focusedCode && !loadingUtilization && isCoverageExhausted && (
          <Column>
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              aria-label={t('coverageExhausted', 'Coverage exhausted')}
              title={t('cannotProceed', 'Cannot proceed')}
              subtitle={
                utilization?.message ??
                t(
                  'coverageExhaustedSubtitle',
                  'The coverage limit for this intervention has been exhausted. Choose another intervention to proceed.',
                )
              }
            />
          </Column>
        )}
      </Stack>
    </section>
  );
};

const CreateBillWorkspace: React.FC<Workspace2DefinitionProps<CreateBillWorkspaceProps, {}, {}>> = ({
  closeWorkspace,
  workspaceProps: { patientUuid, order, medicationRequestBundle },
}) => {
  const { t } = useTranslation();
  const { format: formatCurrency } = useCurrencyFormatting();
  const defaultPaymentStatus = 'PENDING';
  const isTablet = useLayoutType() === 'tablet';
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [step, setStep] = useState(0);
  const [shaError, setShaError] = useState<string | null>(null);

  const {
    cashPointUuid,
    cashierUuid,
    visitAttributeTypes: { insuranceScheme, claimScheme },
    crIdentificationNumberUUID,
  } = useConfig<BillingConfig>();

  const { activeVisit } = useVisit(patientUuid);
  const visitUuid = activeVisit?.uuid;

  const { facilityLevel } = useFacilityRegistry();
  // Level 2 facilities are outpatient-only dispensaries — their SHA intervention is fixed at
  // check-in (see billing-checkin-form.component.tsx), so there's nothing to add/switch/restore here.
  const isLevel2Facility = facilityLevel === '2';

  const { patient: fhirPatient } = usePatient(patientUuid);
  const patientCRId = useMemo(() => {
    if (!fhirPatient?.identifier) {
      return null;
    }
    const byType = fhirPatient.identifier.find((id: fhir.Identifier) =>
      id?.type?.coding?.some((c) => c.code === crIdentificationNumberUUID),
    );
    if (byType?.value) {
      return byType.value;
    }
    const byPrefix = fhirPatient.identifier.find((id: fhir.Identifier) => id?.value?.startsWith('CR'));
    return byPrefix?.value ?? null;
  }, [fhirPatient, crIdentificationNumberUUID]);

  const drugUuid = order?.drug?.uuid;
  const { billableItem, isLoading } = useBillableItem(order?.concept?.uuid ?? order?.drug?.concept?.uuid, drugUuid);

  const { isSHA: isSHAVisit } = useVisitAttribute(visitUuid ?? '', insuranceScheme);
  const { claimSchemeCode } = useVisitAttribute(visitUuid ?? '', claimScheme);

  const claimForVisit = useClaimForVisit(visitUuid ?? '');
  const authorizationCode = claimForVisit?.authorizationCode ?? null;
  const currentInterventions = ((claimForVisit as any)?.interventions ?? []) as Array<any>;

  const activeCodes = useMemo(
    () =>
      new Set<string>(
        currentInterventions
          .filter((iv: any) => (iv?.status ?? '').toUpperCase() === 'ACTIVE')
          .map((iv: any) => iv.intervention_code),
      ),
    [currentInterventions],
  );
  const attachedCodes = useMemo(
    () => new Set<string>(currentInterventions.map((iv: any) => iv.intervention_code)),
    [currentInterventions],
  );
  const inactiveCodes = useMemo(
    () => new Set<string>([...attachedCodes].filter((c) => !activeCodes.has(c))),
    [attachedCodes, activeCodes],
  );

  const comboBoxItems =
    billableItem?.servicePrices?.map((item) => ({
      id: item.uuid,
      text: `${item.paymentMode.name} - ${formatCurrency(item.price)}`,
      unitPrice: item.price,
    })) ?? [];

  const createBillForm = useForm<CreateBillFormSchema>({
    defaultValues: {
      id: '',
      text: '',
      unitPrice: '0',
      quantity: medicationRequestBundle?.request?.dispenseRequest?.quantity?.value ?? 1,
      needsShaAction: true,
      shaMode: 'ADD',
      packageCode: null,
      interventionCode: null,
      fromInterventionCode: null,
      restoreInterventionCode: null,
      retireInterventionCode: null,
      keepBilledLines: true,
      interventionPayload: null,
    },
  });

  const {
    handleSubmit,
    formState: { isValid, isDirty, isSubmitting, errors },
    watch,
    setValue,
    control,
    trigger,
  } = createBillForm;

  const needsShaAction = watch('needsShaAction') ?? true;
  const shaMode = (watch('shaMode') as ShaMode) ?? 'ADD';
  const interventionCode = watch('interventionCode') ?? null;
  const fromInterventionCode = watch('fromInterventionCode') ?? null;
  const restoreInterventionCode = watch('restoreInterventionCode') ?? null;
  const retireInterventionCode = watch('retireInterventionCode') ?? null;

  const shaStepActive = isSHAVisit && needsShaAction && !isLevel2Facility;

  const [isCoverageExhausted, setIsCoverageExhausted] = useState(false);

  useEffect(() => {
    if (!isSHAVisit) {
      setIsCoverageExhausted(false);
      setStep(0);
    }
  }, [isSHAVisit]);

  useEffect(() => {
    if (!needsShaAction) {
      setStep(0);
      setIsCoverageExhausted(false);
      setShaError(null);
    }
  }, [needsShaAction]);

  useEffect(() => {
    if (isLevel2Facility) {
      setValue('needsShaAction', false);
    }
  }, [isLevel2Facility, setValue]);

  const calculateTotal = () => {
    const price = parseFloat(watch('unitPrice')) || 0;
    const quantity = watch('quantity') || 1;
    return price * quantity;
  };

  const goToShaStep = async () => {
    const ok = await trigger(['unitPrice', 'quantity', 'id', 'text']);
    if (ok) {
      setShaError(null);
      setStep(1);
    }
  };

  const goBackToBillDetails = () => {
    setShaError(null);
    setStep(0);
  };

  const canSubmitShaStep = (() => {
    if (isCoverageExhausted) {
      return false;
    }

    if (shaMode === 'ADD') {
      if (!interventionCode) {
        return false;
      }
      if (attachedCodes.has(interventionCode)) {
        return false;
      }
      return true;
    }
    if (shaMode === 'SWITCH') {
      if (!fromInterventionCode || !interventionCode) {
        return false;
      }
      if (attachedCodes.has(interventionCode)) {
        return false;
      }
      if (!activeCodes.has(fromInterventionCode)) {
        return false;
      }
      return true;
    }
    if (shaMode === 'RESTORE') {
      if (!restoreInterventionCode) {
        return false;
      }
      if (!inactiveCodes.has(restoreInterventionCode)) {
        return false;
      }
      return true;
    }
    if (shaMode === 'RETIRE') {
      if (!retireInterventionCode) {
        return false;
      }
      if (!activeCodes.has(retireInterventionCode)) {
        return false;
      }
      // The claim must keep at least one active intervention.
      if (activeCodes.size <= 1) {
        return false;
      }
      return true;
    }
    return false;
  })();

  const handleCreateBill = async (formData: CreateBillFormSchema) => {
    setShaError(null);

    const doShaAction = isSHAVisit && formData.needsShaAction;

    if (doShaAction && !authorizationCode) {
      setShaError(t('noClaimForVisit', 'No active SHA claim was found for this visit. Verify check-in was completed.'));
      return;
    }

    if (doShaAction) {
      if (formData.shaMode === 'ADD') {
        if (!formData.interventionCode) {
          setShaError(t('selectInterventionFirst', 'Please select a SHA intervention before saving the bill.'));
          return;
        }
        if (activeCodes.has(formData.interventionCode)) {
          setShaError(t('cannotAddActiveDuplicate', 'This intervention is already attached and active on the claim.'));
          return;
        }
        if (inactiveCodes.has(formData.interventionCode)) {
          setShaError(
            t(
              'cannotAddInactiveDuplicate',
              'This intervention was previously on the claim. Use Restore to bring it back SHA does not allow re-adding.',
            ),
          );
          return;
        }
      } else if (formData.shaMode === 'SWITCH') {
        if (!formData.fromInterventionCode || !formData.interventionCode) {
          setShaError(
            t('switchRequiresBoth', 'A switch needs both the current intervention and the replacement intervention.'),
          );
          return;
        }
        if (attachedCodes.has(formData.interventionCode)) {
          setShaError(
            t(
              'cannotSwitchToAttached',
              'The target intervention is already on the claim. Use Restore if it is inactive, or pick a different one.',
            ),
          );
          return;
        }
      } else if (formData.shaMode === 'RESTORE') {
        if (!formData.restoreInterventionCode) {
          setShaError(t('selectInterventionToRestore', 'Please select the intervention you want to restore.'));
          return;
        }
        if (!inactiveCodes.has(formData.restoreInterventionCode)) {
          setShaError(
            t(
              'restoreOnlyInactive',
              'Only previously-retired interventions can be restored. The selection is invalid.',
            ),
          );
          return;
        }
      } else if (formData.shaMode === 'RETIRE') {
        if (!formData.retireInterventionCode) {
          setShaError(t('selectInterventionToRetire', 'Please select the intervention you want to retire.'));
          return;
        }
        if (!activeCodes.has(formData.retireInterventionCode)) {
          setShaError(t('retireOnlyActive', 'Only active interventions can be retired. The selection is invalid.'));
          return;
        }
        if (activeCodes.size <= 1) {
          setShaError(
            t(
              'cannotRetireLastIntervention',
              'A claim must keep at least one active intervention. Use Switch to replace it, or close the claim.',
            ),
          );
          return;
        }
      }

      if (isCoverageExhausted) {
        setShaError(
          t('cannotSaveBillCoverageExhausted', 'The selected intervention has exhausted its coverage limit.'),
        );
        return;
      }
    }

    if (doShaAction && authorizationCode) {
      try {
        if (formData.shaMode === 'ADD' && formData.interventionCode) {
          const newInterventionPayload = (formData as any).interventionPayload ?? undefined;
          const res = await addInterventionToVisit(
            authorizationCode,
            formData.interventionCode,
            newInterventionPayload,
          );
          if (res?.success === false) {
            throw res;
          }
        } else if (formData.shaMode === 'SWITCH' && formData.fromInterventionCode && formData.interventionCode) {
          const newInterventionPayload = (formData as any).interventionPayload ?? undefined;
          const res = await switchInterventionOnVisit(
            authorizationCode,
            formData.fromInterventionCode,
            formData.interventionCode,
            formData.keepBilledLines,
            newInterventionPayload,
          );
          if (res?.success === false) {
            throw res;
          }
        } else if (formData.shaMode === 'RESTORE' && formData.restoreInterventionCode) {
          const res = await restoreInterventionOnVisit(authorizationCode, formData.restoreInterventionCode);
          if (res?.success === false) {
            throw res;
          }
        } else if (formData.shaMode === 'RETIRE' && formData.retireInterventionCode) {
          const res = await retireInterventionOnVisit(authorizationCode, formData.retireInterventionCode);
          if (res?.success === false) {
            throw res;
          }
        }
      } catch (interventionError) {
        const fallback =
          formData.shaMode === 'SWITCH'
            ? t('couldNotSwitch', 'Could not switch intervention.')
            : formData.shaMode === 'RESTORE'
            ? t('couldNotRestore', 'Could not restore intervention.')
            : formData.shaMode === 'RETIRE'
            ? t('couldNotRetire', 'Could not retire intervention.')
            : t('couldNotAdd', 'Could not add intervention.');
        const message = extractFetchError(interventionError, fallback);
        setShaError(message);
        showSnackbar({
          title:
            formData.shaMode === 'SWITCH'
              ? t('switchFailed', 'Switch failed — bill not saved')
              : formData.shaMode === 'RESTORE'
              ? t('restoreFailed', 'Restore failed — bill not saved')
              : formData.shaMode === 'RETIRE'
              ? t('retireFailed', 'Retire failed — bill not saved')
              : t('addFailed', 'Add failed — bill not saved'),
          subtitle: message,
          kind: 'error',
          timeoutInMs: 6000,
        });
        return;
      }
    }

    const unitPrice = parseFloat(formData.unitPrice);
    const createBillPayload = {
      cashPoint: cashPointUuid,
      cashier: cashierUuid,
      patient: patientUuid,
      status: 'PENDING',
      lineItems: [
        {
          billableService: billableItem?.uuid,
          lineItemOrder: 0,
          quantity: formData.quantity,
          price: unitPrice,
          paymentStatus: defaultPaymentStatus,
          priceUuid: formData.id,
          priceName: formData.text,
          order: order.uuid,
        },
      ],
      payments: [],
    };

    try {
      await processBillItems(createBillPayload);
      const wasElective = Boolean((formData as any).interventionPayload?.needs_manual_preauth_approval);
      const successTitle = doShaAction
        ? formData.shaMode === 'SWITCH'
          ? t('switchedAndBilled', 'Switched & bill saved')
          : formData.shaMode === 'RESTORE'
          ? t('restoredAndBilled', 'Restored & bill saved')
          : t('addedAndBilled', 'Intervention added & bill saved')
        : t('billItems', 'Bill saved');
      showSnackbar({
        title: successTitle,
        subtitle: wasElective
          ? t(
              'billProcessingSuccessIntervention',
              'Bill saved. The intervention is pending SHA approval — track it in the Preauth Queue.',
            )
          : t('billProcessingSuccess', 'Bill processing has been successful'),
        kind: 'success',
        timeoutInMs: wasElective ? 6000 : 3000,
      });
      mutate((key) => typeof key === 'string' && key.startsWith(`${restBaseUrl}/cashier/bill`), undefined, {
        revalidate: true,
      });
      closeWorkspace({ discardUnsavedChanges: true });
    } catch (error) {
      const message = extractFetchError(error, t('unknownError', 'Unknown error occurred'));
      setShaError(
        doShaAction
          ? t(
              'shaSucceededBillFailed',
              'The SHA operation succeeded, but saving the bill line failed: {{msg}}. Retry the bill — do NOT re-do the SHA operation.',
              { msg: message },
            )
          : message,
      );
      showSnackbar({
        title: t('billProcessingError', 'Bill processing error'),
        subtitle: message,
        kind: 'error',
        timeoutInMs: 10000,
      });
    }
  };

  useEffect(() => {
    if (isDirty) {
      setHasUnsavedChanges(true);
    }
  }, [isDirty, setHasUnsavedChanges]);

  if (isLoading) {
    return (
      <Workspace2
        hasUnsavedChanges={hasUnsavedChanges}
        title={t('createBillForOrder', 'Create bill for order {{order}}', {
          order: order?.concept?.display ?? order?.drug?.display,
        })}>
        <InlineLoading description={t('loadingBillableItems', 'Loading billable items...')} />
      </Workspace2>
    );
  }

  const commonFormProps = {
    billableItem,
    createBillForm,
    errors,
    calculateTotal,
    comboBoxItems,
  };
  const unitPriceSelected = Boolean(watch('id') && watch('text') && parseFloat(watch('unitPrice')) > 0);

  const submitDisabled =
    !isValid ||
    !isDirty ||
    isSubmitting ||
    (!shaStepActive && !unitPriceSelected) ||
    (shaStepActive && !canSubmitShaStep);

  const submitLabel =
    shaStepActive && shaMode === 'SWITCH'
      ? t('saveAndSwitch', 'Save & switch')
      : shaStepActive && shaMode === 'RESTORE'
      ? t('saveAndRestore', 'Save & restore')
      : t('saveAndClose', 'Save & close');

  return (
    <Workspace2
      hasUnsavedChanges={hasUnsavedChanges}
      title={t('createBillForOrders', 'Bill for {{order}}', {
        order: order?.concept?.display ?? order?.drug?.display,
      })}>
      <form
        className={styles.form}
        onSubmit={handleSubmit(handleCreateBill, (formErrors) => console.error('errors', formErrors))}>
        <div className={styles.formContainer}>
          {shaStepActive && (
            <ResponsiveWrapper>
              <ProgressIndicator currentIndex={step} spaceEqually>
                <ProgressStep label={t('step1BillDetails', 'Bill details')} />
                <ProgressStep label={t('step2SHAIntervention', 'SHA intervention')} />
              </ProgressIndicator>
            </ResponsiveWrapper>
          )}

          {(!shaStepActive || step === 0) && (
            <ResponsiveWrapper>
              <InlineNotification
                aria-label="closes notification"
                kind="info"
                lowContrast
                statusIconDescription="notification"
                subtitle={t(
                  'createBillForOrder',
                  'Create bill for order {{order}} by selecting the correct unit price',
                  { order: order?.concept?.display ?? order?.drug?.display },
                )}
                title={t('orderBillCreation', 'Order Bill Creation {{orderNumber}}', {
                  orderNumber: order.orderNumber,
                })}
              />
              <section>
                <h5 className={styles.sectionTitle}>{t('billDetails', 'Bill Details')}</h5>
                {medicationRequestBundle ? (
                  <MedicationBillForm {...commonFormProps} medicationRequestBundle={medicationRequestBundle} />
                ) : (
                  <StandardBillForm {...commonFormProps} />
                )}
              </section>

              {isSHAVisit && !isLevel2Facility && (
                <section className={styles.shaActionPrompt}>
                  <Section level={5}>
                    <Heading>{t('shaActionPrompt', 'SHA Action')}</Heading>
                  </Section>
                  <Controller
                    control={control}
                    name="needsShaAction"
                    render={({ field }) => (
                      <RadioButtonGroup
                        legendText={t(
                          'needShaActionQuestion',
                          'Do you need to add, switch, or restore a SHA intervention?',
                        )}
                        name="needs-sha-action"
                        orientation="horizontal"
                        valueSelected={field.value ? 'yes' : 'no'}
                        onChange={(value) => field.onChange(value === 'yes')}>
                        <RadioButton id="sha-action-yes" labelText={t('yes', 'Yes')} value="yes" />
                        <RadioButton id="sha-action-no" labelText={t('no', 'No')} value="no" />
                      </RadioButtonGroup>
                    )}
                  />
                </section>
              )}
            </ResponsiveWrapper>
          )}

          {shaStepActive && step === 1 && (
            <ResponsiveWrapper>
              <SHAStep
                patientCRId={patientCRId}
                patientUuid={patientUuid}
                visitUuid={visitUuid ?? ''}
                control={control}
                errors={errors}
                setValue={setValue}
                watch={watch}
                schemeCode={claimSchemeCode}
                activeCodes={activeCodes}
                inactiveCodes={inactiveCodes}
                currentInterventions={currentInterventions}
                onUtilizationStatusChange={setIsCoverageExhausted}
                onBack={goBackToBillDetails}
                shaError={shaError}
                onClearError={() => setShaError(null)}
              />
            </ResponsiveWrapper>
          )}
        </div>

        <ButtonSet className={classNames({ [styles.tablet]: isTablet, [styles.desktop]: !isTablet })}>
          <Button className={styles.button} kind="secondary" onClick={() => closeWorkspace()}>
            {t('cancel', 'Cancel')}
          </Button>
          {shaStepActive && step === 0 ? (
            <Button className={styles.button} kind="primary" disabled={!unitPriceSelected} onClick={goToShaStep}>
              {t('next', 'Next')}
            </Button>
          ) : (
            <Button className={styles.button} disabled={submitDisabled} kind="primary" type="submit">
              {isSubmitting ? (
                <InlineLoading className={styles.spinner} description={t('savingBill', 'Saving...')} />
              ) : shaStepActive && isCoverageExhausted ? (
                <span>{t('coverageExhausted', 'Coverage exhausted')}</span>
              ) : (
                <span>{submitLabel}</span>
              )}
            </Button>
          )}
        </ButtonSet>
      </form>
    </Workspace2>
  );
};

export default CreateBillWorkspace;
