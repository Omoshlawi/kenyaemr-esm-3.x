import { InlineLoading, InlineNotification, MultiSelect, Tag } from '@carbon/react';
import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import styles from './packages-and-interventions-form.scss';
import { useSHAInterventions } from '../../billing-form/social-health-authority/sha-virtual-claim.resource';
import { type SHAIntervention } from '../../billing-form/social-health-authority/type';
import { formatCurrency } from '../../helpers/currency';

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

  const interventions_ = useMemo(() => {
    const base = interventions.length > 0 ? interventions : Object.values(cachedInterventions);

    const additionalInterventions = selectedInterventionsObservable.reduce((prev, curr) => {
      const contained = base.some((i) => i.code === curr);
      if (!contained && cachedInterventions[curr]) {
        prev.push(cachedInterventions[curr]);
      }
      return prev;
    }, [] as Array<SHAIntervention>);

    return [...base, ...additionalInterventions];
  }, [interventions, cachedInterventions, selectedInterventionsObservable]);

  if (isLoading) {
    return (
      <InlineLoading
        className={styles.loader}
        status="active"
        iconDescription={t('loading', 'Loading')}
        description={t('loadingInterventions', 'Loading interventions...')}
      />
    );
  }

  if (error) {
    return (
      <InlineNotification
        aria-label="closes notification"
        kind="error"
        lowContrast
        statusIconDescription="notification"
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
        render={({ field }) => (
          <MultiSelect
            ref={field.ref}
            id="sha-interventions"
            disabled={!subBenefitCode || selectedPackages.length === 0}
            titleText={t('interventions', 'Interventions')}
            label={t('chooseInterventions', 'Choose interventions')}
            items={interventions_.map((i) => i.code)}
            itemToString={(code) => {
              const intervention = interventions_.find((i) => i.code === code);
              if (!intervention) {
                return code ?? '';
              }
              const preauth = intervention.needs_preauth
                ? ` — ${t('preauthRequired', 'Preauth required')}`
                : ` — ${t('noPreauthNeeded', 'No preauth')}`;
              return `${intervention.name}${preauth}`;
            }}
            selectedItems={field.value ?? []}
            onChange={(e) => field.onChange(e.selectedItems)}
            invalid={!!form.formState.errors[field.name]?.message}
            invalidText={form.formState.errors[field.name]?.message}
          />
        )}
      />

      {selectedInterventionsObservable.length > 0 && (
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
      )}
    </div>
  );
};

export default PackageInterventions;
