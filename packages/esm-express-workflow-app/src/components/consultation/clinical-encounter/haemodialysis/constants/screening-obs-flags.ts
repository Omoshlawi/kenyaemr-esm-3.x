/**
 * Controls which screening-status observations are POSTed on initial assessment save.
 */

export type ScreeningObsFieldKey =
  | 'bloodGroup'
  | 'hivStatus'
  | 'hepatitisCStatus'
  | 'hepatitisBStatus'
  | 'syphilisStatus'
  | 'drugAllergy';

export const SCREENING_OBS_POST_ENABLED: Record<ScreeningObsFieldKey, boolean> = {
  bloodGroup: true, // 69c35549
  hivStatus: true, // 1401
  hepatitisCStatus: true, // 1325
  hepatitisBStatus: true, // 6ec3d456
  syphilisStatus: true, // 06ad8fe0
  drugAllergy: true, // b1998b10
};

export const isScreeningObsFieldEnabled = (field: ScreeningObsFieldKey): boolean =>
  SCREENING_OBS_POST_ENABLED[field] === true;
