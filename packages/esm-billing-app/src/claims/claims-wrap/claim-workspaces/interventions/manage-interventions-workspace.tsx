import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  ButtonSet,
  Checkbox,
  ComboBox,
  ContentSwitcher,
  Form,
  FormGroup,
  InlineLoading,
  InlineNotification,
  Switch,
  Tag,
} from '@carbon/react';
import classNames from 'classnames';
import { showSnackbar, useLayoutType, Workspace2, type Workspace2DefinitionProps } from '@openmrs/esm-framework';

import {
  addInterventionToVisit,
  restoreInterventionOnVisit,
  retireInterventionOnVisit,
  switchInterventionOnVisit,
  useSHAInterventions,
  useSHASubBenefits,
} from '../../../../billing-form/social-health-authority/sha-virtual-claim.resource';
import { type SHAIntervention } from '../../../../billing-form/social-health-authority/type';
import { PREAUTH_TYPE_COLORS } from '../../../claims-management/table/virtual-claim-preauth/constants';
import styles from './manage-interventions.scss';

type ManageMode = 'ADD' | 'SWITCH' | 'RETIRE' | 'RESTORE';

type ClaimInterventionSummary = {
  intervention_code: string;
  intervention_name?: string;
  status?: string;
};

type ManageInterventionsWorkspaceProps = {
  authorizationCode: string;
  patientCRId: string;
  interventions: Array<ClaimInterventionSummary>;
  mutate: () => void;
};

const ManageInterventionsWorkspace: React.FC<Workspace2DefinitionProps<ManageInterventionsWorkspaceProps, {}, {}>> = ({
  workspaceProps,
  closeWorkspace,
}) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';

  const authorizationCode = workspaceProps?.authorizationCode ?? '';
  const patientCRId = workspaceProps?.patientCRId ?? '';
  const interventions = useMemo(() => workspaceProps?.interventions ?? [], [workspaceProps?.interventions]);
  const mutate = workspaceProps?.mutate ?? (() => undefined);

  const activeInterventions = useMemo(
    () => interventions.filter((iv) => (iv.status ?? '').toUpperCase() === 'ACTIVE'),
    [interventions],
  );
  const inactiveInterventions = useMemo(
    () => interventions.filter((iv) => (iv.status ?? '').toUpperCase() !== 'ACTIVE'),
    [interventions],
  );

  const hasSwitchable = activeInterventions.length > 0;
  const hasRestorable = inactiveInterventions.length > 0;
  // SHA refuses to retire the last active intervention, so only offer it when
  // something would remain active afterwards.
  const hasRetirable = activeInterventions.length > 1;

  const modes = useMemo<Array<ManageMode>>(() => ['ADD', 'SWITCH', 'RETIRE', 'RESTORE'], []);
  const [mode, setMode] = useState<ManageMode>('ADD');
  const modeIndex = Math.max(0, modes.indexOf(mode));

  const [subBenefitCode, setSubBenefitCode] = useState<string | null>(null);
  const [interventionCode, setInterventionCode] = useState<string | null>(null);
  const [fromInterventionCode, setFromInterventionCode] = useState<string | null>(null);
  const [retireCode, setRetireCode] = useState<string | null>(null);
  const [restoreCode, setRestoreCode] = useState<string | null>(null);
  const [keepBilledLines, setKeepBilledLines] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { subBenefits, isLoading: loadingSubBenefits } = useSHASubBenefits(patientCRId);
  const { interventions: benefitInterventions, isLoading: loadingInterventions } = useSHAInterventions(
    patientCRId,
    mode === 'ADD' || mode === 'SWITCH' ? subBenefitCode ?? '' : '',
  );

  const attachedCodes = useMemo(() => new Set(interventions.map((iv) => iv.intervention_code)), [interventions]);

  const selectedIntervention = useMemo<SHAIntervention | null>(
    () => benefitInterventions.find((i) => i.code === interventionCode) ?? null,
    [benefitInterventions, interventionCode],
  );

  const resetSelections = useCallback(() => {
    setSubBenefitCode(null);
    setInterventionCode(null);
    setFromInterventionCode(null);
    setRetireCode(null);
    setRestoreCode(null);
    setError(null);
  }, []);

  const handleModeChange = useCallback(
    (next: ManageMode) => {
      setMode(next);
      resetSelections();
    },
    [resetSelections],
  );

  const subBenefitItems = useMemo(
    () => subBenefits.map((sb) => ({ code: sb.code, text: `${sb.code} — ${sb.name}` })),
    [subBenefits],
  );
  const interventionItems = useMemo(
    () =>
      benefitInterventions.map((iv) => ({
        code: iv.code,
        text: `${iv.code} — ${iv.name}`,
        disabled: attachedCodes.has(iv.code),
      })),
    [benefitInterventions, attachedCodes],
  );
  const activeItems = useMemo(
    () =>
      activeInterventions.map((iv) => ({
        code: iv.intervention_code,
        text: `${iv.intervention_code} — ${iv.intervention_name ?? ''}`,
      })),
    [activeInterventions],
  );
  const inactiveItems = useMemo(
    () =>
      inactiveInterventions.map((iv) => ({
        code: iv.intervention_code,
        text: `${iv.intervention_code} — ${iv.intervention_name ?? ''}`,
      })),
    [inactiveInterventions],
  );

  const preauthType = (selectedIntervention?.preauth_type ?? '').toUpperCase();
  const showPreauthType =
    (mode === 'ADD' || mode === 'SWITCH') && preauthType && preauthType !== 'NORMAL' && preauthType !== 'NONE';

  const canSubmit = (() => {
    if (isSubmitting) {
      return false;
    }
    if (mode === 'ADD') {
      return !!interventionCode && !attachedCodes.has(interventionCode);
    }
    if (mode === 'SWITCH') {
      return !!fromInterventionCode && !!interventionCode && !attachedCodes.has(interventionCode);
    }
    if (mode === 'RETIRE') {
      return !!retireCode && activeInterventions.length > 1;
    }
    if (mode === 'RESTORE') {
      return !!restoreCode;
    }
    return false;
  })();

  const onSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      let res: { success?: boolean; error?: string } | undefined;
      let successTitle = '';

      if (mode === 'ADD' && interventionCode) {
        res = await addInterventionToVisit(authorizationCode, interventionCode, selectedIntervention ?? undefined);
        successTitle = t('interventionAdded', 'Intervention added');
      } else if (mode === 'SWITCH' && fromInterventionCode && interventionCode) {
        res = await switchInterventionOnVisit(
          authorizationCode,
          fromInterventionCode,
          interventionCode,
          keepBilledLines,
          selectedIntervention ?? undefined,
        );
        successTitle = t('interventionSwitched', 'Intervention switched');
      } else if (mode === 'RETIRE' && retireCode) {
        res = await retireInterventionOnVisit(authorizationCode, retireCode);
        successTitle = t('interventionRetired', 'Intervention retired');
      } else if (mode === 'RESTORE' && restoreCode) {
        res = await restoreInterventionOnVisit(authorizationCode, restoreCode);
        successTitle = t('interventionRestored', 'Intervention restored');
      }

      if (res && res.success === false) {
        throw new Error(res.error ?? t('interventionActionFailed', 'The intervention action could not be completed.'));
      }

      mutate();
      showSnackbar({ title: successTitle, kind: 'success', isLowContrast: true });
      closeWorkspace({ discardUnsavedChanges: true });
    } catch (e: any) {
      const message = e?.message ?? t('interventionActionFailed', 'The intervention action could not be completed.');
      setError(message);
      showSnackbar({
        title: t('interventionActionFailedTitle', 'Action failed'),
        subtitle: message,
        kind: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitLabel =
    mode === 'ADD'
      ? t('add', 'Add')
      : mode === 'SWITCH'
      ? t('switch', 'Switch')
      : mode === 'RETIRE'
      ? t('retire', 'Retire')
      : t('restore', 'Restore');

  return (
    <Workspace2 hasUnsavedChanges={false} title={t('manageInterventions', 'Manage interventions')}>
      <Form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) {
            onSubmit();
          }
        }}>
        <div className={styles.claimBanner}>
          <span className={styles.bannerLabel}>{t('claimCode', 'Claim code')}</span>
          <span className={styles.bannerValue}>{authorizationCode}</span>
        </div>

        <div className={styles.formContainer}>
          {error && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title={t('interventionActionFailedTitle', 'Action failed')}
              subtitle={error}
              className={styles.notification}
            />
          )}

          <ContentSwitcher
            size="sm"
            className={styles.switcher}
            selectedIndex={modeIndex}
            onChange={({ index }) => handleModeChange(modes[index as number] ?? 'ADD')}>
            <Switch name="ADD" text={t('add', 'Add')} />
            <Switch name="SWITCH" text={t('switch', 'Switch')} disabled={!hasSwitchable} />
            <Switch name="RETIRE" text={t('retire', 'Retire')} disabled={!hasRetirable} />
            <Switch name="RESTORE" text={t('restore', 'Restore')} disabled={!hasRestorable} />
          </ContentSwitcher>

          <p className={styles.helper}>
            {mode === 'ADD' &&
              t('manageAddHelper', 'Choose a benefit package and intervention to attach to this claim.')}
            {mode === 'SWITCH' &&
              t('manageSwitchHelper', 'Retire an active intervention and replace it with a new one.')}
            {mode === 'RETIRE' &&
              t(
                'manageRetireHelper',
                'Deactivate an active intervention. It can be restored later. A claim must keep at least one active intervention.',
              )}
            {mode === 'RESTORE' && t('manageRestoreHelper', 'Bring a previously-retired intervention back to active.')}
          </p>

          {mode === 'SWITCH' && (
            <FormGroup legendText={t('switchFrom', 'Switch from (will be retired)')}>
              <ComboBox
                id="manage-switch-from"
                titleText=""
                placeholder={t('chooseActiveIntervention', 'Choose currently-active intervention')}
                items={activeItems}
                itemToString={(i: any) => (i ? i.text : '')}
                selectedItem={activeItems.find((i) => i.code === fromInterventionCode) ?? null}
                onChange={({ selectedItem }) => setFromInterventionCode(selectedItem ? selectedItem.code : null)}
              />
            </FormGroup>
          )}

          {mode === 'RETIRE' && (
            <FormGroup legendText={t('retireWhich', 'Retire which intervention')}>
              <ComboBox
                id="manage-retire"
                titleText=""
                placeholder={t('chooseActiveIntervention', 'Choose currently-active intervention')}
                items={activeItems}
                itemToString={(i: any) => (i ? i.text : '')}
                selectedItem={activeItems.find((i) => i.code === retireCode) ?? null}
                onChange={({ selectedItem }) => setRetireCode(selectedItem ? selectedItem.code : null)}
              />
            </FormGroup>
          )}

          {mode === 'RESTORE' && (
            <FormGroup legendText={t('restoreWhich', 'Restore which intervention')}>
              <ComboBox
                id="manage-restore"
                titleText=""
                placeholder={t('chooseInactiveIntervention', 'Choose a previously-retired intervention')}
                items={inactiveItems}
                itemToString={(i: any) => (i ? i.text : '')}
                selectedItem={inactiveItems.find((i) => i.code === restoreCode) ?? null}
                onChange={({ selectedItem }) => setRestoreCode(selectedItem ? selectedItem.code : null)}
              />
            </FormGroup>
          )}

          {(mode === 'ADD' || mode === 'SWITCH') && (
            <>
              <FormGroup
                legendText={mode === 'SWITCH' ? t('switchToPackage', 'Switch to — Package') : t('package', 'Package')}>
                {loadingSubBenefits ? (
                  <InlineLoading description={t('loadingBenefits', 'Loading benefits...')} />
                ) : (
                  <ComboBox
                    id="manage-subbenefit"
                    titleText=""
                    placeholder={t('choosePackage', 'Choose a benefit package')}
                    items={subBenefitItems}
                    itemToString={(i: any) => (i ? i.text : '')}
                    selectedItem={subBenefitItems.find((i) => i.code === subBenefitCode) ?? null}
                    onChange={({ selectedItem }) => {
                      setSubBenefitCode(selectedItem ? selectedItem.code : null);
                      setInterventionCode(null);
                    }}
                  />
                )}
              </FormGroup>

              {subBenefitCode && (
                <FormGroup
                  legendText={
                    mode === 'SWITCH'
                      ? t('switchToIntervention', 'Switch to — Intervention')
                      : t('intervention', 'Intervention')
                  }>
                  {loadingInterventions ? (
                    <InlineLoading description={t('loadingInterventions', 'Loading interventions...')} />
                  ) : (
                    <ComboBox
                      id="manage-intervention"
                      titleText=""
                      placeholder={t('chooseIntervention', 'Choose an intervention')}
                      items={interventionItems}
                      itemToString={(i: any) => (i ? i.text : '')}
                      selectedItem={interventionItems.find((i) => i.code === interventionCode) ?? null}
                      shouldFilterItem={({ item, inputValue }: any) =>
                        !inputValue || !item ? true : item.text.toLowerCase().includes(inputValue.toLowerCase())
                      }
                      onChange={({ selectedItem }) => {
                        if (selectedItem && !selectedItem.disabled) {
                          setInterventionCode(selectedItem.code);
                        } else if (!selectedItem) {
                          setInterventionCode(null);
                        }
                      }}
                    />
                  )}
                </FormGroup>
              )}

              {selectedIntervention && (
                <div className={styles.previewRow}>
                  <Tag size="md" type={selectedIntervention.needs_preauth ? 'magenta' : 'green'}>
                    {selectedIntervention.needs_preauth
                      ? t('preauthRequired', 'Preauth required')
                      : t('noPreauthNeeded', 'No preauth needed')}
                  </Tag>
                  {showPreauthType && (
                    <Tag size="md" type={PREAUTH_TYPE_COLORS[preauthType] ?? 'gray'}>
                      {t('preauthTypeTag', '{{type}} preauth', { type: preauthType })}
                    </Tag>
                  )}
                </div>
              )}

              {mode === 'SWITCH' && (
                <Checkbox
                  id="manage-keep-lines"
                  labelText={t('keepBilledLinesHelper', 'Keep existing billed lines on the retired intervention')}
                  checked={keepBilledLines}
                  onChange={(_e, { checked }) => setKeepBilledLines(checked)}
                />
              )}
            </>
          )}
        </div>

        <ButtonSet className={classNames({ [styles.tablet]: isTablet, [styles.desktop]: !isTablet })}>
          <Button
            className={styles.button}
            kind="secondary"
            onClick={() => closeWorkspace({ discardUnsavedChanges: true })}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button className={styles.button} kind="primary" type="submit" disabled={!canSubmit}>
            {isSubmitting ? (
              <InlineLoading className={styles.spinner} description={t('working', 'Working') + '...'} />
            ) : (
              <span>{submitLabel}</span>
            )}
          </Button>
        </ButtonSet>
      </Form>
    </Workspace2>
  );
};

export default ManageInterventionsWorkspace;
