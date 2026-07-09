import { ComboBox, InlineLoading, InlineNotification, Tag } from '@carbon/react';
import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import styles from './packages-and-interventions-form.scss';
import {
  useHasSupplementaryPompsCoverage,
  useNonPomsfUtilization,
  useSHAInterventions,
} from '../../billing-form/social-health-authority/sha-virtual-claim.resource';
import { type SHAIntervention } from '../../billing-form/social-health-authority/type';
import { formatCurrency } from '../../helpers/currency';
import { InterventionItem } from '../../claims/claims-management/table/virtual-claim-preauth/type';

type PackageInterventionsProps = {
  patientCRId: string;
  subBenefitCode: string;
  patientUuid: string;
  selectedPackages: string | null;
  showApplicableDocuments?: boolean;
  allowElectiveInterventions?: boolean;
  onInterventionsCached?: (cache: Record<string, SHAIntervention>) => void;
  onUtilizationStatusChange?: (isExhausted: boolean) => void;
};

const PackageInterventions: React.FC<PackageInterventionsProps> = ({
  patientCRId,
  subBenefitCode,
  patientUuid,
  selectedPackages,
  showApplicableDocuments,
  allowElectiveInterventions = false,
  onInterventionsCached,
  onUtilizationStatusChange,
}) => {
  const { t } = useTranslation();
  const form = useFormContext<{ packages: string | null; interventions: string | null }>();
  const selectedIntervention = form.watch('interventions') ?? null;

  const { interventions, isLoading, error } = useSHAInterventions(patientCRId, subBenefitCode);

  const [cachedInterventions, setCachedInterventions] = useState<Record<string, SHAIntervention>>({});

  useEffect(() => {
    if (interventions.length > 0) {
      setCachedInterventions((prev) => {
        const updated = { ...prev };
        interventions.forEach((i) => {
          updated[i.code] = i;
        });
        return updated;
      });
    }
  }, [interventions]);

  useEffect(() => {
    if (Object.keys(cachedInterventions).length > 0) {
      onInterventionsCached?.(cachedInterventions);
    }
  }, [cachedInterventions, onInterventionsCached]);

  const items: Array<InterventionItem> = useMemo(() => {
    const base = interventions.length > 0 ? interventions : Object.values(cachedInterventions);
    const extraFromCache: Array<SHAIntervention> =
      selectedIntervention &&
      !base.some((i) => i.code === selectedIntervention) &&
      cachedInterventions[selectedIntervention]
        ? [cachedInterventions[selectedIntervention]]
        : [];

    const combined = [...base, ...extraFromCache];

    const built: Array<InterventionItem> = combined.map((intervention) => {
      const isElective = Boolean((intervention as any).needs_manual_preauth_approval);
      const isCapitation = intervention.payment_mechanism?.toUpperCase() === 'CAPITATION';

      let suffix: string;
      if (isElective) {
        suffix = allowElectiveInterventions
          ? ` — ${t('electivePreauth', 'Elective — SHA approval required')}`
          : ` — ${t('scheduledOnly', 'Scheduled only')}`;
      } else if (isCapitation) {
        suffix = ` — ${t('capitation', 'Capitation (PHC)')}`;
      } else if (intervention.needs_preauth) {
        suffix = ` — ${t('preauthRequired', 'Preauth required')}`;
      } else {
        suffix = ` — ${t('noPreauthNeeded', 'No preauth')}`;
      }

      return {
        id: `intervention-${intervention.code}`,
        code: intervention.code,
        text: `${intervention.name}${suffix}`,
        disabled: isElective && !allowElectiveInterventions,
        isElective,
      };
    });

    return built.sort((a, b) => Number(a.isElective) - Number(b.isElective));
  }, [interventions, cachedInterventions, selectedIntervention, allowElectiveInterventions, t]);

  const disabledElectiveCount = useMemo(() => items.filter((i) => i.isElective && i.disabled).length, [items]);

  const selectedInterventionDetail = useMemo(() => {
    if (!selectedIntervention) {
      return null;
    }
    const intervention = cachedInterventions[selectedIntervention];
    return {
      code: selectedIntervention,
      name: intervention?.name ?? selectedIntervention,
      applicableDocumentTypes: intervention?.applicable_document_types ?? [],
      paymentMechanism: intervention?.payment_mechanism ?? '',
    };
  }, [selectedIntervention, cachedInterventions]);

  if (isLoading) {
    return (
      <InlineLoading
        className={styles.loader}
        status="active"
        iconDescription={t('loading', 'Loading')}
        description={t('loadingInterventions', 'Loading interventions…')}
      />
    );
  }

  if (error) {
    return (
      <InlineNotification
        aria-label={t('errorLoadingInterventions', 'Error loading interventions')}
        kind="error"
        lowContrast
        title={t('failure', 'Error loading interventions')}
        subtitle={error?.message}
      />
    );
  }

  return (
    <div className={styles.interventionsWrapper}>
      <p className={styles.sectionTitle}>{t('shaInterventions', 'SHA Interventions')}</p>

      <Controller
        control={form.control}
        name="interventions"
        render={({ field }) => {
          const selectedItem = items.find((item) => item.code === field.value) ?? null;

          return (
            <ComboBox
              ref={field.ref}
              id="sha-interventions"
              disabled={!subBenefitCode || !selectedPackages}
              titleText={t('interventions', 'Intervention')}
              placeholder={t('chooseIntervention', 'Choose an intervention')}
              items={items}
              helperText={
                disabledElectiveCount > 0
                  ? t('electiveInterventionsHint', 'Items disabled require SHA pre-approval via the Preauth Queue.')
                  : undefined
              }
              itemToString={(item: InterventionItem | null) => (item ? item.text : '')}
              selectedItem={selectedItem}
              onChange={({ selectedItem }) => {
                if (selectedItem && !selectedItem.disabled) {
                  field.onChange(selectedItem.code);
                } else if (!selectedItem) {
                  field.onChange(null);
                }
              }}
              shouldFilterItem={({
                item,
                inputValue,
              }: {
                item: InterventionItem | null;
                inputValue: string | null;
              }) => {
                if (!inputValue || !item) {
                  return true;
                }
                return item.text.toLowerCase().includes(inputValue.toLowerCase());
              }}
              invalid={!!form.formState.errors[field.name]?.message}
              invalidText={form.formState.errors[field.name]?.message}
            />
          );
        }}
      />

      {selectedIntervention && (
        <>
          <div className={styles.tagsContainer}>
            {(() => {
              const code = selectedIntervention;
              const intervention = cachedInterventions[code];
              const name = intervention?.name ?? code;
              const needsPreauth = intervention?.needs_preauth ?? false;
              const isCapitation = intervention?.payment_mechanism?.toUpperCase() === 'CAPITATION';
              const isElective = Boolean((intervention as any)?.needs_manual_preauth_approval);

              if (isElective) {
                return (
                  <Tag key={code} type="purple" size="lg" className={styles.tag}>
                    {name}: {t('electiveWillQueue', 'Elective — a preauth will be raised for SHA approval')}
                  </Tag>
                );
              }
              if (isCapitation) {
                return (
                  <Tag key={code} type="teal" size="lg" className={styles.tag}>
                    {name}: {t('capitation', 'Capitation (PHC)')}
                  </Tag>
                );
              }
              return needsPreauth ? (
                <Tag key={code} type="red" size="lg" className={styles.tag}>
                  {name} :{t('preauthRequired', 'Preauth required')}
                </Tag>
              ) : (
                <Tag key={code} type="green" size="lg" className={styles.tag}>
                  {name} :{t('noPreauthNeeded', 'No preauth needed')}
                </Tag>
              );
            })()}
          </div>

          <UtilizationGate
            patientCRId={patientCRId}
            patientUuid={patientUuid}
            interventionCode={selectedIntervention}
            interventionName={selectedInterventionDetail?.name ?? selectedIntervention}
            onStatusChange={onUtilizationStatusChange}
          />

          {showApplicableDocuments && selectedInterventionDetail && (
            <div className={styles.applicableDocsSection}>
              <p className={styles.sectionTitle}>{t('applicableDocuments', 'Applicable documents')}</p>
              <div key={selectedInterventionDetail.code} className={styles.interventionDocsBlock}>
                <p className={styles.interventionDocsTitle}>{selectedInterventionDetail.name}</p>
                {selectedInterventionDetail.applicableDocumentTypes.length > 0 ? (
                  <div className={styles.docTagsContainer}>
                    {selectedInterventionDetail.applicableDocumentTypes.map((docType) => (
                      <Tag
                        key={`${selectedInterventionDetail.code}-${docType}`}
                        type="cool-gray"
                        size="sm"
                        className={styles.tag}>
                        {docType.replace(/_/g, ' ')}
                      </Tag>
                    ))}
                  </div>
                ) : (
                  <p className={styles.noDocsText}>{t('noApplicableDocuments', 'No applicable documents listed')}</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
type UtilizationGateProps = {
  patientCRId: string;
  patientUuid: string;
  interventionCode: string;
  interventionName: string;
  onStatusChange?: (isExhausted: boolean) => void;
};

const UtilizationGate: React.FC<UtilizationGateProps> = ({
  patientCRId,
  patientUuid,
  interventionCode,
  interventionName,
  onStatusChange,
}) => {
  const { t } = useTranslation();
  const { hasSupplementaryCoverage, isLoading: isLoadingSupplementary } = useHasSupplementaryPompsCoverage(patientUuid);

  const shouldSkipUtilizationCheck = hasSupplementaryCoverage || isLoadingSupplementary;
  const effectivePatientId = shouldSkipUtilizationCheck ? '' : patientCRId;
  const { utilization, isLoading, error } = useNonPomsfUtilization(effectivePatientId, interventionCode);

  const isExhausted = !shouldSkipUtilizationCheck && utilization ? utilization.eligibility === false : false;

  useEffect(() => {
    if (shouldSkipUtilizationCheck) {
      onStatusChange?.(false);
      return;
    }
    if (!isLoading && !error && utilization) {
      onStatusChange?.(isExhausted);
    }
    return () => {
      onStatusChange?.(false);
    };
  }, [shouldSkipUtilizationCheck, isExhausted, isLoading, error, utilization?.intervention_code]);

  if (!isExhausted) {
    return null;
  }

  return (
    <InlineNotification
      kind="error"
      lowContrast
      hideCloseButton
      aria-label={t('coverageExhausted', 'Coverage exhausted')}
      title={t('cannotProceed', 'Cannot start visit')}
      subtitle={
        utilization?.message ??
        t(
          'coverageExhaustedSubtitle',
          'The coverage limit for {{name}} ({{code}}) has been exhausted. Remove this intervention or choose another to proceed.',
          { name: interventionName, code: interventionCode },
        )
      }
    />
  );
};

export default PackageInterventions;
