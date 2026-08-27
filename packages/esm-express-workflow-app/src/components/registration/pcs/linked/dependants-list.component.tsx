import React from 'react';
import { SkeletonText } from '@carbon/react';
import { ErrorState } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import styles from '../pcs.scss';
import { usePcsDependants } from '../resources/pcs.resource';
import DependantRow from './dependant-row.component';

interface DependantsListProps {
  /** The linked participant — dependants are those whose mother is this individual. */
  motherIndividualId: string;
  /** The mother's HIE record, passed down so a row can offer to link one of her contacts. */
  hiePatient?: fhir.Patient;
  parentPhoneNumber?: string;
}

/** The linked client's children in PCS. Display-only. */
const DependantsList: React.FC<DependantsListProps> = ({ motherIndividualId, hiePatient, parentPhoneNumber }) => {
  const { t } = useTranslation();
  // SWR dedupes this with the identical call in the parent that supplies the tab count.
  const { dependants, isLoading, error } = usePcsDependants(motherIndividualId);

  if (isLoading) {
    return (
      <div className={styles.pcsSkeletonTile}>
        <SkeletonText paragraph lineCount={3} />
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} headerTitle={t('errorLoadingDependants', 'Error loading dependants')} />;
  }

  if (dependants.length === 0) {
    return (
      <div className={styles.pcsLinkError}>
        <p className={styles.pcsEmptyTitle}>{t('noDependants', 'No dependants')}</p>
        <p className={styles.pcsEmptySubtitle}>
          {t('noDependantsSubtitle', 'PCS has no participants recorded with this mother.')}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.pcsResults}>
      {dependants.map((dependant) => (
        <DependantRow
          key={dependant.individualId}
          dependant={dependant}
          hiePatient={hiePatient}
          parentPhoneNumber={parentPhoneNumber}
        />
      ))}
    </div>
  );
};

export default DependantsList;
