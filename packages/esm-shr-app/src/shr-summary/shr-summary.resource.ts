import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

interface SmsResponseData {
  status: string;
  message: string;
  id: string;
}
interface TokenResponse {
  token: string;
  issued: number; // Unix timestamp in milliseconds
  expires: number; // Unix timestamp in milliseconds
  status: string; // e.g., "success"
  expires_in: number; // Expiration duration in milliseconds (e.g., 1440000 ms = 24 minutes)
}

interface VerifyResponseData {
  response: string;
}

export const sendSHAOtp = async (phoneNumber: string, nationalId: string): Promise<SmsResponseData> => {
  const messageTemplate = 'Message template';
  const response = await openmrsFetch(
    `${restBaseUrl}/kenyaemr/send-kenyaemr-sms?phone=${phoneNumber}&nationalId=${nationalId}&message=${messageTemplate}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
  );

  const rawResponseText = response.data;

  if (!rawResponseText) {
    throw new Error('SMS Gateway returned an empty response.');
  }

  // Use the extraction logic
  const extractedData = extractSmsData(rawResponseText);

  // Throw an error if parsing failed or the payload was missing
  if (!extractedData) {
    throw new Error(`Failed to parse SMS gateway response. Raw response: ${rawResponseText}`);
  }

  // Explicitly check for successful status from the gateway payload
  if (extractedData.status !== 'success') {
    throw new Error(`SMS delivery failed with status: ${extractedData.status}. Message: ${extractedData.message}`);
  }

  // Return the strongly-typed data to the caller
  return extractedData;
};

/**
 * Extracts and parses the JSON payload from a mixed-text SMS API response.
 * @param responseString The raw string response from the provider
 * @returns SmsResponseData object or null if parsing fails
 */
export function extractSmsData(responseString: string): SmsResponseData | null {
  try {
    // Regex to capture everything between the first '{' and the last '}'
    const jsonMatch = responseString.match(/\{.*\}/);

    if (!jsonMatch) {
      console.error('No JSON payload found in the response string.');
      return null;
    }

    // Parse the extracted JSON string
    const parsedData: SmsResponseData = JSON.parse(jsonMatch[0]);
    return parsedData;
  } catch (error) {
    console.error('Failed to parse SMS response data:', error);
    return null;
  }
}

export const verifyOtp = async (otp: string, uuid: string) => {
  const url = `${restBaseUrl}/kenyaemr/validate-otp`;
  const res = await openmrsFetch<VerifyResponseData>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { id: uuid, otp },
  });
  const data = res?.data?.response;
  try {
    const _data = JSON.parse(data) as TokenResponse;
    return { status: 'success', data: _data };
  } catch (error) {
    return { status: 'error', error: data };
  }
};
