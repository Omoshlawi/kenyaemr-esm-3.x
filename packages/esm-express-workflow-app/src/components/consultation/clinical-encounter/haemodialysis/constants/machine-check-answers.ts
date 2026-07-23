import type { CodedAnswerOption } from './coded-answers';

export const BLOOD_LEAK_DETECTED_ANSWER = '4147ebd2-0135-48fe-8407-d36337f5373b';

export const AIR_DETECTED_ANSWER = 'da8dc364-6865-4885-b460-5a18ae0d495a';

export const BLOOD_LEAK_OPTIONS: CodedAnswerOption[] = [
  { label: 'No leaks detected', value: '750ab08d-d120-43cf-8d0d-a14910dc4807' },
  { label: 'Leaks detected', value: BLOOD_LEAK_DETECTED_ANSWER },
];

export const AIR_DETECTOR_OPTIONS: CodedAnswerOption[] = [
  { label: 'Normal', value: '1115AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
  { label: 'Air detected', value: AIR_DETECTED_ANSWER },
];
