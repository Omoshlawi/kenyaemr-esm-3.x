import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  ButtonSet,
  Form,
  InlineLoading,
  InlineNotification,
  RadioButton,
  RadioButtonGroup,
} from '@carbon/react';
import { showSnackbar, useConfig, Workspace2, type Workspace2DefinitionProps } from '@openmrs/esm-framework';

import { type PcsConfig } from '../config-schema';
import { useIdentifierTypeUuids } from '../resources/use-identifier-type-uuids';
import { getDependentsFromContacts } from '../resources/hie-contacts';
import { linkHieDependantWithTemporaryId, useHieDependantLinkState } from '../resources/link-dependant.resource';
import styles from './link-hie-dependant.scss';

export interface LinkHieDependantWorkspaceProps {
  /** The mother's PCS individual ID — the new participant is created against it. */
  motherIndividualId: string;
  /** The mother's HIE record; her `contact` array is the candidate list. */
  hiePatient?: fhir.Patient;
  parentPhoneNumber?: string;
  onLinked?: () => void;
}

const schema = z.object({
  dependantId: z.string().min(1),
});

type LinkHieDependantFormData = z.infer<typeof schema>;

const LinkHieDependantWorkspace: React.FC<Workspace2DefinitionProps<LinkHieDependantWorkspaceProps, {}, {}>> = ({
  closeWorkspace,
  workspaceProps,
}) => {
  const { t } = useTranslation();
  const uuids = useIdentifierTypeUuids();

  const { pcsIdentifiers } = useConfig<PcsConfig>();
  const { motherIndividualId, hiePatient, parentPhoneNumber, onLinked } = workspaceProps ?? {};
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Read straight off the record already in hand — no request.
  const candidates = useMemo(() => (hiePatient ? getDependentsFromContacts(hiePatient as any) : []), [hiePatient]);

  // A child already holding either study identifier is in PCS, so this flow does not apply to
  // her — she is shown with the ID she holds rather than hidden, so an operator hunting for her
  // can tell "already linked" apart from "not in the HIE at all".
  const { linkedById, isChecking } = useHieDependantLinkState(candidates, [
    pcsIdentifiers.studyParticipantID,
    pcsIdentifiers.studyTemporaryParticipantID,
  ]);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LinkHieDependantFormData>({
    resolver: zodResolver(schema),
    defaultValues: { dependantId: '' },
  });

  const onSubmit = async ({ dependantId }: LinkHieDependantFormData) => {
    const dependant = candidates.find((candidate) => candidate.id === dependantId);
    if (!dependant || !motherIndividualId) {
      return;
    }

    setSubmitError(null);
    try {
      const { participant } = await linkHieDependantWithTemporaryId({
        dependant,
        parentPhoneNumber,
        motherIndividualId,
        uuids,
      });

      showSnackbar({
        title: t('dependantLinkedToPcs', 'Dependant added to PCS'),
        subtitle: participant?.individualId
          ? t('dependantAddedSubtitle', 'PCS issued {{individualId}} for this dependant.', {
              individualId: participant.individualId,
            })
          : undefined,
        kind: 'success',
        isLowContrast: true,
      });

      onLinked?.();
      closeWorkspace();
    } catch (e: any) {
      // A child linked elsewhere since the list rendered comes back as a 409 — worth showing
      // the module's own wording rather than a generic failure.
      setSubmitError(
        e?.responseBody?.error?.message ??
          e?.message ??
          t('dependantLinkToPcsFailed', 'The dependant could not be added to PCS.'),
      );
    }
  };

  if (!workspaceProps) {
    return null;
  }

  return (
    <Workspace2 title={t('dependantInHieNotPcs', 'Dependant in HIE and not PCS?')}>
      <Form onSubmit={handleSubmit(onSubmit)} className={styles.workspaceForm}>
        <div className={styles.workspaceContent}>
          {candidates.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>
                {t('noHieDependants', 'The HIE record lists no dependants for this mother.')}
              </p>
              <p className={styles.emptySubtitle}>
                {t(
                  'noHieDependantsSubtitle',
                  'Use "Dependant not in HIE and PCS?" to register the child from their own details.',
                )}
              </p>
            </div>
          ) : (
            <>
              <p className={styles.prompt}>
                {t('chooseDependantToAdd', 'Choose the dependant to add to PCS. One at a time.')}
              </p>

              <Controller
                name="dependantId"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <RadioButtonGroup
                    name="hieDependant"
                    orientation="vertical"
                    legendText={t('mothersDependantsInHie', "Mother's dependants in the HIE")}
                    valueSelected={value ?? ''}
                    // Load-bearing: without it Carbon's internal state ignores a programmatic
                    // change to the selected value.
                    key={value ?? 'empty'}
                    onChange={(selected) => onChange(String(selected))}>
                    {candidates.map((candidate) => {
                      const linkedTo = linkedById[candidate.id];

                      return (
                        <RadioButton
                          key={candidate.id}
                          value={candidate.id}
                          // Disabled while the check runs too, so nothing can be picked in the
                          // window before its state is known.
                          disabled={isChecking || Boolean(linkedTo)}
                          labelText={`${candidate.name} · ${candidate.relationship} · ${candidate.gender}${
                            candidate.birthDate && candidate.birthDate !== 'Unknown' ? ` · ${candidate.birthDate}` : ''
                          }${
                            linkedTo
                              ? ` — ${t('alreadyLinkedTo', 'already linked to {{individualId}}', {
                                  individualId: linkedTo,
                                })}`
                              : ''
                          }`}
                        />
                      );
                    })}
                  </RadioButtonGroup>
                )}
              />

              {isChecking && (
                <InlineLoading
                  className={styles.checking}
                  description={t('checkingPcsLinks', 'Checking which dependants are already in PCS...')}
                />
              )}
            </>
          )}

          {submitError && (
            <InlineNotification
              className={styles.notification}
              kind="error"
              lowContrast
              hideCloseButton
              title={t('dependantLinkToPcsFailedTitle', 'Could not add dependant to PCS')}
              subtitle={submitError}
            />
          )}
        </div>

        <ButtonSet className={styles.workspaceButtonSet}>
          <Button kind="secondary" onClick={() => closeWorkspace()}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button kind="primary" type="submit" disabled={isSubmitting || candidates.length === 0}>
            {isSubmitting ? <InlineLoading description={t('addingDependant', 'Adding...')} /> : t('save', 'Save')}
          </Button>
        </ButtonSet>
      </Form>
    </Workspace2>
  );
};

export default LinkHieDependantWorkspace;
