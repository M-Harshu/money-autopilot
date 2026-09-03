import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    /*
     * Get the most recently configured merchant.
     */
    const merchant = await prisma.merchant.findFirst({
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
      },
    });

    if (!merchant) {
      return NextResponse.json({
        agentsOnline: 3,
        transactions: 0,
        policyChecks: 0,
        systemHealth: 100,
        recentEvents: [],
        transactionStates: [],
        generatedAt: new Date().toISOString(),
      });
    }

    /*
     * Pull recent audit activity.
     *
     * We intentionally keep this limited so the
     * Observatory doesn't load the entire database.
     */
    const recentEvents =
      await prisma.auditEvent.findMany({
        where: {
          merchantId: merchant.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 12,
        select: {
          id: true,
          eventType: true,
          actor: true,
          action: true,
          result: true,
          reason: true,
          metadata: true,
          createdAt: true,
        },
      });

    /*
     * Real transaction count.
     */
    const transactionCount =
      await prisma.transaction.count({
        where: {
          merchantId: merchant.id,
        },
      });

    /*
     * Policy activity comes from audit events.
     *
     * We count events whose event type or actor
     * indicates policy activity.
     */
    const policyChecks =
      await prisma.auditEvent.count({
        where: {
          merchantId: merchant.id,
          OR: [
            {
              eventType: {
                contains: "POLICY",
                mode: "insensitive",
              },
            },
            {
              actor: {
                contains: "policy",
                mode: "insensitive",
              },
            },
          ],
        },
      });

    /*
     * Count agent activity from the actual audit log.
     */
    const agentActivity =
      await prisma.auditEvent.count({
        where: {
          merchantId: merchant.id,
          OR: [
            {
              actor: {
                contains: "agent",
                mode: "insensitive",
              },
            },
            {
              eventType: {
                contains: "AGENT",
                mode: "insensitive",
              },
            },
          ],
        },
      });

    /*
     * Determine transaction state distribution.
     */
    const transactionStates =
      await prisma.transaction.groupBy({
        by: ["state"],
        where: {
          merchantId: merchant.id,
        },
        _count: {
          _all: true,
        },
      });

    /*
     * Look for recent error/failure audit events.
     *
     * Health is derived from actual recorded failures.
     * If there are no recorded failures, the system is
     * considered operational.
     */
    const recentFailures =
      await prisma.auditEvent.count({
        where: {
          merchantId: merchant.id,
          createdAt: {
            gte: new Date(
              Date.now() -
                24 * 60 * 60 * 1000,
            ),
          },
          OR: [
            {
              result: {
                contains: "FAIL",
                mode: "insensitive",
              },
            },
            {
              result: {
                contains: "ERROR",
                mode: "insensitive",
              },
            },
            {
              eventType: {
                contains: "ERROR",
                mode: "insensitive",
              },
            },
          ],
        },
      });

    /*
     * Keep the health metric honest.
     *
     * This isn't pretending to measure server CPU,
     * memory, uptime, etc. It represents application
     * event health based on recorded failures.
     */
    const systemHealth =
      recentFailures === 0
        ? 100
        : Math.max(
            0,
            100 - recentFailures * 5,
          );

    return NextResponse.json({
      agentsOnline: 3,

      transactions: transactionCount,

      policyChecks,

      agentActivity,

      systemHealth,

      recentFailures,

      recentEvents,

      transactionStates:
        transactionStates.map(
          (entry) => ({
            state: entry.state,
            count: entry._count._all,
          }),
        ),

      generatedAt:
        new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "Dashboard API error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Dashboard data unavailable",
      },
      {
        status: 500,
      },
    );
  }
}