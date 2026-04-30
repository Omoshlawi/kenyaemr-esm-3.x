import { useTranslation } from 'react-i18next';
import { z } from 'zod';

const usePaymentModeFormSchema = () => {
  const { t } = useTranslation();
  const attributeTypeSchema = z
    .object({
      name: z.string(),
      description: z.string(),
      retired: z.boolean().default(false),
      retiredReason: z.string().optional(),
      format: z.string().optional(),
      regExp: z.union([z.string(), z.null()]).optional(),
      required: z.boolean().default(false),
    })
    .refine(
      (data) => {
        if (data.retired === true) {
          return !!data.retiredReason && data.retiredReason.trim().length > 0;
        }
        return true;
      },
      {
        message: t('retiredReasonRequired', 'Retired reason is required when attribute type is retired'),
        path: ['retiredReason'],
      },
    );

  const paymentModeFormSchema = z.object({
    name: z
      .string({
        required_error: t('paymentModeNameRequired', 'Payment mode name is required'),
        invalid_type_error: t('paymentModeNameRequired', 'Payment mode name is required'),
      })
      .min(1, t('paymentModeNameRequired', 'Payment mode name is required')),
    description: z
      .string({
        required_error: t('paymentModeDescriptionRequired', 'Payment mode description is required'),
        invalid_type_error: t('paymentModeDescriptionRequired', 'Payment mode description is required'),
      })
      .min(1, t('paymentModeDescriptionRequired', 'Payment mode description is required')),
    retired: z
      .boolean({
        invalid_type_error: t('retiredMustBeBoolean', 'Retired must be a boolean'),
      })
      .optional()
      .default(false),
    attributeTypes: z.array(attributeTypeSchema).optional(),
  });

  return { paymentModeFormSchema };
};

export default usePaymentModeFormSchema;
