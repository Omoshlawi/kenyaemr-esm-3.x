/**
 * Controls which dialysis machine check observations are POSTed after initial assessment.
 */

export type MachineCheckObsFieldKey =
  | 'machineCheckDate'
  | 'bloodLeaks'
  | 'bloodLeakDateTime'
  | 'airDetector'
  | 'airDetectorDateTime'
  | 'dialysisFluidTemperature'
  | 'conductivity'
  | 'transmembranePressure';

export const MACHINE_CHECK_OBS_POST_ENABLED: Record<MachineCheckObsFieldKey, boolean> = {
  machineCheckDate: true, // ade394a7
  bloodLeaks: true, // 6123f967
  bloodLeakDateTime: true, // fccbed61
  airDetector: true, // 7f754fb4
  airDetectorDateTime: true, // c3ba172e
  dialysisFluidTemperature: true, // 5088 — second obs on encounter (fluid temp)
  conductivity: true, // bc9ba25b
  transmembranePressure: true, // b82c6ff6
};

export const isMachineCheckObsFieldEnabled = (field: MachineCheckObsFieldKey): boolean =>
  MACHINE_CHECK_OBS_POST_ENABLED[field] === true;
