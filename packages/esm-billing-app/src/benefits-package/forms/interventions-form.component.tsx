import { InlineLoading, InlineNotification, MultiSelect, Tag } from '@carbon/react';
import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import styles from './packages-and-interventions-form.scss';
import { useSHAInterventions } from '../../billing-form/social-health-authority/sha-virtual-claim.resource';
import { type SHAIntervention } from '../../billing-form/social-health-authority/type';
import { formatCurrency } from '../../helpers/currency';
import { InterventionItem } from '../../claims/claims-management/table/virtual-claim-preauth/type';

type PackageInterventionsProps = {
  patientCRId: string;
  subBenefitCode: string;
  patientUuid: string;
  selectedPackages: Array<string>;
};

const PackageInterventions: React.FC<PackageInterventionsProps> = ({
  patientCRId,
  subBenefitCode,
  selectedPackages,
}) => {
  const { t } = useTranslation();
  const form = useFormContext<{ packages: Array<string>; interventions: Array<string> }>();
  const selectedInterventionsObservable = form.watch('interventions') ?? [];

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

  const items: Array<InterventionItem> = useMemo(() => {
    const base = interventions.length > 0 ? interventions : Object.values(cachedInterventions);

    const additionalInterventions = selectedInterventionsObservable.reduce((prev, curr) => {
      const contained = base.some((i) => i.code === curr);
      if (!contained && cachedInterventions[curr]) {
        prev.push(cachedInterventions[curr]);
      }
      return prev;
    }, [] as Array<SHAIntervention>);

    const combined = [...base, ...additionalInterventions];

    const built: Array<InterventionItem> = combined.map((intervention) => {
      const isElective = Boolean((intervention as any).needs_manual_preauth_approval);
      const tariff = intervention.tariff ? ` · ${formatCurrency(Number(intervention.tariff))}` : '';

      let suffix: string;
      if (isElective) {
        suffix = ` — ${t('scheduledOnly', 'Scheduled only')}`;
      } else if (intervention.needs_preauth) {
        suffix = ` — ${t('preauthRequired', 'Preauth required')}`;
      } else {
        suffix = ` — ${t('noPreauthNeeded', 'No preauth')}`;
      }

      return {
        id: `intervention-${intervention.code}`,
        code: intervention.code,
        text: `${intervention.name}${tariff}${suffix}`,
        disabled: isElective,
        isElective,
      };
    });

    return built.sort((a, b) => Number(a.isElective) - Number(b.isElective));
  }, [interventions, cachedInterventions, selectedInterventionsObservable, t]);

  const electiveCount = useMemo(() => items.filter((i) => i.isElective).length, [items]);

  const selectedInterventionDetails = useMemo(
    () =>
      selectedInterventionsObservable.map((code) => {
        const intervention = cachedInterventions[code];
        return {
          code,
          name: intervention?.name ?? code,
          applicableDocumentTypes: intervention?.applicable_document_types ?? [],
        };
      }),
    [selectedInterventionsObservable, cachedInterventions],
  );

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
          const selectedItemObjects = items.filter((item) => (field.value ?? []).includes(item.code));

          return (
            <MultiSelect
              ref={field.ref}
              id="sha-interventions"
              disabled={!subBenefitCode || selectedPackages.length === 0}
              titleText={t('interventions', 'Interventions')}
              label={t('chooseInterventions', 'Choose interventions')}
              items={items}
              helperText={
                electiveCount > 0
                  ? t('electiveInterventionsHint', 'Items disable require SHA pre-approval via the Preauth Queue.')
                  : undefined
              }
              itemToString={(item: InterventionItem | null) => (item ? item.text : '')}
              selectedItems={selectedItemObjects}
              onChange={({ selectedItems }) => {
                const codes = (selectedItems ?? [])
                  .filter((item): item is InterventionItem => item !== null && !item.disabled)
                  .map((item) => item.code);
                field.onChange(codes);
              }}
              selectionFeedback="top-after-reopen"
              invalid={!!form.formState.errors[field.name]?.message}
              invalidText={form.formState.errors[field.name]?.message}
            />
          );
        }}
      />
      {selectedInterventionsObservable.length > 0 && (
        <>
          <div className={styles.tagsContainer}>
            {selectedInterventionsObservable.map((code) => {
              const intervention = cachedInterventions[code];
              const name = intervention?.name ?? code;
              const needsPreauth = intervention?.needs_preauth ?? false;
              const tariff = intervention?.tariff ? ` - ${formatCurrency(Number(intervention.tariff))}` : '';

              return needsPreauth ? (
                <Tag key={code} type="red" size="lg" className={styles.tag}>
                  {name}
                  {tariff}: {t('preauthRequired', 'Preauth required')}
                </Tag>
              ) : (
                <Tag key={code} type="green" size="lg" className={styles.tag}>
                  {name}
                  {tariff}: {t('noPreauthNeeded', 'No preauth needed')}
                </Tag>
              );
            })}
          </div>

          <div className={styles.applicableDocsSection}>
            <p className={styles.sectionTitle}>{t('applicableDocuments', 'Applicable documents')}</p>
            {selectedInterventionDetails.map((intervention) => (
              <div key={intervention.code} className={styles.interventionDocsBlock}>
                <p className={styles.interventionDocsTitle}>{intervention.name}</p>
                {intervention.applicableDocumentTypes.length > 0 ? (
                  <div className={styles.docTagsContainer}>
                    {intervention.applicableDocumentTypes.map((docType) => (
                      <Tag key={`${intervention.code}-${docType}`} type="cool-gray" size="sm" className={styles.tag}>
                        {docType.replace(/_/g, ' ')}
                      </Tag>
                    ))}
                  </div>
                ) : (
                  <p className={styles.noDocsText}>{t('noApplicableDocuments', 'No applicable documents listed')}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PackageInterventions;
