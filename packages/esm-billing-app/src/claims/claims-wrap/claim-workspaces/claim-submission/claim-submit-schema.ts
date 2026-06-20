import { z } from 'zod';

export const claimSubmitSchema = z.object({
  discharge_reason: z.string().min(1, 'Discharge reason is required'),
  discharge_date: z.string().optional(),
});

export type ClaimSubmitFormData = z.infer<typeof claimSubmitSchema>;
