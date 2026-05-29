import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

/**
 * Payload for adding an intervention to a claim
 */
export interface AddInterventionPayload {
  consent_token: string;
  intervention_code: string;
  facilityID?: string;
  facilityIDType?: string;
}

/**
 * Payload for retiring an intervention
 */
export interface RetireInterventionPayload {
  consent_token: string;
  intervention_code: string;
}

/**
 * Payload for switching interventions
 */
export interface SwitchInterventionPayload {
  consent_token: string;
  existing_intervention_code: string;
  new_intervention_code: string;
  retain_bill_items?: boolean;
  bill_from?: string;
  bill_to?: string;
}

/**
 * Payload for restoring a retired intervention
 */
export interface RestoreInterventionPayload {
  consent_token: string;
  intervention_code: string;
}

/**
 * Response structure for intervention operations
 */
export interface InterventionResponse {
  success: boolean;
  message?: string;
  intervention?: any;
  preauth_required?: boolean;
  preauth_exists?: boolean;
  preauth_type?: string;
  error?: string;
  upstream_error?: any;
}

/**
 * Add a new intervention to an existing claim
 *
 * Required fields:
 * - consent_token: Authorization code of the claim
 * - intervention_code: The code of the intervention to add
 *
 * Optional fields:
 * - facilityID: Facility identifier (will be fetched from global properties if not provided)
 * - facilityIDType: Type of facility identifier (FID or MFL)
 *
 * @param payload - AddInterventionPayload with required fields
 * @returns Promise with intervention response data
 */
export async function addIntervention(payload: AddInterventionPayload): Promise<any> {
  return await openmrsFetch(`${restBaseUrl}/insuranceclaims/interventions/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Retire (deactivate) an intervention from a claim
 *
 * Required fields:
 * - consent_token: Authorization code of the claim
 * - intervention_code: The code of the intervention to retire
 *
 * @param payload - RetireInterventionPayload with required fields
 * @returns Promise with intervention response data
 */
export async function retireIntervention(payload: RetireInterventionPayload): Promise<any> {
  return await openmrsFetch(`${restBaseUrl}/insuranceclaims/interventions/retire`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Switch one intervention for another in a claim
 *
 * Required fields:
 * - consent_token: Authorization code of the claim
 * - existing_intervention_code: The code of the current intervention
 * - new_intervention_code: The code of the new intervention to switch to
 *
 * Optional fields:
 * - retain_bill_items: Whether to retain billing items from the old intervention (default: false)
 * - bill_from: Start date for billing the new intervention
 * - bill_to: End date for billing the new intervention
 *
 * @param payload - SwitchInterventionPayload with required fields
 * @returns Promise with intervention response data, including preauth guidance for new intervention
 */
export async function switchIntervention(payload: SwitchInterventionPayload): Promise<any> {
  return await openmrsFetch(`${restBaseUrl}/insuranceclaims/interventions/switch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Restore a retired intervention back to active status
 *
 * Required fields:
 * - consent_token: Authorization code of the claim
 * - intervention_code: The code of the intervention to restore
 *
 * @param payload - RestoreInterventionPayload with required fields
 * @returns Promise with intervention response data
 */
export async function restoreIntervention(payload: RestoreInterventionPayload): Promise<any> {
  return await openmrsFetch(`${restBaseUrl}/insuranceclaims/interventions/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Helper function to validate required fields before API call
 */
export function validateInterventionPayload(payload: any, requiredFields: string[]): string | null {
  for (const field of requiredFields) {
    if (!payload[field]) {
      return `${field} is required`;
    }
  }
  return null;
}
