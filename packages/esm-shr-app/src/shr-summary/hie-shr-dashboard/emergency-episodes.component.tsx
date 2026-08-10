import React, { useMemo, useState } from 'react';
import { Tag } from '@carbon/react';
import { formatDatetime, parseDate } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import type { EmergencyEpisode, EmergencyEpisodeEvacuation, FhirReference } from '../../types';
import styles from './hie-shr-dashboard.scss';

interface EmergencyEpisodesSectionProps {
  episodes: Array<EmergencyEpisode>;
}

const formatDate = (value?: string | null): string => {
  if (!value) {
    return '--';
  }
  try {
    return formatDatetime(parseDate(value));
  } catch {
    return value;
  }
};

const referenceLabel = (ref?: FhirReference | string | null): string => {
  if (!ref) {
    return '--';
  }
  if (typeof ref === 'string') {
    return ref;
  }
  return ref.display || ref.name || ref.reference || '--';
};

const shortId = (value?: string | null, fallback = '--'): string => {
  if (!value) {
    return fallback;
  }
  const cleaned = value.includes('/') ? value.split('/').pop() || value : value;
  return cleaned.length > 12 ? cleaned.slice(0, 8) : cleaned;
};

const statusTagType = (status?: string | null): 'green' | 'blue' | 'gray' | 'red' => {
  switch ((status || '').toLowerCase()) {
    case 'finished':
    case 'completed':
      return 'green';
    case 'in-progress':
    case 'active':
      return 'blue';
    case 'cancelled':
    case 'entered-in-error':
      return 'red';
    default:
      return 'gray';
  }
};

const formatDuration = (start?: string | null, end?: string | null): string => {
  if (!start || !end) {
    return '--';
  }
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
    return '--';
  }
  const totalMinutes = Math.floor((endMs - startMs) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} h ${String(minutes).padStart(2, '0')} m`;
};

const asEvacuation = (value: EmergencyEpisode['evacuation']): EmergencyEpisodeEvacuation => {
  if (!value || typeof value !== 'object') {
    return {};
  }
  return value as EmergencyEpisodeEvacuation;
};

const evacuationValue = (
  evacuation: EmergencyEpisodeEvacuation,
  keys: Array<keyof EmergencyEpisodeEvacuation>,
): string => {
  for (const key of keys) {
    const raw = evacuation[key];
    if (raw == null || raw === '') {
      continue;
    }
    if (typeof raw === 'object') {
      return referenceLabel(raw as FhirReference);
    }
    return String(raw);
  }
  return '--';
};

const formatVitalValue = (value?: string | number | null, unit?: string | null): string => {
  if (value == null) {
    return '--';
  }
  if (unit) {
    return `${value} ${unit}`;
  }
  return String(value);
};

const formatDose = (dose?: string | number | null, doseUnit?: string | null): string => {
  if (dose == null) {
    return '';
  }
  if (doseUnit) {
    return `${dose} ${doseUnit}`;
  }
  return String(dose);
};

const getOccurredDate = (evacuation: EmergencyEpisodeEvacuation): string | null => {
  if (typeof evacuation.occurredDateTime === 'string') {
    return evacuation.occurredDateTime;
  }
  if (typeof evacuation.occurred === 'string') {
    return evacuation.occurred;
  }
  return null;
};

const Metric: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className={styles.metricItem}>
    <span className={styles.metricLabel}>{label}</span>
    <span className={styles.metricValue}>{value}</span>
  </div>
);

const ClinicalColumn: React.FC<{
  title: string;
  countLabel: string;
  emptyLabel: string;
  children?: React.ReactNode;
  hasItems: boolean;
}> = ({ title, countLabel, emptyLabel, children, hasItems }) => (
  <div className={styles.clinicalColumn}>
    <div className={styles.clinicalColumnHeader}>
      <h6 className={styles.clinicalColumnTitle}>{title}</h6>
      <span className={styles.clinicalColumnCount}>{countLabel}</span>
    </div>
    {hasItems ? children : <p className={styles.clinicalEmpty}>{emptyLabel}</p>}
  </div>
);

const EpisodeDetail: React.FC<{ episode: EmergencyEpisode }> = ({ episode }) => {
  const { t } = useTranslation();
  const evacuation = asEvacuation(episode.evacuation);
  const incidentLabel =
    episode.incidentTypeText || episode.incidentType || t('emergencyIncident', 'Emergency incident');
  const displayId = shortId(episode.incidentId || episode.episodeId || episode.dispatchId);
  const fullReference = episode.episodeId || episode.incidentId || episode.dispatchId || '--';
  const serviceProviderLabel = referenceLabel(episode.serviceProvider);
  const resolvedServiceProvider =
    serviceProviderLabel !== '--' ? serviceProviderLabel : evacuationValue(evacuation, ['serviceProvider']);

  const vitals = episode.vitals ?? [];
  const medications = episode.medications ?? [];
  const procedures = episode.procedures ?? [];
  const secondarySurvey = episode.secondarySurvey ?? [];
  const investigations = episode.investigations ?? [];
  const allergies = episode.allergies ?? [];
  const participants = episode.participants ?? [];
  const diagnoses = episode.diagnoses;

  const diagnosisCount =
    (diagnoses?.chiefComplaint?.length ?? 0) + (diagnoses?.working?.length ?? 0) + (diagnoses?.discharge?.length ?? 0);

  return (
    <div className={styles.episodeDetail}>
      <div className={styles.episodeDetailHeader}>
        <div>
          <h5 className={styles.episodeDetailTitle}>
            {displayId}
            <span className={styles.episodeDetailSeparator}>·</span>
            {incidentLabel}
          </h5>
        </div>
        <span className={styles.episodeDetailReference}>{fullReference}</span>
      </div>

      <div className={styles.metricsRow}>
        <Metric label={t('status', 'Status')} value={episode.status || '--'} />
        <Metric label={t('incidentClass', 'Incident class')} value={episode.incidentClass || '--'} />
        <Metric
          label={t('dispatchPriority', 'Dispatch priority')}
          value={episode.dispatchPriority || t('unknown', 'Unknown')}
        />
        <Metric label={t('startTime', 'Start time')} value={formatDate(episode.startTime)} />
        <Metric label={t('endTime', 'End time')} value={formatDate(episode.endTime)} />
        <Metric
          label={t('onSceneToHandover', 'On scene → handover')}
          value={formatDuration(episode.startTime, episode.endTime)}
        />
      </div>

      <div className={styles.locationGrid}>
        <div className={styles.locationCard}>
          <span className={styles.locationEyebrow}>{t('scene', 'Scene')}</span>
          <p className={styles.locationTitle}>{referenceLabel(episode.sceneLocation)}</p>
          {episode.sceneLocation?.reference && <p className={styles.locationMeta}>{episode.sceneLocation.reference}</p>}
        </div>
        <div className={styles.locationCard}>
          <span className={styles.locationEyebrow}>{t('destinationFacility', 'Destination facility')}</span>
          <p className={styles.locationTitle}>{referenceLabel(episode.destinationFacility)}</p>
          {episode.destinationFacility?.reference && (
            <p className={styles.locationMeta}>{episode.destinationFacility.reference}</p>
          )}
        </div>
      </div>

      <div className={styles.logisticsGrid}>
        <Metric label={t('evacuation', 'Evacuation')} value={evacuationValue(evacuation, ['typeText', 'type'])} />
        <Metric label={t('reason', 'Reason')} value={evacuationValue(evacuation, ['reasonText', 'reason'])} />
        <Metric label={t('priority', 'Priority')} value={evacuationValue(evacuation, ['priority'])} />
        <Metric
          label={t('transport', 'Transport')}
          value={evacuationValue(evacuation, ['transport', 'transportModality'])}
        />
        <Metric label={t('occurred', 'Occurred')} value={formatDate(getOccurredDate(evacuation))} />
        <Metric label={t('requester', 'Requester')} value={evacuationValue(evacuation, ['requester'])} />
        <Metric label={t('serviceProvider', 'Service provider')} value={resolvedServiceProvider} />
      </div>

      <div className={styles.callerRow}>
        <span className={styles.metricLabel}>{t('caller', 'Caller')}</span>
        <span className={styles.metricValue}>
          {episode.caller
            ? [
                episode.caller.isPatient
                  ? t('selfPatient', 'Self (patient)')
                  : episode.caller.relationship || t('unknown', 'Unknown'),
                episode.caller.individual,
              ]
                .filter(Boolean)
                .join(' · ') || '--'
            : '--'}
        </span>
      </div>

      {vitals.length > 0 && (
        <div className={styles.vitalsHighlightGrid}>
          {vitals.map((vital) => (
            <div key={vital.uuid} className={styles.vitalHighlightCard}>
              <span className={styles.metricLabel}>{vital.name || vital.code || t('vital', 'Vital')}</span>
              <p className={styles.vitalHighlightValue}>{formatVitalValue(vital.value, vital.unit)}</p>
              <p className={styles.locationMeta}>
                {[formatDate(vital.effectiveDateTime), vital.code].filter(Boolean).join(' · ')}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className={styles.clinicalGrid}>
        <ClinicalColumn
          title={t('medicationsGiven', 'Medications given')}
          countLabel={
            medications.length
              ? t('recordedCount', '{{count}} recorded', { count: medications.length })
              : t('none', 'none')
          }
          emptyLabel={t('noMedicationsRecorded', 'No medications recorded.')}
          hasItems={medications.length > 0}>
          <ul className={styles.clinicalList}>
            {medications.map((item) => {
              const doseLabel = formatDose(item.dose, item.doseUnit);
              const routeLabel = item.routeText || item.route || '';
              return (
                <li key={item.uuid} className={styles.clinicalListItem}>
                  <span className={styles.clinicalPrimary}>{item.drug || item.code || '--'}</span>
                  <span className={styles.clinicalSecondary}>
                    {[doseLabel, routeLabel].filter(Boolean).join(' · ') || '--'}
                  </span>
                  <span className={styles.clinicalSecondary}>
                    {[item.status, formatDate(item.effectiveDateTime)].filter(Boolean).join(' · ')}
                  </span>
                </li>
              );
            })}
          </ul>
        </ClinicalColumn>

        <ClinicalColumn
          title={t('procedures', 'Procedures')}
          countLabel={
            procedures.length
              ? t('recordedCount', '{{count}} recorded', { count: procedures.length })
              : t('none', 'none')
          }
          emptyLabel={t('noProceduresRecorded', 'No procedures recorded.')}
          hasItems={procedures.length > 0}>
          <ul className={styles.clinicalList}>
            {procedures.map((item) => (
              <li key={item.uuid} className={styles.clinicalListItem}>
                <span className={styles.clinicalPrimary}>{item.name || item.code || '--'}</span>
                <span className={styles.clinicalSecondary}>
                  {[item.status, formatDate(item.performedDateTime)].filter(Boolean).join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        </ClinicalColumn>

        <ClinicalColumn
          title={t('secondarySurvey', 'Secondary survey')}
          countLabel={
            secondarySurvey.length
              ? t('recordedCount', '{{count}} recorded', { count: secondarySurvey.length })
              : t('none', 'none')
          }
          emptyLabel={t('noSurveyFindingsRecorded', 'No survey findings recorded.')}
          hasItems={secondarySurvey.length > 0}>
          <ul className={styles.clinicalList}>
            {secondarySurvey.map((item) => (
              <li key={item.uuid} className={styles.clinicalListItem}>
                <span className={styles.clinicalPrimary}>{item.region || item.bodySiteCode || '--'}</span>
                <span className={styles.clinicalSecondary}>
                  {item.noFindings ? t('noFindings', 'No findings') : item.finding || '--'}
                </span>
              </li>
            ))}
          </ul>
        </ClinicalColumn>

        <ClinicalColumn
          title={t('investigations', 'Investigations')}
          countLabel={
            investigations.length
              ? t('recordedCount', '{{count}} recorded', { count: investigations.length })
              : t('none', 'none')
          }
          emptyLabel={t('noInvestigationsRecorded', 'No investigations recorded.')}
          hasItems={investigations.length > 0}>
          <ul className={styles.clinicalList}>
            {investigations.map((item) => (
              <li key={item.uuid} className={styles.clinicalListItem}>
                <span className={styles.clinicalPrimary}>{item.name || item.code || '--'}</span>
                <span className={styles.clinicalSecondary}>
                  {[
                    item.code,
                    item.notPerformed ? t('notPerformed', 'Not performed') : t('performed', 'Performed'),
                    formatDate(item.effectiveDateTime),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        </ClinicalColumn>

        <ClinicalColumn
          title={t('allergiesNotedOnScene', 'Allergies noted on scene')}
          countLabel={
            allergies.length ? t('recordedCount', '{{count}} recorded', { count: allergies.length }) : t('none', 'none')
          }
          emptyLabel={t('noneNotedByCrew', 'None noted by the crew.')}
          hasItems={allergies.length > 0}>
          <ul className={styles.clinicalList}>
            {allergies.map((item) => (
              <li key={item.uuid} className={styles.clinicalListItem}>
                <span className={styles.clinicalPrimary}>{item.allergen || '--'}</span>
                <span className={styles.clinicalSecondary}>
                  {[item.severity, item.manifestation || item.category].filter(Boolean).join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        </ClinicalColumn>
      </div>

      <div className={styles.footerSections}>
        <div className={styles.footerSection}>
          <h6 className={styles.footerSectionTitle}>{t('crewAndParticipants', 'Crew & participants')}</h6>
          {participants.length > 0 ? (
            <ul className={styles.clinicalList}>
              {participants.map((item, index) => (
                <li key={`${item.reference || 'participant'}-${index}`} className={styles.clinicalListItem}>
                  <span className={styles.clinicalPrimary}>{item.role || t('participant', 'Participant')}</span>
                  <span className={styles.clinicalSecondary}>{item.display || item.reference || '--'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.clinicalEmpty}>{t('noParticipantsRecorded', 'No participants recorded.')}</p>
          )}
        </div>

        <div className={styles.footerSection}>
          <h6 className={styles.footerSectionTitle}>{t('diagnoses', 'Diagnoses')}</h6>
          {diagnosisCount > 0 ? (
            <ul className={styles.clinicalList}>
              {[
                ...(diagnoses?.chiefComplaint ?? []).map((item, index) => ({
                  key: `chief-${index}`,
                  label: t('chiefComplaint', 'Chief complaint'),
                  value: String(
                    (item as { display?: string; name?: string }).display ||
                      (item as { name?: string }).name ||
                      JSON.stringify(item),
                  ),
                })),
                ...(diagnoses?.working ?? []).map((item, index) => ({
                  key: `working-${index}`,
                  label: t('workingDiagnosis', 'Working diagnosis'),
                  value: String(
                    (item as { display?: string; name?: string }).display ||
                      (item as { name?: string }).name ||
                      JSON.stringify(item),
                  ),
                })),
                ...(diagnoses?.discharge ?? []).map((item, index) => ({
                  key: `discharge-${index}`,
                  label: t('dischargeDiagnosis', 'Discharge diagnosis'),
                  value: String(
                    (item as { display?: string; name?: string }).display ||
                      (item as { name?: string }).name ||
                      JSON.stringify(item),
                  ),
                })),
              ].map((item) => (
                <li key={item.key} className={styles.clinicalListItem}>
                  <span className={styles.clinicalPrimary}>{item.label}</span>
                  <span className={styles.clinicalSecondary}>{item.value}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.clinicalEmpty}>
              {t('noDiagnosesInEpisode', 'No diagnoses recorded for this episode in the current SHR payload.')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const EmergencyEpisodesSection: React.FC<EmergencyEpisodesSectionProps> = ({ episodes }) => {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string>(() => {
    const first = episodes[0];
    return first?.episodeId || first?.incidentId || first?.dispatchId || 'episode-0';
  });

  const episodeCards = useMemo(
    () =>
      episodes.map((episode, index) => {
        const id = episode.episodeId || episode.incidentId || episode.dispatchId || `episode-${index}`;
        return {
          id,
          episode,
          displayId: shortId(
            episode.incidentId || episode.episodeId || episode.dispatchId,
            `INC-${String(index + 1).padStart(4, '0')}`,
          ),
          incidentType:
            episode.incidentTypeText || episode.incidentType || t('emergencyIncident', 'Emergency incident'),
          destination: referenceLabel(episode.destinationFacility),
          startTime: formatDate(episode.startTime),
        };
      }),
    [episodes, t],
  );

  const selectedEpisode =
    episodeCards.find((card) => card.id === selectedId)?.episode ?? episodeCards[0]?.episode ?? null;

  if (!episodes.length) {
    return (
      <p className={styles.emptySection}>
        {t('noEmergencyEpisodes', 'No emergency episodes available for this patient.')}
      </p>
    );
  }

  return (
    <div className={styles.episodesSection}>
      <div className={styles.sectionHeadingRow}>
        <h5 className={styles.sectionHeading}>{t('emergencyEpisodes', 'Emergency episodes')}</h5>
        <span className={styles.sectionSubheading}>
          {t('preHospitalGroupedPerIncident', 'Pre-hospital · grouped per incident')}
        </span>
      </div>

      <div className={styles.incidentCards} aria-label={t('emergencyEpisodes', 'Emergency episodes')}>
        {episodeCards.map((card) => {
          const isSelected = selectedId === card.id;

          return (
            <button
              key={card.id}
              type="button"
              aria-pressed={isSelected}
              className={`${styles.incidentCard} ${isSelected ? styles.incidentCardSelected : ''}`}
              onClick={() => setSelectedId(card.id)}>
              <div className={styles.incidentCardTop}>
                <span className={styles.incidentCardId}>{card.displayId}</span>
                <Tag size="sm" type={statusTagType(card.episode.status)}>
                  {card.episode.status || t('unknown', 'Unknown')}
                </Tag>
              </div>
              <p className={styles.incidentCardType}>{card.incidentType}</p>
              <p className={styles.incidentCardMeta}>{card.startTime}</p>
              <p className={styles.incidentCardMeta}>{card.destination}</p>
            </button>
          );
        })}
      </div>

      {selectedEpisode && <EpisodeDetail episode={selectedEpisode} />}
    </div>
  );
};

export default EmergencyEpisodesSection;
