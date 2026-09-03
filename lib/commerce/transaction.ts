export const STATES = [
  "CREATED",
  "PENDING",
  "SUCCESS",
  "FAILED",
  "CANCELLED",
] as const;

export type TransactionState =
  (typeof STATES)[number];

const allowed: Record<
  TransactionState,
  TransactionState[]
> = {
  CREATED: [
    "PENDING",
    "CANCELLED",
  ],

  PENDING: [
    "SUCCESS",
    "FAILED",
    "CANCELLED",
  ],

  SUCCESS: [],

  FAILED: [
    "PENDING",
    "CANCELLED",
  ],

  CANCELLED: [],
};

export function canTransition(
  from: TransactionState,
  to: TransactionState,
): boolean {
  return allowed[from].includes(to);
}

export function assertTransition(
  from: TransactionState,
  to: TransactionState,
): TransactionState {
  if (
    !canTransition(from, to)
  ) {
    throw new Error(
      `Invalid transaction transition: ${from} -> ${to}`,
    );
  }

  return to;
}