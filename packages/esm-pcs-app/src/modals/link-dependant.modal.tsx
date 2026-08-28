import React, { useMemo, useState } from 'react';
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
  StructuredListBody,
  StructuredListCell,
  StructuredListRow,
  StructuredListWrapper,
} from '@carbon/react';
import { showSnackbar, useConfig } from '@openmrs/esm-framework';

import { type PcsConfig } from '../config-schema';
import { useIdentifierTypeUuids } from '../resources/use-identifier-type-uuids';
import { getDependentsFromContacts } from '../resources/hie-contacts';
import { formatParticipantName, getPrimaryContact } from '../resources/pcs.resource';
import {
  createAndLinkFromParticipant,
  linkDependantToParticipant,
  useHieDependantLinkState,
} from '../resources/link-dependant.resource';
import { type PcsParticipant } from '../types';
import styles from './link-participant.scss';

interface LinkDependantModalProps {
  closeModal: () => void;
  /** The PCS dependant being linked to. */
  participant: PcsParticipant;
  /** The mother's HIE record — her `contact` array is the candidate list. */
  hiePatient?: fhir.Patient;
  parentPhoneNumber?: string;
  onLinked?: () => void;
}

/** Sentinel for "PCS knows this child, the HIE does not". */
const PCS_DETAILS_OPTION = '__pcs_details__';

const LinkDependantModal: React.FC<LinkDependantModalProps> = ({
  closeModal,
  participant,
  hiePatient,
  parentPhoneNumber,
  onLinked,
}) => {
  const { t } = useTranslation();
  const uuids = useIdentifierTypeUuids();
  const { pcsIdentifiers, pcsAttributeTypes, nationalIdUUID, phoneAttributeTypeUUID } = useConfig<PcsConfig>();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Read straight off the record already in hand — no request.
  const candidates = useMemo(() => (hiePatient ? getDependentsFromContacts(hiePatient as any) : []), [hiePatient]);
  const isFromPcsDetails = selectedId === PCS_DETAILS_OPTION;
  const selected = candidates.find((candidate) => candidate.id === selectedId);
  const yesNo = (flag: boolean) => (flag ? t('yes', 'Yes') : t('no', 'No'));
  const primaryContact = getPrimaryContact(participant);

  // A candidate already linked to some participant must not be offered: linking them again
  // would re-point that child from one participant to another.
  const { linkedById, isChecking } = useHieDependantLinkState(candidates, [
    pcsIdentifiers.studyParticipantID,
    pcsIdentifiers.studyTemporaryParticipantID,
  ]);

  const handleLink = async () => {
    if (!selected && !isFromPcsDetails) {
      return;
    }
    setLinkError(null);
    setIsLinking(true);
    try {
      const studyTypes = {
        studyParticipantIdentifierType: pcsIdentifiers.studyParticipantID,
        pbidsEnrollmentAttributeType: pcsAttributeTypes.pbidsEnrollmentStatus,
        cardseEnrollmentAttributeType: pcsAttributeTypes.cardseEnrollmentStatus,
      };

      if (isFromPcsDetails) {
        // The participant already holds a permanent individualId, so this stamps that —
        // nothing temporary is minted and PCS keeps one record for the child.
        await createAndLinkFromParticipant({ participant, nationalIdUUID, phoneAttributeTypeUUID, ...studyTypes });
      } else {
        await linkDependantToParticipant({
          dependant: selected!,
          parentPhoneNumber,
          participant,
          ...studyTypes,
          uuids,
        });
      }
      showSnackbar({
        title: t('participantLinked', 'Records linked'),
        subtitle: t('participantLinkedSubtitle', 'The patient is now linked to PCS participant {{individualId}}.', {
          individualId: participant.individualId,
        }),
        kind: 'success',
        isLowContrast: true,
      });
      onLinked?.();
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

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('linkDependantToPcs', 'Link dependant to PCS')} />
      <ModalBody>
        <div className={styles.comparison}>
          <div className={styles.side}>
            <span className={styles.sideLabel}>{t('pcsParticipant', 'PCS participant')}</span>
            <span className={styles.sideValue}>{formatParticipantName(participant)}</span>
          </div>
          <div className={styles.side}>
            <span className={styles.sideLabel}>{t('individualId', 'Individual ID')}</span>
            <span className={styles.sideValue}>{participant.individualId}</span>
          </div>
        </div>

        <p className={styles.willWrite}>{t('mothersDependantsInHie', "Mother's dependants in the HIE")}</p>

        {candidates.length === 0 && (
          <p className={styles.note}>{t('noHieDependants', 'The HIE record lists no dependants for this mother.')}</p>
        )}

        {/* The PCS-details option is always offered, including when the mother has no HIE
            contacts at all — which is exactly the case it exists for. */}
        <RadioButtonGroup
          name="hieDependant"
          orientation="vertical"
          valueSelected={selectedId ?? undefined}
          onChange={(value) => setSelectedId(String(value))}>
          {candidates.map((candidate) => {
            const linkedTo = linkedById[candidate.id];

            return (
              <RadioButton
                key={candidate.id}
                value={candidate.id}
                // Disabled while the check runs too, so nothing can be picked in the window
                // before its state is known.
                disabled={isChecking || Boolean(linkedTo)}
                labelText={`${candidate.name} · ${candidate.relationship} · ${candidate.gender}${
                  candidate.birthDate && candidate.birthDate !== 'Unknown' ? ` · ${candidate.birthDate}` : ''
                }${
                  linkedTo
                    ? ` — ${t('alreadyLinkedTo', 'already linked to {{individualId}}', { individualId: linkedTo })}`
                    : ''
                }`}
              />
            );
          })}
          <RadioButton
            value={PCS_DETAILS_OPTION}
            labelText={t('notInHie', 'Not in the HIE — create from PCS details')}
          />
        </RadioButtonGroup>

        {isFromPcsDetails && (
          <p className={styles.note}>
            {t(
              'willCreateFromPcsDetails',
              'A patient will be created as {{name}} · {{sex}}{{dateOfBirth}}{{contact}}.',
              {
                name: formatParticipantName(participant),
                sex: participant.sex,
                dateOfBirth: participant.dateOfBirth ? ` · ${participant.dateOfBirth}` : '',
                contact: primaryContact?.nationalId ? ` · ${primaryContact.nationalId}` : '',
              },
            )}
          </p>
        )}

        {(selected || isFromPcsDetails) && (
          <>
            <p className={styles.willWrite}>
              {t('willBeWritten', 'The following will be written to the patient record')}
            </p>
            <StructuredListWrapper isCondensed selection={false}>
              <StructuredListBody>
                {(
                  [
                    [t('studyParticipantId', 'Study participant ID'), participant.individualId],
                    [t('pbidsEnrollment', 'PBIDS enrollment'), yesNo(participant.pbidsEnrolled)],
                    [t('cardseEnrollment', 'CARDSE enrollment'), yesNo(participant.cardse)],
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
        <Button kind="primary" onClick={handleLink} disabled={isLinking || (!selected && !isFromPcsDetails)}>
          {isLinking ? (
            <InlineLoading description={t('linkingRecords', 'Linking records...')} />
          ) : isFromPcsDetails ? (
            // This branch creates the patient before linking, so say so before it's pressed.
            t('createAndLinkRecords', 'Create and link records')
          ) : (
            t('linkRecords', 'Link records')
          )}
        </Button>
      </ModalFooter>
    </>
  );
};

export default LinkDependantModal;
