import { prisma } from "@/lib/db/client";
import { evaluateFinancialAction } from "@/lib/policies/engine";
import { assertTransition } from "@/lib/commerce/transaction";
import { audit } from "@/lib/audit/service";

type TransactionState =
  | "CREATED"
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "RECOVERING";

function isTransactionState(value: string): value is TransactionState {
  return [
    "CREATED",
    "PENDING",
    "SUCCESS",
    "FAILED",
    "RECOVERING",
  ].includes(value);
}

export async function evaluateRetry(
  transactionId: string,
  confirmed: boolean,
) {
  const transaction = await prisma.transaction.findUnique({
    where: {
      id: transactionId,
    },
  });

  if (!transaction) {
    throw new Error("Transaction not found.");
  }

  const policy = evaluateFinancialAction({
    amount: Number(transaction.amount),
    retryCount: transaction.attemptCount,
    confirmed,
  });

  await audit({
    transactionId,
    eventType: "RECOVERY_ELIGIBILITY_CHECKED",
    actor: "recovery_engine",
    result: policy.allowed ? "ALLOWED" : "BLOCKED",
    reason: policy.reasons.join("; "),
    policyResult: policy,
  });

  return policy;
}

export async function requestRetry(
  transactionId: string,
  confirmed: boolean,
) {
  const transaction = await prisma.transaction.findUnique({
    where: {
      id: transactionId,
    },
  });

  if (!transaction) {
    throw new Error("Transaction not found.");
  }

  if (transaction.state !== "FAILED") {
    throw new Error("Only failed transactions can retry.");
  }

  const policy = await evaluateRetry(transactionId, confirmed);

  if (!policy.allowed) {
    throw new Error(policy.reasons.join("; "));
  }

  if (!isTransactionState(transaction.state)) {
    throw new Error("Invalid transaction state.");
  }

  assertTransition(transaction.state, "PENDING");

  const next = await prisma.transaction.update({
    where: {
      id: transactionId,
    },
    data: {
      state: "PENDING",
      attemptCount: {
        increment: 1,
      },
    },
  });

  await prisma.recoveryAttempt.create({
    data: {
      transactionId,
      attemptNumber: next.attemptCount,
      status: "PENDING",
    },
  });

  await audit({
    transactionId,
    eventType: "RECOVERY_REQUESTED",
    actor: "customer",
    result: "APPROVED",
  });

  return next;
}