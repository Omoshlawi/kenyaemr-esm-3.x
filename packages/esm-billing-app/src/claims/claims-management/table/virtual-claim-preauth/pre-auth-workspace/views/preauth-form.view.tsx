import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, ButtonSet, Form, InlineLoading, InlineNotification } from '@carbon/react';
import { useLayoutType, Workspace2 } from '@openmrs/esm-framework';
import {
  type PreauthQueueItem,
  type SupplementaryScheme,
} from '../../../../../../billing-form/social-health-authority/type';
import EffectiveCoverPicker from '../../../../../../billing-form/pomsf/effective-pomsf.component';
import { useClaimDoctors } from '../../../../../claims-wrap/claim-workspaces/doctors/claim-doctors-resource';
import { usePreauthDocuments } from '../hooks/use-preauth-documents';
import { usePreauthSubmit } from '../hooks/use-preauth-submit';
import { getDefaultValues, getSchemaForType, type PreauthFormData, type PreauthType } from '../pre-auth-schema';
import PreauthBanner from '../sections/preauth-banner.section';
import GeneralDetails from '../sections/general-details.section';
import DoctorsSection from '../sections/doctors.section';
import DiagnosesSection from '../sections/diagnoses.section';
import AttachmentsSection from '../sections/attachments.section';
import PreauthTypeDetails from '../sections/preauth-type-details.component';
import styles from '../pre-auth-form.scss';

interface PreauthFormViewProps {
  item?: PreauthQueueItem;
  isResubmit: boolean;
  isElective: boolean;
  workspaceTitle: string;
  mutate?: () => void;
  onClose: () => void;
}

const PreauthFormView: React.FC<PreauthFormViewProps> = ({
  item,
  isResubmit,
  isElective,
  workspaceTitle,
  mutate,
  onClose,
}) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const preauthType = (item?.preauth_type ?? 'NORMAL') as PreauthType;

  const [selectedScheme, setSelectedScheme] = useState<SupplementaryScheme | null>(null);

  const { requiredPreauthDocs } = usePreauthDocuments(item);

  const { doctors: claimDoctors } = useClaimDoctors(isResubmit ? item?.authorization_code ?? null : null);

  const existingDoctors = useMemo(() => {
    const source = claimDoctors.length > 0 ? claimDoctors : item?.doctors ?? [];
    return source.map((doctor, idx) => ({
      identification_number: doctor.identification_number,
      identification_type: 'registration_number',
      regulation_body: doctor.regulation_body,
      is_primary: idx === 0,
      person: doctor.doctor_name ? { display: doctor.doctor_name } : undefined,
    }));
  }, [claimDoctors, item?.doctors]);

  const existingDiagnoses = useMemo(
    () =>
      (item?.diagnoses ?? []).map((diagnosis) => ({
        icd_code: diagnosis.icd_code,
        display: diagnosis.display ?? '',
      })),
    [item?.diagnoses],
  );

  const schema = getSchemaForType(preauthType);
  const existingItemForDefaults =
    isResubmit && item
      ? {
          requested_on: item.requested_on ?? undefined,
          responded_on: item.responded_on ?? undefined,
          doctors: existingDoctors,
          diagnoses: existingDiagnoses,
        }
      : undefined;
  const methods = useForm<PreauthFormData>({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues(
      preauthType,
      isElective,
      existingItemForDefaults,
      item?.tariff != null ? String(item.tariff) : undefined,
    ) as PreauthFormData,
  });

  const {
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = methods;

  // claimDoctors is fetched async (separate endpoint keyed by authorization_code), so it
  // typically isn't ready in time for the synchronous useForm defaultValues above — patch
  // it in once it arrives instead.
  useEffect(() => {
    if (isResubmit && item && claimDoctors.length > 0) {
      setValue('doctors', existingDoctors, { shouldValidate: false });
    }
  }, [isResubmit, item, claimDoctors, existingDoctors, setValue]);

  const requiredDoctorsCount = isElective && !isResubmit ? item?.number_of_doctors_required ?? 0 : 0;
  const doctorCount = watch('doctors')?.length ?? 0;
  const hasEnoughDoctors = requiredDoctorsCount === 0 || doctorCount >= requiredDoctorsCount;

  const { onSubmit, submitError } = usePreauthSubmit({
    item,
    isElective,
    isResubmit,
    selectedScheme,
    requiredDoctorsCount,
    requiredPreauthDocs,
    mutate,
    onSuccess: onClose,
  });

  return (
    <Workspace2 title={workspaceTitle}>
      <FormProvider {...methods}>
        <Form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
          <PreauthBanner item={item} isElective={isElective} isResubmit={isResubmit} />

          <EffectiveCoverPicker
            patientUuid={item?.patient?.uuid ?? ''}
            patientCRId={(item as any)?.beneficiary_cr_id ?? ''}
            consentToken={item?.authorization_code ?? ''}
            onSchemeSelected={setSelectedScheme}
          />

          {isResubmit && item?.response_note && (
            <div className={classNames(styles.inlineNotification, styles.resubmissionNote)}>
              <InlineNotification
                kind="warning"
                lowContrast
                title={t('rejectionReason', 'Previous rejection reason')}
                subtitle={item.response_note}
              />
            </div>
          )}

          {isElective && (
            <div className={classNames(styles.inlineNotification, styles.electiveGuidance)}>
              <InlineNotification
                kind="info"
                lowContrast
                title={t('electivePreauthGuidance', 'Elective pre-authorization')}
                subtitle={t(
                  'electivePreauthGuidanceSubtitle',
                  'This preauth is for a scheduled elective procedure. SHA will review and notify you via email. The status will update in the Scheduled tab.',
                )}
              />
            </div>
          )}

          {submitError && (
            <div className={classNames(styles.inlineNotification, styles.submitError)}>
              <InlineNotification kind="error" lowContrast title={submitError} />
            </div>
          )}

          <GeneralDetails item={item} preauthType={preauthType} />
          <DoctorsSection requiredDoctorsCount={requiredDoctorsCount} />
          <DiagnosesSection />
          <PreauthTypeDetails preauthType={preauthType} />
          <AttachmentsSection item={item} />

          <ButtonSet className={classNames({ [styles.tablet]: isTablet, [styles.desktop]: !isTablet })}>
            <Button className={styles.button} kind="secondary" onClick={onClose}>
              {t('discard', 'Discard')}
            </Button>
            <Button className={styles.button} disabled={isSubmitting || !hasEnoughDoctors} kind="primary" type="submit">
              {isSubmitting ? (
                <InlineLoading description={t('submitting', 'Submitting...') + '...'} role="progressbar" />
              ) : isResubmit ? (
                t('resubmitPreauth', 'Resubmit preauth')
              ) : (
                t('submitPreauth', 'Submit preauth')
              )}
            </Button>
          </ButtonSet>
        </Form>
      </FormProvider>
    </Workspace2>
  );
};

export default PreauthFormView;
