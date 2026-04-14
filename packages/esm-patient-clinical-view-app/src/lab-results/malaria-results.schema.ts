import { z } from 'zod';

const PLASMODIUM_FALCIPARUM_UUID = 'b82a629a-8a85-45f0-8957-713635c36a56';

export const stockItemInventoryLinkSchema = z.object({
  rel: z.string(),
  uri: z.string(),
  resourceAlias: z.string(),
});

export type StockItemInventoryLink = z.infer<typeof stockItemInventoryLinkSchema>;

export const stockItemInventoryResultSchema = z.object({
  partyUuid: z.string(),
  locationUuid: z.string(),
  partyName: z.string(),
  stockItemUuid: z.string(),
  drugId: z.number().nullable(),
  drugUuid: z.string().nullable(),
  drugStrength: z.string().nullable(),
  conceptId: z.number().nullable(),
  conceptUuid: z.string().nullable(),
  stockBatchUuid: z.string(),
  batchNumber: z.string(),
  quantity: z.number(),
  quantityUoM: z.string(),
  quantityFactor: z.number(),
  quantityUoMUuid: z.string(),
  expiration: z.string(),
  commonName: z.string().nullable(),
  acronym: z.string().nullable(),
  drugName: z.string().nullable(),
  conceptName: z.string().nullable(),
  links: z.array(stockItemInventoryLinkSchema),
  resourceVersion: z.string(),
});

export type StockItemInventoryResult = z.infer<typeof stockItemInventoryResultSchema>;

export const stockItemInventoryResponseSchema = z.object({
  results: z.array(stockItemInventoryResultSchema),
  totalCount: z.number().nullable(),
  total: z.number(),
});

export type StockItemInventoryResponse = z.infer<typeof stockItemInventoryResponseSchema>;

export const malariaResultSchema = z
  .object({
    malariaResult: z.enum(['2b8f98e3-eda1-4464-9ef7-d74b4eb2a5f5', 'e037886b-7fb7-4cec-b8b5-c1d7de46ccc7'], {
      required_error: 'Malaria parasites result is required',
    }),
    speciesUuid: z.string().optional().nullable(),
    stagingUuid: z.string().optional().nullable(),
    parasitesCount: z.number().int().min(0).optional().nullable(),
    smearType: z.enum(['thin', 'thick']).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.malariaResult === '2b8f98e3-eda1-4464-9ef7-d74b4eb2a5f5') {
      if (!data.speciesUuid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['speciesUuid'],
          message: 'Malaria species is required for a positive result',
        });
      }
    } else {
      // Negative result: ignore any dependent values.
      return;
    }

    if (data.speciesUuid === PLASMODIUM_FALCIPARUM_UUID) {
      if (!data.stagingUuid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['stagingUuid'],
          message: 'Malaria staging is required',
        });
      }
      if (data.parasitesCount == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['parasitesCount'],
          message: 'Parasites count is required',
        });
      }
      if (!data.smearType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['smearType'],
          message: 'Smear type is required',
        });
      }
    }
  });

export type MalariaResultForm = z.infer<typeof malariaResultSchema>;

export const malariaRapidTestSchema = z
  .object({
    rapidTestResult: z.enum(
      [
        '703AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        '664AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        '163611AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      ],
      {
        required_error: 'Rapid test result is required',
      },
    ),
    speciesUuid: z.string().optional().nullable(),
    stockItem: stockItemInventoryResultSchema.refine((val) => val !== null && val !== undefined, {
      message: 'Stock item is required',
    }),
  })
  .superRefine((data, ctx) => {
    if (data.rapidTestResult === '703AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' && !data.speciesUuid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['speciesUuid'],
        message: 'Malaria species is required for a positive result',
      });
    }
  });

export type MalariaRapidTestForm = z.infer<typeof malariaRapidTestSchema>;
