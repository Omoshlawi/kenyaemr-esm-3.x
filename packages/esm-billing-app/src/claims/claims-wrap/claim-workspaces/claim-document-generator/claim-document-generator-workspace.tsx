import React from 'react';
import { useTranslation } from 'react-i18next';
import { Workspace2, type Workspace2DefinitionProps } from '@openmrs/esm-framework';

import styles from './claim-document-generator.scss';
import ClaimDocumentGenerator from './claim-document-generator.component';
import { type UseClaimDocumentGeneratorArgs } from './use-claim-document-generator';

type ClaimDocumentGeneratorWorkspaceProps = UseClaimDocumentGeneratorArgs & {
  interventionName?: string;
};

const ClaimDocumentGeneratorWorkspace: React.FC<
  Workspace2DefinitionProps<ClaimDocumentGeneratorWorkspaceProps, {}, {}>
> = ({ workspaceProps }) => {
  const { t } = useTranslation();

  if (!workspaceProps) {
    return null;
  }

  const { interventionName, interventionCode, ...generatorProps } = workspaceProps;

  return (
    <Workspace2 hasUnsavedChanges={false} title={t('generateDocuments', 'Generate documents')}>
      <div className={styles.workspace}>
        <div className={styles.banner}>
          <div className={styles.bannerItem}>
            <span className={styles.bannerLabel}>{t('ivName', 'Intervention name')}</span>
            <span className={styles.bannerValue}>{interventionName ?? interventionCode}</span>
          </div>
          <div className={styles.bannerItem}>
            <span className={styles.bannerLabel}>{t('ivCode', 'Intervention code')}</span>
            <span className={styles.bannerValue}>{interventionCode}</span>
          </div>
        </div>
        <ClaimDocumentGenerator interventionCode={interventionCode} {...generatorProps} />
      </div>
    </Workspace2>
  );
};

export default ClaimDocumentGeneratorWorkspace;
