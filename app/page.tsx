"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import AIOrb from "@/components/effects/AIOrb";
import ColorBomb from "@/components/effects/ColorBomb";
import InteractiveBackground from "@/components/effects/InteractiveBackground";
import MagneticButton from "@/components/effects/MagneticButton";
import TiltCard from "@/components/effects/TiltCard";
import CursorTrail from "@/components/effects/CursorTrail";
import ProximityGlow from "@/components/effects/ProximityGlow";

const features = [
  {
    number: "01",
    title: "Understand",
    description:
      "The Buyer Agent turns natural language into precise shopping intent.",
  },
  {
    number: "02",
    title: "Discover",
    description:
      "Real products are searched and evaluated against the buyer's constraints.",
  },
  {
    number: "03",
    title: "Decide",
    description:
      "Buyer utility and merchant economics are evaluated together.",
  },
  {
    number: "04",
    title: "Control",
    description:
      "Deterministic financial policies govern what automation is allowed to do.",
  },
];

const agents = [
  {
    label: "BUYER AGENT",
    title: "What does the buyer actually want?",
    text: "Understands budget, priorities, requirements and use case from natural language.",
    icon: "◉",
  },
  {
    label: "MERCHANT AGENT",
    title: "Which option makes the most sense?",
    text: "Balances buyer requirements with merchant economics and available inventory.",
    icon: "◇",
  },
  {
    label: "POLICY ENGINE",
    title: "Should the action be allowed?",
    text: "Applies deterministic financial controls before money moves.",
    icon: "⬡",
  },
];

export default function Home() {
  const [showBomb, setShowBomb] = useState(false);

  function activateDemo() {
    setShowBomb(false);

    window.setTimeout(() => {
      setShowBomb(true);
    }, 50);
  }

  function goToShop() {
    window.location.href = "/shop";
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050507] text-white">
      {/* ========================= */}
      {/* GLOBAL EFFECTS */}
      {/* ========================= */}

      <CursorTrail />

      <InteractiveBackground />

      <ColorBomb trigger={showBomb} />

      {/* ========================= */}
      {/* NAVBAR */}
      {/* ========================= */}

      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#050507]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link
            href="/"
            className="group flex items-center gap-3"
          >
            <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/[0.06]">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/30 to-fuchsia-500/30 opacity-0 blur-md transition group-hover:opacity-100" />

              <span className="relative text-sm font-black">
                M
              </span>
            </div>

            <div>
              <div className="text-sm font-bold tracking-[0.18em]">
                MONEY AUTOPILOT
              </div>

              <div className="hidden text-[9px] tracking-[0.3em] text-zinc-500 sm:block">
                AUTONOMOUS COMMERCE
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#how"
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              How it works
            </a>

            <a
              href="#agents"
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              AI Agents
            </a>

            <Link
              href="/dashboard"
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              Observatory
            </Link>
          </nav>

          <MagneticButton
            onClick={goToShop}
            className="rounded-full border border-cyan-300/30 bg-cyan-300 px-5 py-2.5 text-sm font-bold text-black"
          >
            Start Shopping →
          </MagneticButton>
        </div>
      </header>

      {/* ========================= */}
      {/* HERO */}
      {/* ========================= */}

      <section className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl items-center px-6 py-20 lg:px-8">
        <div className="grid w-full items-center gap-12 lg:grid-cols-[1.1fr_.9fr]">
          <motion.div
            initial={{
              opacity: 0,
              y: 30,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.8,
            }}
          >
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-zinc-300 backdrop-blur">
              <motion.span
                className="h-2 w-2 rounded-full bg-emerald-400"
                animate={{
                  opacity: [0.4, 1, 0.4],
                  scale: [0.8, 1.2, 0.8],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                }}
              />

              AUTONOMOUS COMMERCE IS ONLINE
            </div>

            <h1 className="max-w-5xl text-5xl font-black leading-[0.95] tracking-[-0.05em] sm:text-6xl lg:text-8xl">
              AI agents that
              <br />

              <span className="bg-gradient-to-r from-cyan-300 via-white to-fuchsia-400 bg-clip-text text-transparent">
                actually move
              </span>

              <br />

              commerce.
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-zinc-400 sm:text-xl">
              Money Autopilot turns natural-language shopping intent into
              real commerce — while deterministic financial controls decide
              what automation is allowed to do.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <MagneticButton
                onClick={goToShop}
                className="group rounded-2xl bg-white px-7 py-4 text-center font-bold text-black"
              >
                Experience Money Autopilot →
              </MagneticButton>

              <MagneticButton
                onClick={activateDemo}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-7 py-4 font-semibold text-white backdrop-blur"
              >
                Trigger the color bomb 💥
              </MagneticButton>
            </div>

            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-xs uppercase tracking-[0.18em] text-zinc-600">
              <span>Buyer Utility</span>
              <span>→</span>
              <span>Merchant Economics</span>
              <span>→</span>
              <span>Financial Control</span>
            </div>
          </motion.div>

          {/* ========================= */}
          {/* AI ORB */}
          {/* ========================= */}

          <motion.div
            className="relative flex min-h-[480px] items-center justify-center"
            initial={{
              opacity: 0,
              scale: 0.8,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            transition={{
              duration: 1,
              delay: 0.25,
              ease: "easeOut",
            }}
          >
            <div className="absolute h-[30rem] w-[30rem] rounded-full bg-cyan-400/5 blur-3xl" />

            <AIOrb />

            <motion.div
              className="absolute right-0 top-16 rounded-2xl border border-white/10 bg-black/50 px-4 py-3 backdrop-blur-xl"
              animate={{
                y: [0, -8, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <div className="text-[9px] tracking-[0.2em] text-zinc-500">
                BUYER AGENT
              </div>

              <div className="mt-1 text-sm font-semibold text-cyan-300">
                Intent understood
              </div>
            </motion.div>

            <motion.div
              className="absolute bottom-20 left-0 rounded-2xl border border-white/10 bg-black/50 px-4 py-3 backdrop-blur-xl"
              animate={{
                y: [0, 8, 0],
              }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <div className="text-[9px] tracking-[0.2em] text-zinc-500">
                POLICY ENGINE
              </div>

              <div className="mt-1 text-sm font-semibold text-emerald-300">
                Controls active
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ========================= */}
      {/* TICKER */}
      {/* ========================= */}

      <div className="overflow-hidden border-y border-white/[0.06] bg-white/[0.02]">
        <motion.div
          className="flex min-w-max gap-10 py-5 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500"
          animate={{
            x: ["0%", "-25%"],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {Array.from({ length: 3 }).map(
            (_, index) => (
              <div
                key={index}
                className="flex items-center gap-10"
              >
                <span>AI SHOPPING</span>

                <span className="text-cyan-400">
                  ✦
                </span>

                <span>REAL PRODUCTS</span>

                <span className="text-fuchsia-400">
                  ✦
                </span>

                <span>
                  MERCHANT INTELLIGENCE
                </span>

                <span className="text-yellow-300">
                  ✦
                </span>

                <span>
                  DETERMINISTIC FINANCIAL CONTROLS
                </span>

                <span className="text-emerald-400">
                  ✦
                </span>
              </div>
            ),
          )}
        </motion.div>
      </div>

      {/* ========================= */}
      {/* HOW IT WORKS */}
      {/* ========================= */}

      <section
        id="how"
        className="mx-auto max-w-7xl px-6 py-28 lg:px-8"
      >
        <motion.div
          initial={{
            opacity: 0,
            y: 25,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
          }}
        >
          <div className="text-xs font-bold tracking-[0.3em] text-cyan-300">
            THE SYSTEM
          </div>

          <h2 className="mt-5 max-w-4xl text-4xl font-bold tracking-[-0.04em] sm:text-6xl">
            Commerce shouldn't stop at a recommendation.
          </h2>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-500">
            Money Autopilot connects intelligence with execution, creating a
            controlled path from buyer intent to completed transaction.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map(
            (feature, index) => (
              <ProximityGlow
                key={feature.number}
                radius={240}
                className="rounded-3xl"
              >
                <TiltCard className="group rounded-3xl border border-white/10 bg-[#08080b] p-7">
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: 25,
                    }}
                    whileInView={{
                      opacity: 1,
                      y: 0,
                    }}
                    viewport={{
                      once: true,
                    }}
                    transition={{
                      delay: index * 0.08,
                    }}
                    className="min-h-[280px]"
                  >
                    <div className="text-xs font-bold text-zinc-600">
                      {feature.number}
                    </div>

                    <div className="mt-16 text-2xl font-bold transition-colors duration-300 group-hover:text-cyan-300">
                      {feature.title}
                    </div>

                    <p className="mt-4 text-sm leading-7 text-zinc-500">
                      {feature.description}
                    </p>
                  </motion.div>
                </TiltCard>
              </ProximityGlow>
            ),
          )}
        </div>
      </section>

      {/* ========================= */}
      {/* AI AGENTS */}
      {/* ========================= */}

      <section
        id="agents"
        className="border-y border-white/[0.06] bg-white/[0.015]"
      >
        <div className="mx-auto max-w-7xl px-6 py-28 lg:px-8">
          <div className="grid gap-16 lg:grid-cols-[.7fr_1.3fr]">
            <motion.div
              initial={{
                opacity: 0,
                x: -30,
              }}
              whileInView={{
                opacity: 1,
                x: 0,
              }}
              viewport={{
                once: true,
              }}
            >
              <div className="text-xs font-bold tracking-[0.3em] text-fuchsia-300">
                MULTI-AGENT COMMERCE
              </div>

              <h2 className="mt-5 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
                Different agents.
                <br />
                One controlled flow.
              </h2>

              <p className="mt-6 leading-8 text-zinc-500">
                Intelligence handles complexity. Policy handles permission.
                Together they create an autonomous commerce system that
                doesn't blindly move money.
              </p>
            </motion.div>

            <div className="space-y-5">
              {agents.map(
                (agent, index) => (
                  <ProximityGlow
                    key={agent.label}
                    radius={260}
                    className="rounded-3xl"
                  >
                    <TiltCard className="group rounded-3xl border border-white/10 bg-black/30 p-7">
                      <motion.div
                        initial={{
                          opacity: 0,
                          x: 30,
                        }}
                        whileInView={{
                          opacity: 1,
                          x: 0,
                        }}
                        viewport={{
                          once: true,
                        }}
                        transition={{
                          delay: index * 0.1,
                        }}
                        className="relative"
                      >
                        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-cyan-400/5 blur-3xl transition-all duration-500 group-hover:scale-125 group-hover:bg-cyan-400/10" />

                        <div className="relative flex gap-6">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-xl text-cyan-300 transition-transform duration-300 group-hover:scale-110">
                            {agent.icon}
                          </div>

                          <div>
                            <div className="text-[10px] font-bold tracking-[0.25em] text-zinc-600">
                              {agent.label}
                            </div>

                            <h3 className="mt-2 text-xl font-bold transition-colors duration-300 group-hover:text-cyan-300">
                              {agent.title}
                            </h3>

                            <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-500">
                              {agent.text}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    </TiltCard>
                  </ProximityGlow>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ========================= */}
      {/* FINANCIAL CONTROL */}
      {/* ========================= */}

      <section className="mx-auto max-w-7xl px-6 py-28 lg:px-8">
        <motion.div
          className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-cyan-400/[0.08] via-white/[0.02] to-fuchsia-500/[0.08] p-8 sm:p-12 lg:p-16"
          initial={{
            opacity: 0,
            scale: 0.97,
          }}
          whileInView={{
            opacity: 1,
            scale: 1,
          }}
          viewport={{
            once: true,
          }}
        >
          <div className="absolute right-[-10rem] top-[-10rem] h-[30rem] w-[30rem] rounded-full bg-fuchsia-500/10 blur-[120px]" />

          <div className="relative grid gap-12 lg:grid-cols-[1fr_1fr]">
            <div>
              <div className="text-xs font-bold tracking-[0.3em] text-emerald-300">
                FINANCIAL CONTROL
              </div>

              <h2 className="mt-5 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
                Autonomous doesn't mean uncontrolled.
              </h2>

              <p className="mt-6 max-w-xl leading-8 text-zinc-400">
                Every financial action passes through deterministic rules
                before execution. Discounts, retries, approvals and customer
                confirmation remain explicit.
              </p>

              <Link
                href="/dashboard"
                className="mt-8 inline-flex rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-semibold transition hover:bg-white/10"
              >
                Open Observatory →
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["10%", "MAX DISCOUNT"],
                ["₹500", "AUTO UPSELL"],
                ["1", "AUTO RETRY"],
                ["₹10K", "APPROVAL THRESHOLD"],
              ].map(
                ([value, label]) => (
                  <ProximityGlow
                    key={label}
                    radius={180}
                    className="rounded-2xl"
                  >
                    <TiltCard className="group rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur">
                      <div className="text-3xl font-black text-white transition-transform duration-300 group-hover:scale-105">
                        {value}
                      </div>

                      <div className="mt-2 text-[10px] font-bold tracking-[0.2em] text-zinc-600">
                        {label}
                      </div>
                    </TiltCard>
                  </ProximityGlow>
                ),
              )}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ========================= */}
      {/* FINAL CTA */}
      {/* ========================= */}

      <section className="relative mx-auto max-w-7xl px-6 pb-28 pt-10 text-center lg:px-8">
        <motion.div
          initial={{
            opacity: 0,
            y: 30,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
          }}
        >
          <div className="text-xs font-bold tracking-[0.3em] text-cyan-300">
            READY?
          </div>

          <h2 className="mx-auto mt-5 max-w-4xl text-5xl font-black tracking-[-0.05em] sm:text-7xl">
            Let the agents
            <br />

            <span className="bg-gradient-to-r from-cyan-300 via-white to-fuchsia-400 bg-clip-text text-transparent">
              move commerce.
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-zinc-500">
            Describe what you want. Money Autopilot handles the complexity.
          </p>

          <MagneticButton
            onClick={goToShop}
            className="mt-10 rounded-2xl bg-white px-8 py-4 font-bold text-black"
          >
            Start Shopping →
          </MagneticButton>
        </motion.div>
      </section>

      {/* ========================= */}
      {/* FOOTER */}
      {/* ========================= */}

      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-12 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <div className="text-sm font-bold tracking-[0.18em]">
              MONEY AUTOPILOT
            </div>

            <p className="mt-2 text-xs text-zinc-600">
              AI agents that actually move commerce.
            </p>
          </div>

          <div className="flex flex-wrap gap-6 text-xs text-zinc-500">
            <Link
              href="/shop"
              className="transition hover:text-white"
            >
              Shop
            </Link>

            <Link
              href="/dashboard"
              className="transition hover:text-white"
            >
              Observatory
            </Link>

            <a
              href="#how"
              className="transition hover:text-white"
            >
              How it works
            </a>

            <a
              href="#agents"
              className="transition hover:text-white"
            >
              Agents
            </a>
          </div>

          <div className="text-xs text-zinc-700">
            © 2026 Money Autopilot
          </div>
        </div>
      </footer>
    </main>
  );
}