import { z } from 'zod';

export const visitAttributesFormSchema = z.object({
  isPatientExempted: z.string(),
  paymentMethods: z.string().optional(),
  insuranceScheme: z.string().optional(),
  policyNumber: z.string().optional(),
  exemptionCategory: z.string().optional(),
  packages: z.string().min(1, 'Select a package').nullable(),
  interventions: z.string().min(1, 'Select an intervention').nullable(),
});

export type VisitAttributesFormValue = z.infer<typeof visitAttributesFormSchema>;
