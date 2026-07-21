import React from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, useFormContext } from 'react-hook-form';
import { FormGroup, Stack, TextArea } from '@carbon/react';
import RequiredLabel from '../components/required-label.component';
import { type PreauthFormData } from '../pre-auth-schema';
import styles from '../pre-auth-form.scss';

const ImagingDetails: React.FC = () => {
  const { t } = useTranslation();
  const {
    control,
    formState: { errors },
  } = useFormContext<PreauthFormData>();

  return (
    <div className={styles.twoCol}>
      <FormGroup legendText={t('imagingDetails', 'Imaging details')}>
        <Stack gap={4}>
          <Controller
            name="clinical_indications"
            control={control}
            render={({ field }) => (
              <TextArea
                {...field}
                id="imaging-clinical-indications"
                labelText={
                  <RequiredLabel>{t('imagingClinicalIndications', 'Clinical indications for imaging')}</RequiredLabel>
                }
                placeholder={t(
                  'imagingClinicalHint',
                  'Describe clinical findings or symptoms justifying this study (e.g. chronic headache with focal neurology, suspected fracture, abdominal mass)...',
                )}
                rows={4}
                invalid={!!errors.clinical_indications}
                invalidText={errors.clinical_indications?.message}
              />
            )}
          />
        </Stack>
      </FormGroup>
    </div>
  );
};

export default ImagingDetails;
