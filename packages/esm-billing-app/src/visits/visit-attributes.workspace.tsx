import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import { mutate } from 'swr';
import { Button, ButtonSet, InlineLoading } from '@carbon/react';
import {
  type AssignedExtension,
  Extension,
  ExtensionSlot,
  showSnackbar,
  useLayoutType,
  type Visit,
  type Workspace2DefinitionProps,
  Workspace2,
} from '@openmrs/esm-framework';
import styles from './visit-attributes.workspace.scss';

interface VisitFormCallbacks {
  onVisitCreatedOrUpdated: (visit: Visit) => Promise<unknown>;
  onBeforeVisitSave?: () => Promise<boolean>;
  isSHAVisit?: boolean;
  isElectiveNotApproved?: boolean;
  isCoverageExhausted?: boolean;
}

type VisitAttributesWorkspaceProps = {
  patientUuid: string;
  visit: Visit;
  workspaceTitle?: string;
};

const SLOT_NAME = 'billing-visit-attributes-slot';

const VisitAttributesWorkspace: React.FC<Workspace2DefinitionProps<VisitAttributesWorkspaceProps, {}, {}>> = ({
  closeWorkspace,
  workspaceProps: { patientUuid, visit, workspaceTitle },
}) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';

  const [callbacks, setCallbacks] = useState<Map<string, VisitFormCallbacks>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const registerCallbacks = useCallback((extensionId: string, cb: VisitFormCallbacks) => {
    setCallbacks((old) => new Map(old).set(extensionId, cb));
  }, []);

  const submitDisabled = [...callbacks.values()].some((cb) => cb.isElectiveNotApproved || cb.isCoverageExhausted);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      for (const cb of callbacks.values()) {
        if (typeof cb.onBeforeVisitSave === 'function') {
          const canProceed = await cb.onBeforeVisitSave();
          if (!canProceed) {
            return;
          }
        }
      }

      await Promise.all([...callbacks.values()].map((cb) => cb.onVisitCreatedOrUpdated(visit)));

      mutate((key) => typeof key === 'string' && key.includes('/visit?includeInactive=false'), undefined, {
        revalidate: true,
      });

      showSnackbar({
        kind: 'success',
        isLowContrast: true,
        title: t('visitDetailsSaved', 'Visit details saved'),
        subtitle: t('visitDetailsSavedSubtitle', 'The details were attached to the visit successfully.'),
      });

      closeWorkspace({ discardUnsavedChanges: true });
    } catch {
      // Extensions surface their own error snackbars; keep the workspace open on failure.
    } finally {
      setIsSubmitting(false);
    }
  }, [callbacks, visit, closeWorkspace, t]);

  return (
    <Workspace2 hasUnsavedChanges={callbacks.size > 0} title={workspaceTitle ?? t('manageVisit', 'Manage visit')}>
      <div className={styles.form}>
        <div className={styles.formContainer}>
          <ExtensionSlot name={SLOT_NAME}>
            {(extension: AssignedExtension) => (
              <Extension
                state={{
                  patientUuid,
                  setVisitFormCallbacks: (cb: VisitFormCallbacks) => registerCallbacks(extension.id, cb),
                  visitFormOpenedFrom: 'service-queues-add-patient',
                  visitStatus: 'ongoing',
                  patientChartConfig: { isDHAWorkflow: false },
                  visitTypeUuid: visit.visitType?.uuid,
                }}
              />
            )}
          </ExtensionSlot>
        </div>

        <ButtonSet className={classNames(styles.buttonSet, { [styles.tablet]: isTablet, [styles.desktop]: !isTablet })}>
          <Button className={styles.button} kind="secondary" onClick={() => closeWorkspace()}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button
            className={styles.button}
            kind="primary"
            disabled={isSubmitting || submitDisabled}
            onClick={handleSubmit}>
            {isSubmitting ? (
              <InlineLoading className={styles.spinner} description={t('saving', 'Saving') + '...'} />
            ) : (
              <span>{t('saveAndClose', 'Save & close')}</span>
            )}
          </Button>
        </ButtonSet>
      </div>
    </Workspace2>
  );
};

export default VisitAttributesWorkspace;
