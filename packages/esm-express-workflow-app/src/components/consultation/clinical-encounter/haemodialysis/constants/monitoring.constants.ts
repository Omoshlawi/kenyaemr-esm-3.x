import { defaultHaemodialysisConfig } from '../../../../../haemodialysis-config.defaults';

/**
 * Intra-dialytic monitoring slot labels (minutes from session start).
 * Override via frontend config `haemodialysis.monitoringSlotLabelsMinutes`.
 */
export const MONITORING_SLOT_LABELS_MINUTES = defaultHaemodialysisConfig.monitoringSlotLabelsMinutes;

export type MonitoringSlotLabelMinutes = (typeof MONITORING_SLOT_LABELS_MINUTES)[number];

/**
 * Minutes between each slot unlock.
 * Override via frontend config `haemodialysis.monitoringSlotIntervalMinutes` (demo: 2, production: 60).
 */
export const MONITORING_SLOT_INTERVAL_MINUTES = defaultHaemodialysisConfig.monitoringSlotIntervalMinutes;
