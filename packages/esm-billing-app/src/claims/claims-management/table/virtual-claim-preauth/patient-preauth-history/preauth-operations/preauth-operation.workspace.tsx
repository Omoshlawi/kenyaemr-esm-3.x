import {
  Button,
  ButtonSet,
  Form,
  InlineLoading,
  InlineNotification,
  Layer,
  MultiSelect,
  Select,
  SelectItem,
  Stack,
  Tag,
} from '@carbon/react';
import {
  ExtensionSlot,
  showModal,
  showSnackbar,
  useConfig,
  useLayoutType,
  Workspace2,
  type Workspace2DefinitionProps,
} from '@openmrs/esm-framework';
import { zodResolver } from '@hookform/resolvers/zod';
import classNames from 'classnames';
import React, { useState, useCallback } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import styles from './preauth-operation.scss';
import { BillingConfig } from '../../../../../../config-schema';
import {
  sendSHAOtp,
  usePatientPhone,
  useSHAInterventions,
  useSHASubBenefits,
} from '../../../../../../billing-form/social-health-authority/sha-virtual-claim.resource';
import { extractUpstreamError } from '../../utils';
import usePatient from '../../../../../../hooks/usePatient';
import { virtualClaimBaseUrl } from '../../constants';
import { handleMutation } from '../../../../../../bill-administration/payment-modes/payment-mode.resource';

interface PreauthOperationFormProps {
  mutate?: () => void;
  workspaceTitle?: string;
  operationType: 'add' | 'switch' | 'restore' | 'retire' | 'delete';
  authorizationCode?: string;
}

const PreauthOperationForm: React.FC<Workspace2DefinitionProps<PreauthOperationFormProps, object, object>> = ({
  closeWorkspace,
  workspaceProps,
}) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const closeWorkspaceWithSavedChanges = () => {
    setHasUnsavedChanges(false);
    closeWorkspace({ discardUnsavedChanges: true });
  };
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const { mutate } = workspaceProps ?? {};
  const workspaceTitle = workspaceProps?.workspaceTitle ?? t('preauthOperations', 'Preauthorization Operations');

  const { crIdentificationNumberUUID } = useConfig<BillingConfig>();
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authorizeError, setAuthorizeError] = useState('');

  return (
    <Workspace2 title={workspaceTitle} hasUnsavedChanges={hasUnsavedChanges}>
      <Form className={styles.form} onSubmit={() => {}}>
        <div className={styles.formBody}>
          <Stack gap={5}></Stack>
        </div>

        {/* <ButtonSet className={classNames({ [styles.tablet]: isTablet, [styles.desktop]: !isTablet })}>
          <Button className={styles.button} kind="secondary" onClick={() => closeWorkspace({ discardUnsavedChanges: true })}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button
            className={styles.button}
            kind="primary"
            type="submit"
            disabled={isAuthorizing || !crId || interventionCodes.length === 0}>
            {isAuthorizing ? (
              <InlineLoading description={t('sendingOtp', 'Sending OTP...')} />
            ) : (
              t('addIntervention', 'Add Intervention')
            ):(
            t('switchIntervention', 'Switch Intervention')
            ):(
             t('restoreIntervention', 'Restore Intervention')
            ):(
                t('retireIntervention', 'Retire Intervention')
            ):(
                t('deleteIntervention', 'Delete Intervention')
            }}
          </Button>
        </ButtonSet> */}
      </Form>
    </Workspace2>
  );
};

export default PreauthOperationForm;
