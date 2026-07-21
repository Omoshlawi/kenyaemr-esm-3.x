import React from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, useFormContext } from 'react-hook-form';
import { FormGroup, Select, SelectItem, Stack, TextArea, TextInput } from '@carbon/react';
import { asStringField, preauthField } from '../../utils';
import { LENS_PRESCRIPTIONS } from '../../constants';
import { type PreauthFormData } from '../pre-auth-schema';
import styles from '../pre-auth-form.scss';

const OPTICAL_AMOUNT_FIELDS = ['lens_amount', 'eye_examination_amount', 'frame_amount'] as const;

const OpticalDetails: React.FC = () => {
  const { t } = useTranslation();
  const { control } = useFormContext<PreauthFormData>();

  return (
    <div className={styles.twoCol}>
      <FormGroup legendText={t('opticalDetails', 'Optical details')}>
        <Stack gap={4}>
          <Controller
            name={preauthField('necessity_of_service')}
            control={control}
            render={({ field }) => (
              <TextArea
                {...asStringField(field)}
                id="necessity"
                labelText={t('necessityOfService', 'Necessity of service')}
                rows={2}
              />
            )}
          />
          <Controller
            name={preauthField('lens_prescription')}
            control={control}
            render={({ field }) => (
              <Select
                {...asStringField(field)}
                id="lens-prescription"
                labelText={t('lensPrescription', 'Lens prescription')}>
                {LENS_PRESCRIPTIONS.map((l) => (
                  <SelectItem key={l} value={l} text={l.replace(/_/g, ' ')} />
                ))}
              </Select>
            )}
          />
          <div className={styles.threeCol}>
            {OPTICAL_AMOUNT_FIELDS.map((f) => (
              <Controller
                key={f}
                name={preauthField(f)}
                control={control}
                render={({ field }) => (
                  <TextInput
                    {...asStringField(field)}
                    id={f}
                    type="number"
                    labelText={t(f, f.replace(/_/g, ' ') + ' (KES)')}
                  />
                )}
              />
            ))}
          </div>
          <Controller
            name={preauthField('new_or_replacement')}
            control={control}
            render={({ field }) => (
              <Select
                {...asStringField(field)}
                id="new-replacement"
                labelText={t('newOrReplacement', 'New or replacement')}>
                <SelectItem value="NEW" text="New" />
                <SelectItem value="REPLACEMENT" text="Replacement" />
              </Select>
            )}
          />
        </Stack>
      </FormGroup>
    </div>
  );
};

export default OpticalDetails;
