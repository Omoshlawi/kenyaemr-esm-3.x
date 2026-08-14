import { z } from 'zod';
import { type TFunction } from 'i18next';

export const paymentLineSchema = (
  t: TFunction,
  insurancePaymentModeUuid: string,
  requireIntervention: boolean,
  isEmergency = false,
) =>
  z
    .object({
      paymentMode: z
        .object({
          uuid: z.string(),
          name: z.string(),
          attributeTypes: z
            .array(
              z
                .object({
                  uuid: z.string(),
                  name: z.string().optional(),
                  required: z.boolean().optional(),
                })
                .passthrough(),
            )
            .optional(),
        })
        .optional(),
      amount: z.number().optional(),
      referenceCode: z.string().optional(),
      interventionCode: z.string().optional(),
      protocolCode: z.string().optional(),
      allocations: z
        .array(
          z.object({
            lineItem: z.string(),
            amount: z.number().optional(),
          }),
        )
        .optional(),
    })
    .superRefine((line, ctx) => {
      if (!line.paymentMode?.uuid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['paymentMode'],
          message: t('paymentModeRequired', 'Payment mode is required'),
        });
      }

      if (line.amount == null || line.amount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['amount'],
          message: t('enterValidAmount', 'Enter an amount greater than zero'),
        });
      }

      const requiresReferenceCode = line.paymentMode?.attributeTypes?.some((attr) => attr.required) ?? false;
      if (requiresReferenceCode && !line.referenceCode?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['referenceCode'],
          message: t('referenceCodeRequiredForThisPaymentMode', 'Reference code is required for this payment mode'),
        });
      }

      const isInsurance = line.paymentMode?.uuid === insurancePaymentModeUuid;
      if (requireIntervention && isInsurance && !line.interventionCode?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['interventionCode'],
          message: t('selectShaIntervention', 'Select the SHA intervention this payment is recorded against'),
        });
      }

      if (isEmergency && isInsurance && !line.protocolCode?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['protocolCode'],
          message: t('selectEmergencyProtocol', 'Select the emergency protocol for this line'),
        });
      }
    });

export const paymentFormSchema = (
  totalAmount: number,
  t: TFunction,
  insurancePaymentModeUuid: string,
  requireIntervention: boolean,
  allowPartial = false,
  isEmergency = false,
) =>
  z
    .object({
      payments: z
        .array(paymentLineSchema(t, insurancePaymentModeUuid, requireIntervention, isEmergency))
        .min(1, t('atLeastOnePayment', 'Add at least one payment')),
    })
    .superRefine((data, ctx) => {
      const tenderedCents = Math.round(data.payments.reduce((acc, line) => acc + (Number(line.amount) || 0), 0) * 100);
      const totalCents = Math.round(totalAmount * 100);

      if (allowPartial) {
        if (tenderedCents > totalCents) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['payments'],
            message: t('paymentsCannotExceedTotal', 'The payments cannot exceed the total amount due'),
          });
        }
        return;
      }

      if (tenderedCents !== totalCents) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['payments'],
          message: t('paymentsMustSumToTotal', 'The payments must add up to the total amount due'),
        });
      }
    });
