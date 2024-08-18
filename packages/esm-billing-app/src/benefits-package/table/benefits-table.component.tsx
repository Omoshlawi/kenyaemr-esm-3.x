import { Button, Layer, Tile } from '@carbon/react';
import { ArrowRight } from '@carbon/react/icons';
import {
  CardHeader,
  EmptyDataIllustration,
  EmptyState,
  getPatientUuidFromUrl,
  launchPatientWorkspace,
} from '@openmrs/esm-patient-common-lib';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PatientBenefit } from '../../types';
import styles from './benebfits-table.scss';
import GenericDataTable from './generic_data_table.component';

const BenefitsTable = () => {
  const { t } = useTranslation();
  const patientUuid = getPatientUuidFromUrl();
  const [eligibleBenefits, setEligibleBenefits] = useState<Array<PatientBenefit>>([]);
  const [eligible, setEligible] = useState(false);
  const headerTitle = t('benefits', 'Benefits');

  const handleLaunchRequestEligibility = () => {
    launchPatientWorkspace('benefits-eligibility-request-form', {
      workspaceTitle: 'Benefits Eligibility Request Form',
      patientUuid,
      onSuccess: (eligibleBenefits: Array<PatientBenefit>) => {
        setEligibleBenefits(eligibleBenefits);
        setEligible(true);
      },
    });
  };

  if (!eligible) {
    return (
      <div>
        <Layer>
          <Tile className={styles.tile}>
            <CardHeader title={headerTitle}>
              <Button
                kind="ghost"
                renderIcon={ArrowRight}
                onClick={handleLaunchRequestEligibility}
                className={styles.btnOutline}>
                {t('requestEligibility', 'Request Eligibility')}
              </Button>
            </CardHeader>
            <EmptyDataIllustration />
            <p className={styles.content}>{t('noBenefits', 'No benefit packages, request eligibility')}</p>
            <Button onClick={handleLaunchRequestEligibility} renderIcon={ArrowRight} kind="ghost">
              {t('requestEligibility', 'Request Eligibility')}
            </Button>
          </Tile>
        </Layer>
      </div>
    );
  }
  if (eligibleBenefits.length === 0) {
    return <EmptyState headerTitle={headerTitle} displayText={headerTitle} />;
  }

  const headers = [
    {
      key: 'shaPackageCode',
      header: 'Package Code',
    },
    {
      key: 'shaPackageName',
      header: 'Package Name',
    },
    {
      key: 'shaInterventionCode',
      header: 'Intervension Code',
    },
    {
      key: 'shaInterventionName',
      header: 'Intervension Name',
    },
    {
      key: 'shaInterventioTariff',
      header: 'Intervension Tariff',
    },
    {
      key: 'status',
      header: 'Approval status',
    },
    {
      key: 'action',
      header: 'Action',
    },
  ];

  const handleLaunchPreAuthForm = (benefit: PatientBenefit) => {
    // benefits-pre-auth-form
    launchPatientWorkspace('benefits-pre-auth-form', {
      workspaceTitle: 'Benefits Pre-Auth Form',
      patientUuid,
      benefit,
      onSuccess: (benefits) => {
        // setBenefits(benefits);
      },
    });
  };

  const rows = eligibleBenefits.map((benefit) => ({
    id: benefit.shaPackageCode,
    ...benefit,
    action: benefit.requirePreauth ? (
      <Button renderIcon={ArrowRight} onClick={() => handleLaunchPreAuthForm(benefit)}>
        Pre-Auth
      </Button>
    ) : (
      '--'
    ),
  }));

  return <GenericDataTable rows={rows} headers={headers} title={t('benefits', 'Benefits')} />;
};

export default BenefitsTable;