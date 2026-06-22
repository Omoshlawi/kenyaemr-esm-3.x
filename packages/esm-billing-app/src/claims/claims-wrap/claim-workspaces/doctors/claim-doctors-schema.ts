import { z } from 'zod';

const doctorRowSchema = z.object({
  provider_display: z.string().optional(),
  identification_number: z.string().min(1, 'License number is required'),
  identification_type: z.string().min(1, 'Identification type is required'),
  regulation_body: z.string().min(1, 'Regulation body is required'),
});

export const claimDoctorsSchema = z.object({
  doctors: z.array(doctorRowSchema).min(1, 'Add at least one doctor').max(10, 'Maximum 10 doctors per batch'),
});

export type ClaimDoctorsFormData = z.infer<typeof claimDoctorsSchema>;
