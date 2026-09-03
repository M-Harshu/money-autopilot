"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import CursorTrail from "@/components/effects/CursorTrail";
import InteractiveBackground from "@/components/effects/InteractiveBackground";
import ProximityGlow from "@/components/effects/ProximityGlow";
import TiltCard from "@/components/effects/TiltCard";

type DashboardEvent = {
  id: string;
  eventType: string;
  actor: string;
  action?: string | null;
  result?: string | null;
  reason?: string | null;
  metadata?: unknown;
  createdAt: string;
};

type TransactionState = {
  state: string;
  count: number;
};

type DashboardData = {
  agentsOnline: number;
  transactions: number;
  policyChecks: number;
  agentActivity: number;
  systemHealth: number;
  recentFailures: number;
  recentEvents: DashboardEvent[];
  transactionStates: TransactionState[];
  generatedAt: string;
};

const agents = [
  {
    name: "Buyer Agent",
    role: "INTENT ANALYSIS",
    actor: "buyer_agent",
    icon: "◉",
  },
  {
    name: "Merchant Agent",
    role: "COMMERCE OPTIMIZATION",
    actor: "merchant_agent",
    icon: "◇",
  },
  {
    name: "Policy Engine",
    role: "FINANCIAL CONTROL",
    actor: "policy_engine",
    icon: "⬡",
  },
];

function formatEventType(eventType: string) {
  return eventType
    .replaceAll("_", " ")
    .toUpperCase();
}

function formatActor(actor: string) {
  return actor
    .replaceAll("_", " ")
    .toUpperCase();
}

/*
 * IMPORTANT:
 * This function no longer calls Date.now()
 * internally. The current time is supplied by
 * the client component after hydration.
 */
function formatEventTime(
  createdAt: string,
  now: number,
) {
  const created = new Date(createdAt);

  const seconds = Math.max(
    0,
    Math.floor(
      (now - created.getTime()) / 1000,
    ),
  );

  if (seconds < 10) {
    return "NOW";
  }

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.floor(hours / 24);

  return `${days}d`;
}

function getEventCategory(
  event: DashboardEvent,
) {
  const value =
    `${event.eventType} ${event.actor}`.toLowerCase();

  if (value.includes("policy")) {
    return "POLICY";
  }

  if (value.includes("payment")) {
    return "PAYMENT";
  }

  if (
    value.includes("commerce") ||
    value.includes("product") ||
    value.includes("merchant")
  ) {
    return "COMMERCE";
  }

  if (
    value.includes("agent") ||
    value.includes("buyer")
  ) {
    return "AGENT";
  }

  return "SYSTEM";
}

function getAgentActivity(
  data: DashboardData,
  actor: string,
) {
  const matchingEvents =
    data.recentEvents.filter(
      (event) =>
        event.actor
          .toLowerCase()
          .includes(
            actor.replace("_", " "),
          ) ||
        event.actor
          .toLowerCase()
          .includes(actor),
    );

  return matchingEvents.length;
}

/*
 * Client-only clock display.
 *
 * This prevents:
 * Server:
 *   11:44:37 PM
 *
 * Client:
 *   11:44:38 PM
 *
 * from producing a hydration mismatch.
 */
function LastRefreshTime({
  generatedAt,
}: {
  generatedAt: string;
}) {
  const [time, setTime] = useState("");

  useEffect(() => {
    setTime(
      new Date(
        generatedAt,
      ).toLocaleTimeString(),
    );
  }, [generatedAt]);

  if (!time) {
    return (
      <span className="text-[10px] font-bold text-zinc-600">
        —
      </span>
    );
  }

  return (
    <span className="text-[10px] font-bold text-zinc-600">
      {time}
    </span>
  );
}

export default function Dashboard() {
  const [data, setData] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /*
   * Client clock.
   *
   * It starts at 0 so the server-rendered HTML
   * and the initial client-rendered HTML match.
   */
  const [now, setNow] = useState(0);

  const loadDashboard =
    useCallback(async () => {
      try {
        const response =
          await fetch(
            "/api/dashboard",
            {
              cache: "no-store",
            },
          );

        const json =
          (await response.json()) as
            | DashboardData
            | {
                error?: string;
              };

        if (!response.ok) {
          throw new Error(
            "error" in json
              ? json.error ??
                  "Dashboard failed"
              : "Dashboard failed",
          );
        }

        setData(
          json as DashboardData,
        );

        setError("");

        /*
         * Set the current time only in the
         * browser after the request completes.
         */
        setNow(Date.now());
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Dashboard unavailable",
        );
      } finally {
        setLoading(false);
      }
    }, []);

  /*
   * Load immediately and refresh every 5 seconds.
   */
  useEffect(() => {
    void loadDashboard();

    const interval =
      window.setInterval(() => {
        void loadDashboard();
      }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadDashboard]);

  /*
   * Keep relative event timestamps fresh
   * without affecting server hydration.
   */
  useEffect(() => {
    if (!data) {
      return;
    }

    const clock =
      window.setInterval(() => {
        setNow(Date.now());
      }, 1000);

    return () => {
      window.clearInterval(clock);
    };
  }, [data]);

  const dashboard: DashboardData =
    data ?? {
      agentsOnline: 0,
      transactions: 0,
      policyChecks: 0,
      agentActivity: 0,
      systemHealth: 100,
      recentFailures: 0,
      recentEvents: [],
      transactionStates: [],
      generatedAt: "",
    };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050507] text-white">
      <CursorTrail />

      <InteractiveBackground />

      {/* =====================================================
          NAVBAR
      ====================================================== */}

      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#050507]/75 backdrop-blur-2xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link
            href="/"
            className="group flex items-center gap-3"
          >
            <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-cyan-300/20 bg-white/[0.04]">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/30 to-fuchsia-500/30 blur-xl transition-opacity group-hover:opacity-100" />

              <span className="relative font-black">
                M
              </span>
            </div>

            <div>
              <div className="text-sm font-bold tracking-[0.18em]">
                MONEY AUTOPILOT
              </div>

              <div className="hidden text-[9px] tracking-[0.3em] text-zinc-600 sm:block">
                OBSERVATORY
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <Link
              href="/"
              className="text-sm text-zinc-500 transition hover:text-white"
            >
              Home
            </Link>

            <Link
              href="/shop"
              className="text-sm text-zinc-500 transition hover:text-white"
            >
              AI Shop
            </Link>

            <span className="text-sm font-semibold text-cyan-300">
              Observatory
            </span>
          </nav>

          <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-[10px] font-bold tracking-wider text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />

            SYSTEM ONLINE
          </div>
        </div>
      </header>

      {/* =====================================================
          HERO
      ====================================================== */}

      <section className="mx-auto max-w-7xl px-6 pb-12 pt-16 lg:px-8 lg:pt-20">
        <motion.div
          initial={{
            opacity: 0,
            y: 25,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.7,
          }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/5 px-4 py-2 text-[10px] font-bold tracking-[0.25em] text-cyan-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />

            LIVE COMMERCE INTELLIGENCE
          </div>

          <h1 className="mt-7 max-w-5xl text-5xl font-black leading-[0.95] tracking-[-0.05em] sm:text-6xl lg:text-8xl">
            The system
            <br />

            <span className="bg-gradient-to-r from-cyan-300 via-white to-fuchsia-400 bg-clip-text text-transparent">
              is thinking.
            </span>
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-500">
            Observatory gives you a live view into
            the agents, transactions, policies and
            decisions powering Money Autopilot.
          </p>

          <div className="mt-6 flex items-center gap-3 text-[9px] font-bold tracking-[0.2em] text-zinc-600">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />

            DATABASE CONNECTED

            <span className="text-zinc-800">
              •
            </span>

            AUTO REFRESH 5S
          </div>
        </motion.div>
      </section>

      {/* =====================================================
          ERROR
      ====================================================== */}

      {error && (
        <section className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-300">
            {error}
          </div>
        </section>
      )}

      {/* =====================================================
          METRICS
      ====================================================== */}

      <section className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "AGENTS ONLINE",
              value:
                dashboard.agentsOnline
                  .toString()
                  .padStart(2, "0"),
              status:
                "ALL SYSTEMS NOMINAL",
              icon: "◉",
            },
            {
              label: "TRANSACTIONS",
              value:
                dashboard.transactions.toLocaleString(
                  "en-IN",
                ),
              status:
                "DATABASE RECORDED",
              icon: "◇",
            },
            {
              label: "POLICY CHECKS",
              value:
                dashboard.policyChecks.toLocaleString(
                  "en-IN",
                ),
              status:
                "AUDIT LOG ACTIVITY",
              icon: "⬡",
            },
            {
              label: "SYSTEM HEALTH",
              value: `${dashboard.systemHealth.toFixed(
                1,
              )}%`,
              status:
                dashboard.recentFailures ===
                0
                  ? "NO RECENT FAILURES"
                  : `${dashboard.recentFailures} RECENT FAILURES`,
              icon: "△",
            },
          ].map(
            (metric, index) => (
              <ProximityGlow
                key={metric.label}
                radius={220}
                className="rounded-3xl"
              >
                <TiltCard className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-6">
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: 20,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      delay:
                        index * 0.08,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-600">
                        {metric.label}
                      </span>

                      <span className="text-cyan-300">
                        {metric.icon}
                      </span>
                    </div>

                    <div className="mt-7 text-4xl font-black tracking-tight">
                      {loading
                        ? "—"
                        : metric.value}
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-[9px] font-bold tracking-wider text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                      {metric.status}
                    </div>
                  </motion.div>
                </TiltCard>
              </ProximityGlow>
            ),
          )}
        </div>
      </section>

      {/* =====================================================
          MAIN OBSERVATORY
      ====================================================== */}

      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
          {/* =================================================
              AGENTS
          ================================================== */}

          <ProximityGlow
            radius={300}
            className="rounded-[2rem]"
          >
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-6 sm:p-8">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[10px] font-bold tracking-[0.25em] text-cyan-300">
                    AGENT NETWORK
                  </div>

                  <h2 className="mt-2 text-2xl font-black">
                    Intelligence layer
                  </h2>
                </div>

                <span className="text-[10px] text-zinc-600">
                  {dashboard.agentsOnline}{" "}
                  NODES
                </span>
              </div>

              <div className="mt-8 space-y-4">
                {agents.map(
                  (
                    agent,
                    index,
                  ) => {
                    const recent =
                      getAgentActivity(
                        dashboard,
                        agent.actor,
                      );

                    return (
                      <ProximityGlow
                        key={
                          agent.name
                        }
                        radius={180}
                        className="rounded-2xl"
                      >
                        <TiltCard className="group rounded-2xl border border-white/10 bg-black/30 p-5">
                          <div className="flex items-start gap-4">
                            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/5 text-cyan-300">
                              <span className="relative">
                                {
                                  agent.icon
                                }
                              </span>

                              <span className="absolute inset-0 animate-ping rounded-xl border border-cyan-300/20 opacity-30" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <h3 className="font-bold transition-colors group-hover:text-cyan-300">
                                    {
                                      agent.name
                                    }
                                  </h3>

                                  <div className="mt-1 text-[9px] font-bold tracking-[0.2em] text-zinc-700">
                                    {
                                      agent.role
                                    }
                                  </div>
                                </div>

                                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/5 px-2.5 py-1 text-[9px] font-bold text-emerald-300">
                                  ● ACTIVE
                                </span>
                              </div>

                              <div className="mt-5 text-xs text-zinc-500">
                                {recent > 0
                                  ? `${recent} recent event${
                                      recent ===
                                      1
                                        ? ""
                                        : "s"
                                    } recorded`
                                  : "Waiting for activity"}
                              </div>

                              <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
                                <motion.div
                                  initial={{
                                    width: 0,
                                  }}
                                  animate={{
                                    width:
                                      recent >
                                      0
                                        ? `${Math.min(
                                            100,
                                            recent *
                                              20,
                                          )}%`
                                        : "4%",
                                  }}
                                  transition={{
                                    duration: 1,
                                    delay:
                                      0.4 +
                                      index *
                                        0.15,
                                  }}
                                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-400"
                                />
                              </div>

                              <div className="mt-2 flex items-center justify-between text-[9px] text-zinc-700">
                                <span>
                                  LIVE EVENT ACTIVITY
                                </span>

                                <span>
                                  {recent}
                                </span>
                              </div>
                            </div>
                          </div>
                        </TiltCard>
                      </ProximityGlow>
                    );
                  },
                )}
              </div>

              <div className="mt-5 rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-[9px] font-bold tracking-[0.2em] text-zinc-700">
                  TOTAL AGENT ACTIVITY
                </div>

                <div className="mt-2 text-2xl font-black text-cyan-300">
                  {dashboard.agentActivity.toLocaleString(
                    "en-IN",
                  )}
                </div>

                <div className="mt-1 text-[10px] text-zinc-600">
                  Events recorded by the audit
                  system
                </div>
              </div>
            </div>
          </ProximityGlow>

          {/* =================================================
              EVENT STREAM
          ================================================== */}

          <ProximityGlow
            radius={280}
            className="rounded-[2rem]"
          >
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-6 sm:p-8">
              <div>
                <div className="text-[10px] font-bold tracking-[0.25em] text-fuchsia-300">
                  EVENT STREAM
                </div>

                <h2 className="mt-2 text-2xl font-black">
                  System activity
                </h2>
              </div>

              <div className="relative mt-8">
                <div className="absolute bottom-2 left-[7px] top-2 w-px bg-white/10" />

                <div className="space-y-6">
                  {dashboard.recentEvents
                    .length === 0 ? (
                    <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-5">
                      <div className="text-xs font-bold text-zinc-500">
                        NO EVENTS YET
                      </div>

                      <p className="mt-2 text-xs leading-5 text-zinc-700">
                        Use the AI Shop to generate
                        real agent activity.
                      </p>
                    </div>
                  ) : (
                    dashboard.recentEvents.map(
                      (
                        event,
                        index,
                      ) => (
                        <motion.div
                          key={
                            event.id
                          }
                          initial={{
                            opacity: 0,
                            x: 15,
                          }}
                          animate={{
                            opacity: 1,
                            x: 0,
                          }}
                          transition={{
                            delay:
                              index *
                              0.05,
                          }}
                          className="relative flex gap-4"
                        >
                          <div className="relative z-10 mt-1 h-[15px] w-[15px] rounded-full border-4 border-[#08080b] bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,.5)]" />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[9px] font-bold tracking-wider text-zinc-700">
                                {getEventCategory(
                                  event,
                                )}
                              </span>

                              <span className="text-[9px] text-zinc-700">
                                {now > 0
                                  ? formatEventTime(
                                      event.createdAt,
                                      now,
                                    )
                                  : "—"}
                              </span>
                            </div>

                            <p className="mt-1 text-xs font-semibold leading-5 text-zinc-400">
                              {formatEventType(
                                event.eventType,
                              )}
                            </p>

                            <p className="mt-1 text-[10px] leading-5 text-zinc-600">
                              {formatActor(
                                event.actor,
                              )}

                              {event.reason
                                ? ` • ${event.reason}`
                                : ""}
                            </p>
                          </div>
                        </motion.div>
                      ),
                    )
                  )}
                </div>
              </div>
            </div>
          </ProximityGlow>
        </div>
      </section>

      {/* =====================================================
          TRANSACTION PIPELINE
      ====================================================== */}

      <section className="mx-auto max-w-7xl px-6 pb-12 lg:px-8">
        <ProximityGlow
          radius={350}
          className="rounded-[2rem]"
        >
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.025] p-7 sm:p-10">
            <div className="absolute right-[-8rem] top-[-8rem] h-64 w-64 rounded-full bg-cyan-400/10 blur-[100px]" />

            <div className="relative">
              <div className="text-[10px] font-bold tracking-[0.25em] text-cyan-300">
                TRANSACTION PIPELINE
              </div>

              <h2 className="mt-2 text-2xl font-black">
                From intent to money movement
              </h2>

              <div className="mt-10 grid gap-3 md:grid-cols-5">
                {[
                  [
                    "01",
                    "INTENT",
                    "BUYER EVENTS",
                  ],
                  [
                    "02",
                    "PRODUCT",
                    "SEARCH EVENTS",
                  ],
                  [
                    "03",
                    "POLICY",
                    "POLICY EVENTS",
                  ],
                  [
                    "04",
                    "PAYMENT",
                    "TRANSACTION DATA",
                  ],
                  [
                    "05",
                    "SETTLEMENT",
                    "SERVER CONTROLLED",
                  ],
                ].map(
                  (
                    [number, title, status],
                    index,
                  ) => (
                    <div
                      key={number}
                      className="relative"
                    >
                      <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                        <div className="text-[9px] font-bold text-zinc-700">
                          {number}
                        </div>

                        <div className="mt-6 text-sm font-bold">
                          {title}
                        </div>

                        <div className="mt-2 text-[9px] font-bold tracking-wider text-cyan-300">
                          {status}
                        </div>
                      </div>

                      {index < 4 && (
                        <div className="absolute -right-2 top-1/2 z-10 hidden text-cyan-300 md:block">
                          →
                        </div>
                      )}
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </ProximityGlow>
      </section>

      {/* =====================================================
          TRANSACTION STATES
      ====================================================== */}

      <section className="mx-auto max-w-7xl px-6 pb-12 lg:px-8">
        <div className="grid gap-5 md:grid-cols-2">
          <ProximityGlow
            radius={220}
            className="rounded-3xl"
          >
            <TiltCard className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
              <div className="text-[9px] font-bold tracking-[0.2em] text-zinc-600">
                TRANSACTION STATES
              </div>

              <h2 className="mt-2 text-xl font-black">
                Live database distribution
              </h2>

              <div className="mt-6 space-y-3">
                {dashboard.transactionStates
                  .length === 0 ? (
                  <div className="text-xs text-zinc-700">
                    No transactions recorded yet.
                  </div>
                ) : (
                  dashboard.transactionStates.map(
                    (item) => (
                      <div
                        key={item.state}
                        className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3"
                      >
                        <span className="text-xs font-bold text-zinc-500">
                          {item.state}
                        </span>

                        <span className="text-sm font-black text-cyan-300">
                          {item.count}
                        </span>
                      </div>
                    ),
                  )
                )}
              </div>
            </TiltCard>
          </ProximityGlow>

          <ProximityGlow
            radius={220}
            className="rounded-3xl"
          >
            <TiltCard className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
              <div className="text-[9px] font-bold tracking-[0.2em] text-zinc-600">
                OBSERVATORY STATUS
              </div>

              <h2 className="mt-2 text-xl font-black">
                Database-backed telemetry
              </h2>

              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
                  <span className="text-xs text-zinc-500">
                    Agent nodes
                  </span>

                  <span className="font-bold text-emerald-300">
                    {dashboard.agentsOnline}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
                  <span className="text-xs text-zinc-500">
                    Audit events
                  </span>

                  <span className="font-bold text-cyan-300">
                    {dashboard.recentEvents.length}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
                  <span className="text-xs text-zinc-500">
                    Recent failures
                  </span>

                  <span
                    className={
                      dashboard.recentFailures ===
                      0
                        ? "font-bold text-emerald-300"
                        : "font-bold text-red-300"
                    }
                  >
                    {dashboard.recentFailures}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
                  <span className="text-xs text-zinc-500">
                    Last refresh
                  </span>

                  <LastRefreshTime
                    generatedAt={
                      dashboard.generatedAt
                    }
                  />
                </div>
              </div>
            </TiltCard>
          </ProximityGlow>
        </div>
      </section>

      {/* =====================================================
          POLICY
      ====================================================== */}

      <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            [
              "DISCOUNT LIMIT",
              "10%",
              "Maximum automatic discount",
            ],
            [
              "UPSELL LIMIT",
              "₹500",
              "Maximum automatic upsell",
            ],
            [
              "APPROVAL THRESHOLD",
              "₹10K",
              "Manual approval required above",
            ],
          ].map(
            ([label, value, description]) => (
              <ProximityGlow
                key={label}
                radius={200}
                className="rounded-3xl"
              >
                <TiltCard className="group rounded-3xl border border-white/10 bg-white/[0.025] p-6">
                  <div className="text-[9px] font-bold tracking-[0.2em] text-zinc-600">
                    {label}
                  </div>

                  <div className="mt-5 text-3xl font-black transition-colors group-hover:text-cyan-300">
                    {value}
                  </div>

                  <div className="mt-2 text-xs text-zinc-600">
                    {description}
                  </div>
                </TiltCard>
              </ProximityGlow>
            ),
          )}
        </div>
      </section>

      {/* =====================================================
          FOOTER
      ====================================================== */}

      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-10 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            <div className="text-sm font-bold tracking-[0.18em]">
              MONEY AUTOPILOT
            </div>

            <div className="mt-2 text-xs text-zinc-700">
              Autonomous commerce infrastructure.
            </div>
          </div>

          <div className="flex gap-6 text-xs text-zinc-600">
            <Link
              href="/"
              className="transition hover:text-white"
            >
              Home
            </Link>

            <Link
              href="/shop"
              className="transition hover:text-white"
            >
              AI Shop
            </Link>

            <Link
              href="/checkout"
              className="transition hover:text-white"
            >
              Checkout
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}