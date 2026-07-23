/**
 * Controls which obs are POSTed when saving intra-dialytic monitoring slots.
 * Dedicated monitoring concepts are not in Ampath form v1.2 — rows persist in
 * Post HD Nurse Notes (8035d3d1…) until metadata defines an obs group.
 */
/**
 * Connection time (9fdee776…) returns 400 when posted as text on this server.
 * Session start is persisted in Post HD Nurse Notes (`startedAt:` in the monitoring block).
 */
export const INCLUDE_CONNECTION_TIME_ON_FIRST_SLOT = false;

/** Structured slot rows encoded in Post HD Nurse Notes */
export const INCLUDE_STRUCTURED_MONITORING_NOTES = true;

/** Optional per-slot vitals obs when HAEMODIALYSIS_CONCEPTS.monitoring.* are populated */
export const INCLUDE_DEDICATED_MONITORING_CONCEPTS = false;
