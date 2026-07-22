type PaymentMode = {
  readonly name: string;
  readonly uuid: string;
};
/**
 * Payment modes seeded by the initializer module on every install.
 *
 * These UUIDs are stable across environments, which is what makes it safe to
 * hard-code them here. Any payment mode created by an implementer at runtime
 * will *not* appear in this list.
 */
const DEFAULT_PAYMENT_MODES = [
  { name: 'Waiver', uuid: 'eb6173cb-9678-4614-bbe1-0ccf7ed9d1d4' },
  { name: 'Insurance', uuid: 'beac329b-f1dc-4a33-9e7c-d95821a137a6' },
  { name: 'Cash', uuid: '4a42656d-da0a-4c8f-b1dd-4bee0505cb21' },
  { name: 'Mobile Money', uuid: '28989582-e8c3-46b0-96d0-c249cb06d5c6' },
] as const satisfies readonly PaymentMode[];

export type DefaultPaymentMode = (typeof DEFAULT_PAYMENT_MODES)[number];
export type DefaultPaymentModeUuid = DefaultPaymentMode['uuid'];

const DEFAULT_PAYMENT_MODE_UUIDS: ReadonlySet<string> = new Set(DEFAULT_PAYMENT_MODES.map(({ uuid }) => uuid));

export const isDefaultPaymentMode = (paymentUuid: string): paymentUuid is DefaultPaymentModeUuid =>
  DEFAULT_PAYMENT_MODE_UUIDS.has(paymentUuid);
