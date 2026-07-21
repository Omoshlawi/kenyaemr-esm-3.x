import React from 'react';
import { useTranslation } from 'react-i18next';
import { useFieldArray, useFormContext } from 'react-hook-form';
import classNames from 'classnames';
import { Button, FormGroup, InlineNotification, Layer } from '@carbon/react';
import { TrashCan } from '@carbon/react/icons';
import ProviderSearch from '../provider-search-component/provider-search-component';
import RequiredLabel from '../components/required-label.component';
import { type ProviderResult } from '../../type';
import { type PreauthFormData } from '../pre-auth-schema';
import styles from '../pre-auth-form.scss';

interface DoctorsSectionProps {
  requiredDoctorsCount: number;
}

const DoctorsSection: React.FC<DoctorsSectionProps> = ({ requiredDoctorsCount }) => {
  const { t } = useTranslation();
  const {
    control,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<PreauthFormData>();
  const {
    fields: doctorFields,
    append: appendDoctor,
    remove: removeDoctor,
  } = useFieldArray({
    control,
    name: 'doctors',
  });

  const hasEnoughDoctors = requiredDoctorsCount === 0 || doctorFields.length >= requiredDoctorsCount;

  return (
    <div className={styles.twoCol}>
      <FormGroup legendText={<RequiredLabel>{t('doctors', 'Doctors')}</RequiredLabel>}>
        {requiredDoctorsCount > 0 && (
          <div className={classNames(styles.inlineNotification, styles.submitError)}>
            <InlineNotification
              kind={hasEnoughDoctors ? 'success' : 'error'}
              lowContrast
              hideCloseButton
              title={
                hasEnoughDoctors
                  ? t('peerReviewDoctorsMetTitle', 'Peer review requirement met')
                  : t('peerReviewDoctorsRequiredTitle', 'Peer review doctors required')
              }
              subtitle={
                hasEnoughDoctors
                  ? t(
                      'peerReviewDoctorsMet',
                      'This intervention requires a peer review by {{required}} doctors — requirement met.',
                      { required: requiredDoctorsCount },
                    )
                  : t(
                      'peerReviewDoctorsHint',
                      'This intervention requires a peer review by {{required}} doctors before it can be submitted. {{current}} of {{required}} added.',
                      { required: requiredDoctorsCount, current: doctorFields.length },
                    )
              }
            />
          </div>
        )}
        {doctorFields.map((field, idx) => (
          <Layer key={field.id}>
            <div className={styles.itemCard}>
              <ProviderSearch
                idx={idx}
                selectedDisplay={watch(`doctors.${idx}.person.display`) ?? ''}
                selectedLicenseNumber={watch(`doctors.${idx}.identification_number`) ?? ''}
                selectedRegulationBody={watch(`doctors.${idx}.regulation_body`) ?? ''}
                onSelect={(provider: ProviderResult) => {
                  setValue(`doctors.${idx}.person.display`, provider.person?.display);
                  setValue(`doctors.${idx}.identification_number`, provider.licenseNumber ?? '');
                  setValue(`doctors.${idx}.identification_type`, 'registration_number');
                  setValue(`doctors.${idx}.regulation_body`, provider.licenseBody ?? '');
                }}
                onLicenseNumberChange={(val) => setValue(`doctors.${idx}.identification_number`, val)}
                onRegulationBodyChange={(val) => setValue(`doctors.${idx}.regulation_body`, val)}
                invalid={!!errors.doctors?.[idx]?.identification_number}
                invalidText={errors.doctors?.[idx]?.identification_number?.message}
              />
              <div className={styles.addBtnContainer}>
                <Button
                  kind="tertiary"
                  size="sm"
                  className={styles.addBtn}
                  onClick={() =>
                    appendDoctor({
                      identification_number: '',
                      identification_type: 'registration_number',
                      regulation_body: 'KMPDC',
                      is_primary: false,
                    })
                  }>
                  {t('addDoctor', '+ Add doctor')}
                </Button>
                {idx > 0 && (
                  <Button
                    kind="danger"
                    size="sm"
                    renderIcon={TrashCan}
                    iconDescription={t('remove', 'Remove')}
                    hasIconOnly
                    className={styles.removeBtn}
                    onClick={() => removeDoctor(idx)}
                  />
                )}
              </div>
            </div>
          </Layer>
        ))}
        {errors.doctors?.root && <p className={styles.fieldError}>{errors.doctors.root.message}</p>}
      </FormGroup>
    </div>
  );
};

export default DoctorsSection;
