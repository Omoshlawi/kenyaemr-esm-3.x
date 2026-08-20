import { type PreauthQueueItem } from '../../../../../billing-form/social-health-authority/type';
import { type PreauthFormData } from '../pre-auth-workspace/pre-auth-schema';
import { buildPreauthFormData } from './index';

const makeFile = (name: string) => new File(['dummy-bytes'], name, { type: 'image/jpeg' });

const baseItem = {
  authorization_code: 'AUTH-123',
  intervention_code: 'INT-1',
  tariff: 500,
} as unknown as PreauthQueueItem;

const makeFormData = (attachments: PreauthFormData['attachments']): PreauthFormData =>
  ({
    provider_notification_email: 'provider@example.com',
    unit_price: '500',
    doctors: [],
    diagnoses: [],
    attachments,
  } as unknown as PreauthFormData);

describe('buildPreauthFormData - attachment multipart contract', () => {
  it('appends all files under the shared `attachments_files` field with an indexed `file_field_name` in metadata', () => {
    const data = makeFormData([
      { file: makeFile('scan-1.jpeg'), document_title: 'Scan 1', document_type: 'lab_report' },
      { file: makeFile('scan-2.jpeg'), document_title: '', document_type: 'discharge_summary' },
    ] as unknown as PreauthFormData['attachments']);

    const fd = buildPreauthFormData(data, baseItem, false);

    // Files must be under per-index field names (backend contract), not a shared `attachments_files` key.
    expect(fd.getAll('attachments_files')).toHaveLength(2);
    fd.getAll('attachments_files').forEach((part) => expect(part).toBeInstanceOf(File));
    expect(fd.get('attachments_0_file_blob')).toBeNull();
    expect(fd.get('attachments_1_file_blob')).toBeNull();

    const meta = JSON.parse(fd.get('attachments') as string);
    expect(meta).toEqual([
      { document_title: 'Scan 1', document_type: 'lab_report', file_field_name: 'attachments_0_file_blob' },
      // Falls back to the file name when no title is provided.
      { document_title: 'scan-2.jpeg', document_type: 'discharge_summary', file_field_name: 'attachments_1_file_blob' },
    ]);
  });

  it('appends one `attachments_files` part per metadata entry, in order', () => {
    const data = makeFormData([
      { file: makeFile('a.jpeg'), document_title: 'A', document_type: 'lab_report' },
      { file: makeFile('b.jpeg'), document_title: 'B', document_type: 'lab_report' },
    ] as unknown as PreauthFormData['attachments']);

    const fd = buildPreauthFormData(data, baseItem, false);
    const meta = JSON.parse(fd.get('attachments') as string) as Array<{ file_field_name: string }>;
    const files = fd.getAll('attachments_files');

    expect(files).toHaveLength(meta.length);
    files.forEach((part) => expect(part).toBeInstanceOf(File));
  });

  it('does not append attachment metadata when there are no attachments', () => {
    const fd = buildPreauthFormData(makeFormData([]), baseItem, false);
    expect(fd.get('attachments')).toBeNull();
    expect(fd.get('attachments_files')).toBeNull();
  });
});
