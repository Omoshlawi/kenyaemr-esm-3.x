import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  InlineLoading,
  InlineNotification,
  ModalBody,
  ModalFooter,
  ModalHeader,
  RadioButton,
  RadioButtonGroup,
  SkeletonText,
  StructuredListBody,
  StructuredListCell,
  StructuredListRow,
  StructuredListWrapper,
} from '@carbon/react';
import { age, ErrorState, showSnackbar, useConfig } from '@openmrs/esm-framework';

import { type ExpressWorkflowConfig } from '../../../../config-schema';
import { formatParticipantName, usePcsDependants } from '../resources/pcs.resource';
import { assignTemporaryStudyId, linkDependantToParticipant } from '../resources/link-dependant.resource';
import styles from './link-participant.scss';

interface LinkDependantModalProps {
  closeModal: () => void;
  /** A row from `getDependentsFromContacts`. */
  dependant: any;
  parentPhoneNumber?: string;
  /** The mother's PCS individual ID — her dependants are what this lists. */
  motherIndividualId: string;
  onLinked?: (localPatient?: any) => void;
}

/** Sentinel for "not in PCS yet" — kept in the same selection model as the candidates. */
const TEMPORARY_OPTION = '__temporary__';

const LinkDependantModal: React.FC<LinkDependantModalProps> = ({
  closeModal,
  dependant,
  parentPhoneNumber,
  motherIndividualId,
  onLinked,
}) => {
  const { t } = useTranslation();
  const { pcsIdentifiers, pcsAttributeTypes } = useConfig<ExpressWorkflowConfig>();
  const { dependants, isLoading, error } = usePcsDependants(motherIndividualId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const isTemporary = selectedId === TEMPORARY_OPTION;
  const selected = dependants.find((candidate) => candidate.individualId === selectedId);
  const yesNo = (flag: boolean) => (flag ? t('yes', 'Yes') : t('no', 'No'));

  const handleLink = async () => {
    if (!selected && !isTemporary) {
      return;
    }
    setLinkError(null);
    setIsLinking(true);
    try {
      if (isTemporary) {
        const { localPatient, participant } = await assignTemporaryStudyId({
          dependant,
          parentPhoneNumber,
          motherIndividualId,
          t,
        });
        showSnackbar({
          title: t('temporaryStudyIdAssigned', 'Temporary study ID assigned'),
          subtitle: participant?.individualId
            ? t('temporaryStudyIdAssignedSubtitle', 'PCS issued {{individualId}} for this dependant.', {
                individualId: participant.individualId,
              })
            : undefined,
          kind: 'success',
          isLowContrast: true,
        });
        onLinked?.(localPatient);
        closeModal();
        return;
      }

      const localPatient = await linkDependantToParticipant({
        dependant,
        parentPhoneNumber,
        participant: selected!,
        studyParticipantIdentifierType: pcsIdentifiers.studyParticipantID,
        pbidsEnrollmentAttributeType: pcsAttributeTypes.pbidsEnrollmentStatus,
        cardseEnrollmentAttributeType: pcsAttributeTypes.cardseEnrollmentStatus,
        t,
      });
      showSnackbar({
        title: t('participantLinked', 'Records linked'),
        subtitle: t('participantLinkedSubtitle', 'The patient is now linked to PCS participant {{individualId}}.', {
          individualId: selected.individualId,
        }),
        kind: 'success',
        isLowContrast: true,
      });
      onLinked?.(localPatient);
      closeModal();
    } catch (e: any) {
      // A study ID already held by another patient comes back from OpenMRS as a duplicate
      // identifier error — worth showing verbatim.
      setLinkError(
        e?.responseBody?.error?.message ??
          e?.message ??
          t('participantLinkFailedSubtitle', 'The patient record could not be updated.'),
      );
    } finally {
      setIsLinking(false);
    }
  };

  const renderCandidates = () => {
    const temporaryOption = (
      <RadioButton value={TEMPORARY_OPTION} labelText={t('notInPcs', 'Not in PCS — issue a temporary study ID')} />
    );

    return (
      <>
        {isLoading && <SkeletonText paragraph lineCount={3} />}
        {!isLoading && error && (
          <ErrorState error={error} headerTitle={t('errorLoadingDependants', 'Error loading dependants')} />
        )}
        {!isLoading && !error && dependants.length === 0 && (
          <p className={styles.note}>
            {t('noDependantsSubtitle', 'PCS has no participants recorded with this mother.')}
          </p>
        )}

        <RadioButtonGroup
          name="pcsDependant"
          orientation="vertical"
          valueSelected={selectedId ?? undefined}
          onChange={(value) => setSelectedId(String(value))}>
          {dependants.map((candidate) => (
            <RadioButton
              key={candidate.individualId}
              value={candidate.individualId}
              labelText={`${formatParticipantName(candidate)} · ${candidate.individualId} · ${candidate.sex}${
                candidate.dateOfBirth ? ` · ${age(candidate.dateOfBirth)}` : ''
              }`}
            />
          ))}
          {temporaryOption}
        </RadioButtonGroup>
      </>
    );
  };

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('linkDependantToPcs', 'Link dependant to PCS')} />
      <ModalBody>
        <div className={styles.comparison}>
          <div className={styles.side}>
            <span className={styles.sideLabel}>{t('emrDependant', 'EMR dependant')}</span>
            <span className={styles.sideValue}>{dependant?.name}</span>
          </div>
        </div>

        <p className={styles.willWrite}>{t('mothersDependantsInPcs', "Mother's dependants in PCS")}</p>
        {renderCandidates()}

        {isTemporary && (
          <p className={styles.note}>
            {t('temporaryIdWillBeIssued', 'PCS will generate a temporary study ID and assign it to this patient.')}
          </p>
        )}

        {selected && (
          <>
            <p className={styles.willWrite}>
              {t('willBeWritten', 'The following will be written to the patient record')}
            </p>
            <StructuredListWrapper isCondensed selection={false}>
              <StructuredListBody>
                {(
                  [
                    [t('studyParticipantId', 'Study participant ID'), selected.individualId],
                    [t('pbidsEnrollment', 'PBIDS enrollment'), yesNo(selected.pbidsEnrolled)],
                    [t('cardseEnrollment', 'CARDSE enrollment'), yesNo(selected.cardse)],
                  ] as Array<[string, string]>
                ).map(([label, value]) => (
                  <StructuredListRow key={label}>
                    <StructuredListCell>{label}</StructuredListCell>
                    <StructuredListCell className={styles.value}>{value}</StructuredListCell>
                  </StructuredListRow>
                ))}
              </StructuredListBody>
            </StructuredListWrapper>
          </>
        )}

        {linkError && (
          <InlineNotification
            className={styles.notification}
            kind="error"
            lowContrast
            hideCloseButton
            title={t('participantLinkFailed', 'Could not link records')}
            subtitle={linkError}
          />
        )}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal} disabled={isLinking}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="primary" onClick={handleLink} disabled={isLinking || (!selected && !isTemporary)}>
          {isLinking ? (
            <InlineLoading description={t('linkingRecords', 'Linking records...')} />
          ) : (
            t('linkRecords', 'Link records')
          )}
        </Button>
      </ModalFooter>
    </>
  );
};

export default LinkDependantModal;
