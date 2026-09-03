import { prisma } from "@/lib/db/client";
import type { Prisma } from "@prisma/client";

type AuditValue = Prisma.InputJsonValue | undefined;

type AuditEventInput = {
  merchantId?: string;
  buyerProfileId?: string;
  transactionId?: string;
  eventType: string;
  actor: string;
  input?: AuditValue;
  action?: string;
  result?: string;
  reason?: string;
  policyResult?: AuditValue;
  metadata?: AuditValue;
};

export async function audit(event: AuditEventInput) {
  return prisma.auditEvent.create({
    data: {
      merchantId: event.merchantId,
      buyerProfileId: event.buyerProfileId,
      transactionId: event.transactionId,
      eventType: event.eventType,
      actor: event.actor,
      input: event.input,
      action: event.action,
      result: event.result,
      reason: event.reason,
      policyResult: event.policyResult,
      metadata: event.metadata,
    },
  });
}