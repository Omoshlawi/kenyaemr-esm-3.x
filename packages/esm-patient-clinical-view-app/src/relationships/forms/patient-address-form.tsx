import {
  Accordion,
  AccordionItem,
  Column,
  Dropdown,
  InlineLoading,
  InlineNotification,
  SelectSkeleton,
  TextInput,
} from '@carbon/react';
import React, { useEffect, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { getAddressHierarchyEntries, relationshipFormSchema } from '../relationship.resources';
const PatientAddressForm = () => {
  const form = useFormContext<z.infer<typeof relationshipFormSchema>>();
  const { t } = useTranslation();
  const [counties, setCounties] = useState<{ entries: Array<string>; isLoading: boolean }>({
    entries: [],
    isLoading: false,
  });
  const [subCounties, setSubcounties] = useState<{ entries: Array<string>; isLoading: boolean }>({
    entries: [],
    isLoading: false,
  });
  const [wards, setWards] = useState<{ entries: Array<string>; isLoading: boolean }>({
    entries: [],
    isLoading: false,
  });
  const observableCounty = form.watch('personBInfo.address.countyDistrict');
  const observableSubCounty = form.watch('personBInfo.address.stateProvince');

  useEffect(() => {
    (async () => {
      setCounties((state) => ({ ...state, isLoading: true }));
      const counties_ = await getAddressHierarchyEntries();
      setCounties({ entries: counties_, isLoading: false });
    })();
  }, []);

  useEffect(() => {
    form.resetField('personBInfo.address.stateProvince');
    if (observableCounty) {
      (async () => {
        setSubcounties((state) => ({ ...state, isLoading: true }));
        const counties_ = await getAddressHierarchyEntries(observableCounty);
        setSubcounties({ entries: counties_, isLoading: false });
      })();
    }
  }, [observableCounty]);
  useEffect(() => {
    form.resetField('personBInfo.address.address4');
    if (observableSubCounty) {
      (async () => {
        setWards((state) => ({ ...state, isLoading: true }));
        const counties_ = await getAddressHierarchyEntries(`${observableCounty}|${observableSubCounty}`);
        setWards({ entries: counties_, isLoading: false });
      })();
    }
  }, [observableSubCounty, observableCounty]);

  if (counties.isLoading) {
    return <InlineLoading description={t('loading', 'Loading')} iconDescription={t('loading', 'Loading') + ' ...'} />;
  }

  return (
    <Column>
      <pre>{JSON.stringify(form.getValues(), null, 2)}</pre>
      <Accordion>
        <AccordionItem title={t('address', 'Address (optional)')}>
          <Controller
            control={form.control}
            name="personBInfo.address"
            render={({ field, fieldState: { error: error_ } }) => (
              <>
                {error_?.message && (
                  <InlineNotification
                    kind="error"
                    title={t('address', 'Address')}
                    subtitle={error_?.message}
                    lowContrast
                  />
                )}
              </>
            )}
          />
          <Column>
            <Controller
              control={form.control}
              name="personBInfo.address.countyDistrict"
              render={({ field, fieldState: { error } }) => (
                <Dropdown
                  {...field}
                  onChange={({ selectedItem }) => {
                    field.onChange(selectedItem);
                  }}
                  id="patientCounty"
                  invalidText={error?.message}
                  itemToString={(entry) => entry ?? ''}
                  items={counties.entries}
                  label={t('Choose Option')}
                  titleText={t('county', 'County')}
                  type="default"
                />
              )}
            />
          </Column>
          <Column>
            {subCounties.isLoading ? (
              <SelectSkeleton />
            ) : (
              <Controller
                control={form.control}
                name="personBInfo.address.stateProvince"
                render={({ field, fieldState: { error } }) => (
                  <Dropdown
                    {...field}
                    onChange={({ selectedItem }) => {
                      field.onChange(selectedItem);
                    }}
                    id="patientSubCounty"
                    invalidText={error?.message}
                    itemToString={(entry) => entry ?? ''}
                    items={subCounties.entries}
                    label={t('Choose Option')}
                    titleText={t('subcounty', 'Sub-county')}
                    type="default"
                  />
                )}
              />
            )}
          </Column>
          <Column>
            {wards.isLoading ? (
              <SelectSkeleton />
            ) : (
              <Controller
                control={form.control}
                name="personBInfo.address.address4"
                render={({ field, fieldState: { error } }) => (
                  <Dropdown
                    {...field}
                    onChange={({ selectedItem }) => {
                      field.onChange(selectedItem);
                    }}
                    id="patientWard"
                    invalidText={error?.message}
                    itemToString={(entry) => entry ?? ''}
                    items={wards.entries}
                    label={t('Choose Option')}
                    titleText={t('ward', 'Ward')}
                    type="default"
                  />
                )}
              />
            )}
          </Column>
          <Column>
            <Controller
              control={form.control}
              name="personBInfo.address.address1"
              render={({ field, fieldState: { error } }) => (
                <TextInput
                  invalid={error?.message}
                  invalidText={error?.message}
                  {...field}
                  placeholder={t('postalAddress', 'Postal Address')}
                  labelText={t('postalAddresslabel', 'Postal Address(optional)')}
                />
              )}
            />
          </Column>
          <Column>
            <Controller
              control={form.control}
              name="personBInfo.address.address6"
              render={({ field, fieldState: { error } }) => (
                <TextInput
                  invalid={error?.message}
                  invalidText={error?.message}
                  {...field}
                  placeholder={t('location', 'Location')}
                  labelText={t('locationLabel', 'Location(optional)')}
                />
              )}
            />
          </Column>
          <Column>
            <Controller
              control={form.control}
              name="personBInfo.address.address5"
              render={({ field, fieldState: { error } }) => (
                <TextInput
                  invalid={error?.message}
                  invalidText={error?.message}
                  {...field}
                  placeholder={t('subLocation', 'Sub-location')}
                  labelText={t('subLocationLabel', 'Sub-location(optional)')}
                />
              )}
            />
          </Column>
          <Column>
            <Controller
              control={form.control}
              name="personBInfo.address.cityVillage"
              render={({ field, fieldState: { error } }) => (
                <TextInput
                  invalid={error?.message}
                  invalidText={error?.message}
                  {...field}
                  placeholder={t('village', 'Village')}
                  labelText={t('villageLabel', 'Village(optional)')}
                />
              )}
            />
          </Column>
          <Column>
            <Controller
              control={form.control}
              name="personBInfo.address.address2"
              render={({ field, fieldState: { error } }) => (
                <TextInput
                  invalid={error?.message}
                  invalidText={error?.message}
                  {...field}
                  placeholder={t('landmark', 'Landmark')}
                  labelText={t('landmarkLabel', 'Landmark(optional)')}
                />
              )}
            />
          </Column>
        </AccordionItem>
      </Accordion>
    </Column>
  );
};

export default PatientAddressForm;
function getEntries() {
  throw new Error('Function not implemented.');
}
