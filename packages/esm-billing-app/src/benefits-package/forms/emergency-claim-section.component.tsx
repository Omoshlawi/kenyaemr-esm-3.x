import { Dropdown, Tag, TextArea } from '@carbon/react';
import React, { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import ProviderSearch from '../../claims/claims-management/table/virtual-claim-preauth/pre-auth-workspace/provider-search-component/provider-search-component';
import { type ProviderResult } from '../../claims/claims-management/table/virtual-claim-preauth/type';
import {
  useEmergencyCatalog,
  useEmergencyInterventions,
  type EmergencyCatalogEntry,
  type EmergencyInterventionEntry,
} from '../../billing-form/social-health-authority/sha-virtual-claim.resource';
import styles from './emergency-claim-section.scss';

export type EmergencyClaimData = {
  interventionCode: string;
  modeOfArrival: string;
  broughtBy: string;
  identificationNumber: string;
  identificationType: string;
  regulationBody: string;
  notes?: string;
};

type EmergencyClaimSectionProps = {
  patientCRId?: string;
  onChange: (data: EmergencyClaimData | null) => void;
};

const EmergencyClaimSection: React.FC<EmergencyClaimSectionProps> = ({ patientCRId, onChange }) => {
  const { t } = useTranslation();
  const form = useFormContext<{ interventions: string | null }>();

  const isIdentified = Boolean(patientCRId);

  const { entries: modeOfArrivalEntries, isLoading: isLoadingModes } = useEmergencyCatalog('mode-of-arrival');
  const { entries: broughtByEntries, isLoading: isLoadingBroughtBy } = useEmergencyCatalog('brought-by');
  const { interventions: emergencyInterventions, isLoading: isLoadingInterventions } = useEmergencyInterventions();

  const [modeOfArrival, setModeOfArrival] = useState<EmergencyCatalogEntry | null>(null);
  const [broughtBy, setBroughtBy] = useState<EmergencyCatalogEntry | null>(null);
  const [emergencyIntervention, setEmergencyIntervention] = useState<EmergencyInterventionEntry | null>(null);
  const [doctorDisplay, setDoctorDisplay] = useState('');
  const [identificationNumber, setIdentificationNumber] = useState('');
  const [regulationBody, setRegulationBody] = useState('');
  const [notes, setNotes] = useState('');

  const interventionCode = isIdentified ? form.watch('interventions') ?? null : emergencyIntervention?.value ?? null;

  const itemToString = <T extends { label: string }>(item: T | null): string => item?.label ?? '';

  useEffect(() => {
    const isComplete = Boolean(
      interventionCode && modeOfArrival && broughtBy && identificationNumber.trim() && regulationBody.trim(),
    );
    onChange(
      isComplete
        ? {
            interventionCode: interventionCode!,
            modeOfArrival: modeOfArrival!.value,
            broughtBy: broughtBy!.value,
            identificationNumber: identificationNumber.trim(),
            identificationType: 'registration_number',
            regulationBody: regulationBody.trim(),
            notes: notes.trim() || undefined,
          }
        : null,
    );
  }, [interventionCode, modeOfArrival, broughtBy, identificationNumber, regulationBody, notes, onChange]);

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>{t('emergencyClaim', 'Emergency claim')}</span>
        <Tag type={isIdentified ? 'green' : 'gray'} size="lg">
          {isIdentified ? t('identifiedPatient', 'Identified') : t('unidentifiedPatient', 'Unidentified')}
        </Tag>
      </div>

      <div className={styles.grid}>
        {!isIdentified && (
          <Dropdown
            id="emergency-intervention"
            titleText={t('emergencyIntervention', 'Emergency intervention')}
            label={isLoadingInterventions ? t('loading', 'Loading...') : t('select', 'Select')}
            items={emergencyInterventions}
            itemToString={itemToString}
            selectedItem={emergencyIntervention}
            onChange={({ selectedItem }) => setEmergencyIntervention(selectedItem)}
          />
        )}
        <Dropdown
          id="emergency-mode-of-arrival"
          titleText={t('modeOfArrival', 'Mode of arrival')}
          label={isLoadingModes ? t('loading', 'Loading...') : t('select', 'Select')}
          items={modeOfArrivalEntries}
          itemToString={itemToString}
          selectedItem={modeOfArrival}
          onChange={({ selectedItem }) => setModeOfArrival(selectedItem)}
        />
        <Dropdown
          id="emergency-brought-by"
          titleText={t('broughtBy', 'Brought by')}
          label={isLoadingBroughtBy ? t('loading', 'Loading...') : t('select', 'Select')}
          items={broughtByEntries}
          itemToString={itemToString}
          selectedItem={broughtBy}
          onChange={({ selectedItem }) => setBroughtBy(selectedItem)}
        />
        <TextArea
          id="emergency-notes"
          labelText={t('notes', 'Notes')}
          value={notes}
          rows={2}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>

      <div className={styles.doctor}>
        <span className={styles.doctorLabel}>{t('attendingDoctor', 'Attending doctor')}</span>
        <ProviderSearch
          idx={0}
          editable
          identifierLabel={t('practisingLicenseNumber', 'Practising license number')}
          selectedDisplay={doctorDisplay}
          selectedLicenseNumber={identificationNumber}
          selectedRegulationBody={regulationBody}
          onSelect={(provider: ProviderResult) => {
            setDoctorDisplay(provider.person?.display ?? '');
            setIdentificationNumber(provider.licenseNumber ?? '');
            setRegulationBody(provider.licenseBody ?? '');
          }}
          onLicenseNumberChange={setIdentificationNumber}
          onRegulationBodyChange={setRegulationBody}
        />
      </div>
    </section>
  );
};

export default EmergencyClaimSection;
