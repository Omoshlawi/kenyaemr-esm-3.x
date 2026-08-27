import React from 'react';
import { SkeletonText } from '@carbon/react';
import { age, ErrorState } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import styles from '../pcs.scss';
import { formatParticipantName, usePcsDependants } from '../resources/pcs.resource';
import { GENDER_ICONS, SEX_LABELS } from './participant-details.component';

interface DependantsListProps {
  /** The linked participant — dependants are those whose mother is this individual. */
  motherIndividualId: string;
}

/** The linked client's children in PCS. Display-only. */
const DependantsList: React.FC<DependantsListProps> = ({ motherIndividualId }) => {
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
        <div className={styles.pcsTile} key={dependant.individualId}>
          <div className={styles.pcsRow}>
            <span className={styles.pcsName}>{formatParticipantName(dependant)}</span>
          </div>
          <div className={styles.pcsRow}>
            <span className={styles.genderIcon}>
              {GENDER_ICONS[dependant.sex]}
              <span>{SEX_LABELS[dependant.sex]}</span>
            </span>
            {dependant.dateOfBirth && (
              <>
                <span className={styles.separator}>&middot;</span>
                <span>{age(dependant.dateOfBirth)}</span>
              </>
            )}
          </div>
          <div className={styles.pcsRow}>
            <span className={styles.pcsFieldLabel}>{t('individualId', 'Individual ID')}:</span>
            <span>{dependant.individualId}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DependantsList;
