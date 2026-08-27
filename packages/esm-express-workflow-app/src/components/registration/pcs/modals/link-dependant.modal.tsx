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

import { type ExpressWorkflowConfig } from '../../../../config-schema';
import { getDependentsFromContacts } from '../../dependants/dependants.resource';
import { formatParticipantName } from '../resources/pcs.resource';
import { linkDependantToParticipant } from '../resources/link-dependant.resource';
import { type PcsParticipant } from '../pcs.types';
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

const LinkDependantModal: React.FC<LinkDependantModalProps> = ({
  closeModal,
  participant,
  hiePatient,
  parentPhoneNumber,
  onLinked,
}) => {
  const { t } = useTranslation();
  const { pcsIdentifiers, pcsAttributeTypes } = useConfig<ExpressWorkflowConfig>();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Read straight off the record already in hand — no request.
  const candidates = useMemo(() => (hiePatient ? getDependentsFromContacts(hiePatient as any) : []), [hiePatient]);
  const selected = candidates.find((candidate) => candidate.id === selectedId);
  const yesNo = (flag: boolean) => (flag ? t('yes', 'Yes') : t('no', 'No'));

  const handleLink = async () => {
    if (!selected) {
      return;
    }
    setLinkError(null);
    setIsLinking(true);
    try {
      await linkDependantToParticipant({
        dependant: selected,
        parentPhoneNumber,
        participant,
        studyParticipantIdentifierType: pcsIdentifiers.studyParticipantID,
        pbidsEnrollmentAttributeType: pcsAttributeTypes.pbidsEnrollmentStatus,
        cardseEnrollmentAttributeType: pcsAttributeTypes.cardseEnrollmentStatus,
        t,
      });
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

        {candidates.length === 0 ? (
          <p className={styles.note}>{t('noHieDependants', 'The HIE record lists no dependants for this mother.')}</p>
        ) : (
          <RadioButtonGroup
            name="hieDependant"
            orientation="vertical"
            valueSelected={selectedId ?? undefined}
            onChange={(value) => setSelectedId(String(value))}>
            {candidates.map((candidate) => (
              <RadioButton
                key={candidate.id}
                value={candidate.id}
                labelText={`${candidate.name} · ${candidate.relationship} · ${candidate.gender}${
                  candidate.birthDate && candidate.birthDate !== 'Unknown' ? ` · ${candidate.birthDate}` : ''
                }`}
              />
            ))}
          </RadioButtonGroup>
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
        <Button kind="primary" onClick={handleLink} disabled={isLinking || !selected}>
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
