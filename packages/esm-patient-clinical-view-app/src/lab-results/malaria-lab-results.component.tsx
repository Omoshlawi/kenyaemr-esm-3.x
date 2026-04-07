import React, { useEffect } from 'react';
import { Control } from 'react-hook-form';
import { Observation, type ObservationValue } from '../types/encounter';
import ResultFormField from './lab-results-form-field.component';
import { useOrderConceptsByUuids } from './lab-results.resource';
import {
  MALARIA_CONCEPTS,
  malariaConceptUuidsMap,
  type MalariaAdditionalConceptConfig,
} from './malaria-lab-results.constants';

type MalariaLabResultsComponentProps = {
  formValues: Record<string, ObservationValue>;
  control: Control<Record<string, unknown>>;
  completeLabResults: Array<Observation>;
  setValue: (field: string, value: ObservationValue | undefined) => void;
};

const MalariaLabResultsComponent: React.FC<MalariaLabResultsComponentProps> = ({
  formValues,
  control,
  completeLabResults,
  setValue,
}) => {
  const bloodSmear = formValues[MALARIA_CONCEPTS.BLOOD_SMEAR_FOR_MALARIA_PARASITES];
  const malariaRapidTest = formValues[MALARIA_CONCEPTS.MALARIA_RAPID_TEST];

  const isBloodSmearPresent = Boolean(bloodSmear);
  const isMalariaRapidTestPositive =
    (typeof malariaRapidTest === 'string' || typeof malariaRapidTest === 'number') &&
    malariaRapidTest.toString() === '703AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

  const activeParentConceptUuids: Array<string> = [];

  if (isBloodSmearPresent) {
    activeParentConceptUuids.push(MALARIA_CONCEPTS.BLOOD_SMEAR_FOR_MALARIA_PARASITES);
  }

  if (isMalariaRapidTestPositive) {
    activeParentConceptUuids.push(MALARIA_CONCEPTS.MALARIA_RAPID_TEST);
  }

  const additionalConceptConfigs = activeParentConceptUuids.flatMap(
    (parentConceptUuid) => malariaConceptUuidsMap[parentConceptUuid] ?? [],
  );

  const configsByConceptUuid = additionalConceptConfigs.reduce((acc, config) => {
    if (!acc[config.conceptUuid]) {
      acc[config.conceptUuid] = config;
    }
    return acc;
  }, {} as Record<string, MalariaAdditionalConceptConfig>);

  const additionalConceptUuids = Object.keys(configsByConceptUuid);

  const { concepts: malariaAdditionalConcepts } = useOrderConceptsByUuids(additionalConceptUuids);

  const visibleConceptUuids = new Set(
    additionalConceptConfigs
      .filter(
        (config) =>
          !config.showWhenExpression ||
          config.showWhenExpression({
            formValues,
            completeLabResults,
          }),
      )
      .map((config) => config.conceptUuid),
  );

  const hiddenConceptUuids = additionalConceptUuids.filter((uuid) => !visibleConceptUuids.has(uuid));

  useEffect(() => {
    hiddenConceptUuids.forEach((uuid) => {
      const currentValue = formValues[uuid];
      if (currentValue !== undefined && currentValue !== null && currentValue !== '') {
        setValue(uuid, undefined);
      }
    });
  }, [hiddenConceptUuids.join(','), formValues, setValue]);

  if (!additionalConceptUuids.length || !malariaAdditionalConcepts.length) {
    return null;
  }

  return (
    <>
      {malariaAdditionalConcepts.map((concept) => {
        const config = configsByConceptUuid[concept.uuid];

        if (config?.showWhenExpression && !config.showWhenExpression({ formValues, completeLabResults })) {
          return null;
        }

        const defaultObservation =
          completeLabResults.find((obs) => obs.concept.uuid === concept.uuid) ??
          completeLabResults.find((obs) => obs.groupMembers?.some((member) => member.concept.uuid === concept.uuid));

        return (
          <ResultFormField
            key={concept.uuid}
            concept={concept}
            control={control}
            // Default observation is optional; it's used for pre-populating values when editing
            // and safely handled inside ResultFormField.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            defaultValue={defaultObservation as any}
          />
        );
      })}
    </>
  );
};

export default MalariaLabResultsComponent;
