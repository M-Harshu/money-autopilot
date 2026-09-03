import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(async (args: { data: unknown }) => args.data),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    auditEvent: {
      create: mocks.create,
    },
  },
}));

import { audit } from "@/lib/audit/service";

describe("audit", () => {
  it("persists structured events", async () => {
    const event = await audit({
      eventType: "POLICY_CHECKED",
      actor: "policy_engine",
      metadata: { allowed: true },
    });

    expect(event.eventType).toBe("POLICY_CHECKED");
    expect(event.metadata).toEqual({ allowed: true });
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });
});
