import { formatDate, parseDate } from '@openmrs/esm-framework';
import { LabManifestSample } from '../hooks/useLabManifestOrders';

const PLACEHOLDER = '--';

export function getManifestSampleResult(sample: LabManifestSample): string {
  const result = sample.result?.trim();
  return result ? result : PLACEHOLDER;
}

export function getManifestSampleResultDate(sample: LabManifestSample): string {
  const dateValue =
    sample.resultDate ?? sample.sampleTestedDate ?? sample.resultsDispatchDate ?? sample.resultsPulledDate;

  if (!dateValue) {
    return PLACEHOLDER;
  }

  return formatDate(parseDate(dateValue));
}

export function sampleHasLabResult(sample: LabManifestSample): boolean {
  return Boolean(sample.result?.trim());
}
