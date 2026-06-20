import { z } from 'zod';

const maxFileSize = 10 * 1024 * 1024;

const isAcceptedFileType = (file: File): boolean => {
  if (file.type === 'application/pdf') {
    return true;
  }
  if (file.type.startsWith('image/')) {
    return true;
  }
  const ext = file.name.toLowerCase().split('.').pop() ?? '';
  return ['pdf', 'png', 'jpg', 'jpeg'].includes(ext);
};

const attachmentSchema = z.object({
  document_type: z.string().min(1, 'Document type is required'),
  document_title: z.string().optional(),
  file: z
    .instanceof(File, { message: 'File is required' })
    .refine((f) => f.size <= maxFileSize, 'File must be 10MB or smaller')
    .refine(isAcceptedFileType, 'File must be a PDF or image'),
});

export const claimAttachmentsSchema = z.object({
  attachments: z
    .array(attachmentSchema)
    .min(1, 'Add at least one attachment')
    .max(20, 'Maximum 20 attachments per batch'),
});

export type ClaimAttachmentsFormData = z.infer<typeof claimAttachmentsSchema>;
