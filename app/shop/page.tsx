"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  motion,
  AnimatePresence,
} from "framer-motion";

import CursorTrail from "@/components/effects/CursorTrail";
import InteractiveBackground from "@/components/effects/InteractiveBackground";
import ProximityGlow from "@/components/effects/ProximityGlow";
import TiltCard from "@/components/effects/TiltCard";

import {
  addToCart,
  getCartCount,
} from "@/lib/cart";

type Candidate = {
  id: string;
  name: string;
  brand?: string;
  price: number;
  mrp?: number | null;
  currency?: string;
  image?: string | null;
  rating?: number | null;
  ratingCount?: number | null;
  available?: boolean;
  inventory?: number | null;
  quantity?: string | null;
  seller?: string;
  source?: string;
  url: string;
};

type BuyerIntent = {
  category?: string | null;
  budget_max?: number | null;
  use_case?: string | null;
  priorities?: string[] | null;
  product_requirements?: string[] | null;
  battery_hours_min?: number | null;
  preferred_brands?: string[] | null;
  excluded_brands?: string[] | null;
  urgency?: string | null;
  price_sensitivity?: string | null;
};

type BuyerRanking = {
  product_id: string;
  score: number;
  factors?: {
    budget_fit?: number;
    requirement_match?: number;
    rating?: number;
    priority_match?: number;
    availability?: number;
  };
};

type MerchantRecommendation = {
  selected_product_id?: string;
  confidence?: number;
  expected_margin?: number;
  reason?: string;
  decision_factors?: string[];
};

type RecommendationResponse = {
  buyer_intent: BuyerIntent | unknown;
  candidates: Candidate[];
  buyer_ranking: BuyerRanking[];
  merchant_recommendation?: MerchantRecommendation | null;
};

type ApiError = {
  error?: string;
};

const pipeline = [
  {
    label: "BUYER AGENT",
    description: "Understanding intent",
    icon: "◉",
  },
  {
    label: "PRODUCT INTELLIGENCE",
    description: "Searching real products",
    icon: "◇",
  },
  {
    label: "MERCHANT AGENT",
    description: "Evaluating economics",
    icon: "⬡",
  },
  {
    label: "POLICY ENGINE",
    description: "Checking controls",
    icon: "△",
  },
];

export default function Shop() {
  const [q, setQ] = useState(
    "I need running shoes under ₹4,000 for daily running. I care about comfort and durability.",
  );

  const [loading, setLoading] = useState(false);

  const [data, setData] =
    useState<RecommendationResponse | null>(null);

  const [error, setError] = useState("");

  const [message, setMessage] = useState("");

  const [activeStage, setActiveStage] = useState(-1);

  const [cartCount, setCartCount] = useState(0);

  const [addedProductId, setAddedProductId] =
    useState<string | null>(null);

  useEffect(() => {
    setCartCount(getCartCount());

    const syncCart = () => {
      setCartCount(getCartCount());
    };

    window.addEventListener(
      "cart-updated",
      syncCart,
    );

    window.addEventListener(
      "storage",
      syncCart,
    );

    return () => {
      window.removeEventListener(
        "cart-updated",
        syncCart,
      );

      window.removeEventListener(
        "storage",
        syncCart,
      );
    };
  }, []);

  async function run() {
    if (loading) {
      return;
    }

    if (!q.trim()) {
      setError(
        "Please describe what you want to find.",
      );
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    setData(null);
    setActiveStage(0);

    const stageTimer = window.setInterval(() => {
      setActiveStage((current) => {
        if (current >= pipeline.length - 1) {
          return current;
        }

        return current + 1;
      });
    }, 650);

    try {
      if (!navigator.geolocation) {
        throw new Error(
          "Your browser does not support location services.",
        );
      }

      const location =
        await new Promise<{
          lat: number;
          lon: number;
        }>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                lat: position.coords.latitude,
                lon: position.coords.longitude,
              });
            },
            () => {
              reject(
                new Error(
                  "Location permission is required to search real products near you.",
                ),
              );
            },
            {
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 300000,
            },
          );
        });

      const response = await fetch(
        "/api/agent/commerce/recommend",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            message: q.trim(),
            location,
          }),
        },
      );

      const json =
        (await response.json()) as RecommendationResponse &
          ApiError;

      if (!response.ok) {
        throw new Error(
          json.error ?? "Recommendation failed",
        );
      }

      setData(json);

      if (!json.candidates?.length) {
        setMessage(
          "No matching real products were found for this search.",
        );
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Recommendation failed",
      );
    } finally {
      window.clearInterval(stageTimer);
      setActiveStage(pipeline.length - 1);
      setLoading(false);
    }
  }

  function getRanking(productId: string) {
    return data?.buyer_ranking?.find(
      (ranking) =>
        ranking.product_id === productId,
    );
  }

  function formatPrice(
    price: number,
    currency = "INR",
  ) {
    if (currency === "INR") {
      return `₹${price.toLocaleString("en-IN")}`;
    }

    return `${currency} ${price.toLocaleString(
      "en-US",
    )}`;
  }

  function handleAddToCart(
    product: Candidate,
  ) {
    addToCart({
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      mrp: product.mrp,
      currency: product.currency,
      image: product.image,
      rating: product.rating,
      ratingCount: product.ratingCount,
      available: product.available,
      inventory: product.inventory,
      quantity: product.quantity,
      seller: product.seller,
      source: product.source,
      url: product.url,
    });

    setCartCount(getCartCount());
    setAddedProductId(product.id);

    window.setTimeout(() => {
      setAddedProductId((current) =>
        current === product.id
          ? null
          : current,
      );
    }, 1600);
  }

  const selectedProductId =
    data?.merchant_recommendation
      ?.selected_product_id;

  const recommendedProduct =
    selectedProductId
      ? data?.candidates.find(
          (product) =>
            product.id ===
            selectedProductId,
        )
      : undefined;

  const recommendedRanking =
    recommendedProduct
      ? getRanking(
          recommendedProduct.id,
        )
      : undefined;

  /*
   * Safely read buyer intent.
   * The backend already returns structured
   * intent, but this keeps the UI defensive.
   */
  const buyerIntent: BuyerIntent =
    data?.buyer_intent &&
    typeof data.buyer_intent === "object"
      ? (data.buyer_intent as BuyerIntent)
      : {};

  /*
   * Build transparent explanations from the
   * actual backend ranking factors.
   *
   * We deliberately do NOT invent claims about
   * the product. Every explanation below comes
   * from either:
   * - the buyer's intent,
   * - the returned ranking factors,
   * - or the actual product data.
   */
  const recommendationReasons: string[] =
    [];

  if (
    recommendedProduct &&
    buyerIntent.budget_max != null
  ) {
    if (
      recommendedProduct.price <=
      buyerIntent.budget_max
    ) {
      const savings =
        buyerIntent.budget_max -
        recommendedProduct.price;

      recommendationReasons.push(
        `${formatPrice(
          savings,
        )} below your ${formatPrice(
          buyerIntent.budget_max,
        )} budget`,
      );
    }
  }

  if (
    recommendedRanking?.factors
      ?.requirement_match != null &&
    recommendedRanking.factors
      .requirement_match >= 70
  ) {
    recommendationReasons.push(
      "Strong match for your product requirements",
    );
  }

  if (
    recommendedRanking?.factors
      ?.priority_match != null &&
    recommendedRanking.factors
      .priority_match >= 70
  ) {
    recommendationReasons.push(
      "Strong match for your stated priorities",
    );
  }

  if (
    recommendedRanking?.factors
      ?.availability != null &&
    recommendedRanking.factors
      .availability >= 70
  ) {
    recommendationReasons.push(
      "Currently available",
    );
  }

  if (
    recommendedProduct?.rating != null &&
    recommendedProduct.rating >= 4
  ) {
    recommendationReasons.push(
      `${recommendedProduct.rating}★ customer rating`,
    );
  }

  /*
   * Make sure the explanation section doesn't
   * become empty if the backend gives unusual
   * factor values.
   */
  if (
    recommendationReasons.length === 0 &&
    data?.merchant_recommendation?.reason
  ) {
    recommendationReasons.push(
      data.merchant_recommendation.reason,
    );
  }

  const confidence =
    data?.merchant_recommendation
      ?.confidence;

  const confidencePercent =
    confidence != null
      ? Math.round(
          confidence > 1
            ? confidence
            : confidence * 100,
        )
      : null;

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
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/30 to-fuchsia-500/30 blur-xl" />

              <span className="relative font-black">
                M
              </span>
            </div>

            <div>
              <div className="text-sm font-bold tracking-[0.18em]">
                MONEY AUTOPILOT
              </div>

              <div className="hidden text-[9px] tracking-[0.3em] text-zinc-600 sm:block">
                AI COMMERCE ENGINE
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            <Link
              href="/"
              className="text-sm text-zinc-500 transition hover:text-white"
            >
              Home
            </Link>

            <span className="text-sm font-semibold text-cyan-300">
              AI Shop
            </span>

            <Link
              href="/dashboard"
              className="text-sm text-zinc-500 transition hover:text-white"
            >
              Observatory
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-[10px] font-bold tracking-wider text-emerald-300 sm:flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              SYSTEM ONLINE
            </div>

            <Link
              href="/cart"
              className="rounded-xl border border-cyan-300/20 bg-cyan-300/5 px-3 py-2 text-xs font-bold text-cyan-300 transition hover:bg-cyan-300 hover:text-black"
            >
              🛒 {cartCount}
            </Link>
          </div>
        </div>
      </header>

      {/* =====================================================
          HERO
      ====================================================== */}

      <section className="relative mx-auto max-w-7xl px-6 pb-12 pt-16 lg:px-8 lg:pt-24">
        <div className="grid gap-12 lg:grid-cols-[1fr_.75fr]">
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
              AUTONOMOUS SHOPPING
            </div>

            <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.05em] sm:text-6xl lg:text-7xl">
              Tell the AI
              <br />

              <span className="bg-gradient-to-r from-cyan-300 via-white to-fuchsia-400 bg-clip-text text-transparent">
                what you want.
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-500">
              No filters. No endless scrolling.
              Describe your requirements naturally
              and let the commerce agents find the
              best real-world options.
            </p>
          </motion.div>

          {/* AGENT NETWORK */}

          <ProximityGlow
            radius={280}
            className="rounded-3xl"
          >
            <TiltCard className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-6">
              <div className="absolute right-[-5rem] top-[-5rem] h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />

              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-[0.25em] text-zinc-600">
                    AGENT NETWORK
                  </span>

                  <span className="text-xs text-emerald-300">
                    ● ACTIVE
                  </span>
                </div>

                <div className="mt-6 space-y-3">
                  {pipeline.map(
                    (stage, index) => {
                      const active =
                        loading &&
                        activeStage >=
                          index;

                      const completed =
                        !loading &&
                        Boolean(data);

                      return (
                        <div
                          key={stage.label}
                          className="flex items-center gap-4"
                        >
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-xl border text-sm transition-all duration-500 ${
                              active ||
                              completed
                                ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-300"
                                : "border-white/10 bg-white/[0.03] text-zinc-700"
                            }`}
                          >
                            {stage.icon}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold">
                              {stage.label}
                            </div>

                            <div className="mt-0.5 text-[10px] text-zinc-600">
                              {
                                stage.description
                              }
                            </div>
                          </div>

                          <div
                            className={`h-1.5 w-1.5 rounded-full ${
                              active ||
                              completed
                                ? "bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,.8)]"
                                : "bg-zinc-800"
                            }`}
                          />
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            </TiltCard>
          </ProximityGlow>
        </div>
      </section>

      {/* =====================================================
          SEARCH
      ====================================================== */}

      <section className="mx-auto max-w-7xl px-6 lg:px-8">
        <ProximityGlow
          radius={260}
          className="rounded-[2rem]"
        >
          <div className="relative overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-white/[0.035] p-5 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl sm:p-7">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-300/[0.04] via-transparent to-fuchsia-400/[0.04]" />

            <div className="relative">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold tracking-[0.25em] text-cyan-300">
                    NATURAL LANGUAGE QUERY
                  </div>

                  <div className="mt-1 text-xs text-zinc-600">
                    Describe anything you want to
                    find.
                  </div>
                </div>

                <div className="hidden rounded-full border border-white/10 px-3 py-1 text-[9px] text-zinc-600 sm:block">
                  LOCATION AWARE
                </div>
              </div>

              <textarea
                value={q}
                onChange={(e) =>
                  setQ(e.target.value)
                }
                disabled={loading}
                className="h-36 w-full resize-none rounded-2xl border border-white/10 bg-black/40 p-5 text-base leading-7 text-white outline-none transition placeholder:text-zinc-700 focus:border-cyan-300/40 focus:ring-4 focus:ring-cyan-300/5 disabled:opacity-60"
                placeholder="Tell me what you want..."
              />

              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-zinc-600">
                  Your location helps the system
                  find relevant products around you.
                </p>

                <button
                  type="button"
                  disabled={loading}
                  onClick={run}
                  className="rounded-xl bg-cyan-300 px-7 py-3.5 font-bold text-black shadow-lg shadow-cyan-500/10 transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "Agents are thinking..."
                    : "Find my products →"}
                </button>
              </div>
            </div>
          </div>
        </ProximityGlow>
      </section>

      {/* =====================================================
          ERROR
      ====================================================== */}

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{
              opacity: 0,
              y: 15,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -15,
            }}
            className="mx-auto mt-6 max-w-7xl px-6 lg:px-8"
          >
            <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-5 text-sm text-red-300">
              <span className="font-bold">
                SEARCH ERROR
              </span>

              <span className="ml-3">
                {error}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================
          MESSAGE
      ====================================================== */}

      <AnimatePresence>
        {message && !error && (
          <motion.div
            initial={{
              opacity: 0,
              y: 15,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -15,
            }}
            className="mx-auto mt-6 max-w-7xl px-6 lg:px-8"
          >
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5 text-sm text-emerald-300">
              {message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================
          EMPTY STATE
      ====================================================== */}

      {!data && !error && (
        <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                number: "01",
                title: "Describe",
                text: "Tell the system what you're actually looking for.",
              },
              {
                number: "02",
                title: "Agents decide",
                text: "Buyer and merchant intelligence evaluate the options.",
              },
              {
                number: "03",
                title: "You choose",
                text: "See transparent recommendations and real products.",
              },
            ].map((item) => (
              <ProximityGlow
                key={item.number}
                radius={200}
                className="rounded-3xl"
              >
                <TiltCard className="rounded-3xl border border-white/10 bg-white/[0.025] p-7">
                  <div className="text-xs font-bold text-zinc-700">
                    {item.number}
                  </div>

                  <div className="mt-10 text-xl font-bold">
                    {item.title}
                  </div>

                  <p className="mt-3 text-sm leading-7 text-zinc-600">
                    {item.text}
                  </p>
                </TiltCard>
              </ProximityGlow>
            ))}
          </div>
        </section>
      )}

      {/* =====================================================
          RESULTS
      ====================================================== */}

      {data && (
        <section className="mx-auto max-w-7xl px-6 pb-28 pt-16 lg:px-8">
          {/* =================================================
              BUYER INTENT
          ================================================== */}

          <ProximityGlow
            radius={260}
            className="rounded-3xl"
          >
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold tracking-[0.25em] text-cyan-300">
                    BUYER INTENT
                  </div>

                  <h2 className="mt-2 text-2xl font-bold">
                    What the agent understood
                  </h2>
                </div>

                <div className="hidden rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1 text-[9px] font-bold text-emerald-300 sm:block">
                  ANALYSIS COMPLETE
                </div>
              </div>

              <pre className="mt-6 max-h-72 overflow-auto rounded-2xl border border-white/5 bg-black/40 p-5 text-xs leading-6 text-zinc-400">
                {JSON.stringify(
                  data.buyer_intent,
                  null,
                  2,
                )}
              </pre>
            </div>
          </ProximityGlow>

          {/* =================================================
              AI RECOMMENDATION
          ================================================== */}

          {recommendedProduct && (
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
                duration: 0.6,
              }}
              className="mt-8"
            >
              <ProximityGlow
                radius={300}
                className="rounded-[2rem]"
              >
                <div className="relative overflow-hidden rounded-[2rem] border border-cyan-300/30 bg-gradient-to-br from-cyan-300/[0.08] via-white/[0.025] to-fuchsia-400/[0.06] p-6 sm:p-8">
                  <div className="absolute right-[-8rem] top-[-8rem] h-64 w-64 rounded-full bg-cyan-300/10 blur-[100px]" />

                  <div className="relative">
                    {/* HEADER */}

                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-cyan-300 px-3 py-1 text-[9px] font-black tracking-wider text-black">
                            ⭐ BEST MATCH
                          </span>

                          {recommendedProduct.source && (
                            <span className="rounded-full border border-white/10 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                              {recommendedProduct.source}
                            </span>
                          )}
                        </div>

                        <div className="mt-5 text-[10px] font-bold tracking-[0.25em] text-cyan-300">
                          AGENT CONSENSUS
                        </div>

                        <h2 className="mt-2 text-3xl font-black">
                          AI Recommendation
                        </h2>
                      </div>

                      {confidencePercent !==
                        null && (
                        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/5 px-5 py-4 text-right">
                          <div className="text-[9px] font-bold tracking-[0.2em] text-zinc-600">
                            AGENT CONFIDENCE
                          </div>

                          <div className="mt-1 text-2xl font-black text-cyan-300">
                            {confidencePercent}%
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-7 grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
                      {/* =================================================
                          PRODUCT IMAGE
                      ================================================== */}

                      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white">
                        {recommendedProduct.image ? (
                          <img
                            src={
                              recommendedProduct.image
                            }
                            alt={
                              recommendedProduct.name
                            }
                            className="h-72 w-full object-contain transition duration-500 hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-72 items-center justify-center text-sm text-zinc-400">
                            No image available
                          </div>
                        )}
                      </div>

                      {/* =================================================
                          PRODUCT INFO
                      ================================================== */}

                      <div className="flex flex-col justify-center">
                        <div className="inline-flex w-fit rounded-full border border-emerald-300/20 bg-emerald-300/5 px-3 py-1 text-[10px] font-black tracking-wider text-emerald-300">
                          {recommendedProduct.available
                            ? "✓ CURRENTLY AVAILABLE"
                            : "CHECK AVAILABILITY"}
                        </div>

                        {recommendedProduct.brand && (
                          <div className="mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">
                            {
                              recommendedProduct.brand
                            }
                          </div>
                        )}

                        <h3 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">
                          {
                            recommendedProduct.name
                          }
                        </h3>

                        {/* PRICE */}

                        <div className="mt-4 flex flex-wrap items-center gap-4">
                          <span className="text-3xl font-black text-cyan-300">
                            {formatPrice(
                              recommendedProduct.price,
                              recommendedProduct.currency,
                            )}
                          </span>

                          {recommendedProduct.mrp &&
                            recommendedProduct.mrp >
                              recommendedProduct.price && (
                              <span className="text-sm text-zinc-700 line-through">
                                {formatPrice(
                                  recommendedProduct.mrp,
                                  recommendedProduct.currency,
                                )}
                              </span>
                            )}

                          {recommendedProduct.rating !=
                            null && (
                            <span className="rounded-full border border-amber-300/15 bg-amber-300/5 px-3 py-1 text-xs text-amber-300">
                              ⭐{" "}
                              {
                                recommendedProduct.rating
                              }
                            </span>
                          )}
                        </div>

                        {/* =================================================
                            WHY THIS PRODUCT
                        ================================================== */}

                        <div className="mt-7 rounded-2xl border border-white/10 bg-black/20 p-5">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-[9px] font-bold tracking-[0.22em] text-fuchsia-300">
                                DECISION EXPLANATION
                              </div>

                              <div className="mt-1 text-base font-black">
                                Why the agent chose this
                              </div>
                            </div>

                            {recommendedRanking && (
                              <div className="text-right">
                                <div className="text-[8px] font-bold tracking-wider text-zinc-700">
                                  BUYER MATCH
                                </div>

                                <div className="text-xl font-black text-cyan-300">
                                  {
                                    recommendedRanking.score
                                  }
                                  /100
                                </div>
                              </div>
                            )}
                          </div>

                          {recommendationReasons.length >
                          0 ? (
                            <div className="mt-4 space-y-2.5">
                              {recommendationReasons
                                .slice(0, 5)
                                .map(
                                  (
                                    reason,
                                    index,
                                  ) => (
                                    <div
                                      key={`${reason}-${index}`}
                                      className="flex items-start gap-3"
                                    >
                                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-300/10 text-[10px] font-black text-emerald-300"
                                      >
                                        ✓
                                      </span>

                                      <span className="text-xs leading-5 text-zinc-400">
                                        {reason}
                                      </span>
                                    </div>
                                  ),
                                )}
                            </div>
                          ) : (
                            <p className="mt-4 text-xs leading-6 text-zinc-500">
                              The ranking engine selected
                              this product as the strongest
                              overall match from the returned
                              candidates.
                            </p>
                          )}
                        </div>

                        {/* =================================================
                            SCORE BREAKDOWN
                        ================================================== */}

                        {recommendedRanking?.factors && (
                          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
                            {[
                              {
                                label: "BUDGET",
                                value:
                                  recommendedRanking
                                    .factors
                                    .budget_fit,
                              },
                              {
                                label: "REQUIREMENTS",
                                value:
                                  recommendedRanking
                                    .factors
                                    .requirement_match,
                              },
                              {
                                label: "RATING",
                                value:
                                  recommendedRanking
                                    .factors
                                    .rating,
                              },
                              {
                                label: "PRIORITIES",
                                value:
                                  recommendedRanking
                                    .factors
                                    .priority_match,
                              },
                              {
                                label: "AVAILABILITY",
                                value:
                                  recommendedRanking
                                    .factors
                                    .availability,
                              },
                            ].map(
                              (factor) => (
                                <div
                                  key={
                                    factor.label
                                  }
                                  className="rounded-xl border border-white/[0.06] bg-black/20 p-3"
                                >
                                  <div className="text-[7px] font-bold tracking-[0.15em] text-zinc-700">
                                    {factor.label}
                                  </div>

                                  <div className="mt-1 text-sm font-black text-cyan-300">
                                    {factor.value !=
                                    null
                                      ? `${factor.value}`
                                      : "—"}
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        )}

                        {/* BACKEND REASON */}

                        {data
                          .merchant_recommendation
                          ?.reason && (
                          <p className="mt-5 text-xs leading-6 text-zinc-600">
                            {
                              data
                                .merchant_recommendation
                                .reason
                            }
                          </p>
                        )}

                        {/* =================================================
                            ACTIONS
                        ================================================== */}

                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                          <button
                            type="button"
                            onClick={() =>
                              handleAddToCart(
                                recommendedProduct,
                              )
                            }
                            className="flex flex-1 items-center justify-center rounded-xl bg-cyan-300 px-4 py-3.5 text-sm font-black text-black transition hover:-translate-y-0.5 hover:bg-cyan-200"
                          >
                            {addedProductId ===
                            recommendedProduct.id
                              ? "✓ Added to cart"
                              : "🛒 Add to cart"}
                          </button>

                          <a
                            href={
                              recommendedProduct.url
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-1 items-center justify-center rounded-xl border border-white/10 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-white/5"
                          >
                            View actual merchant →
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </ProximityGlow>
            </motion.div>
          )}

          {/* =================================================
              PRODUCT INTELLIGENCE
          ================================================== */}

          <div className="mt-12">
            <div className="mb-5 flex items-end justify-between">
              <div>
                <div className="text-[10px] font-bold tracking-[0.25em] text-fuchsia-300">
                  PRODUCT INTELLIGENCE
                </div>

                <h2 className="mt-2 text-2xl font-black">
                  {data.candidates.length} options
                  found
                </h2>

                <p className="mt-1 text-xs text-zinc-600">
                  Ranked for your requirements
                </p>
              </div>

              <Link
                href="/cart"
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-zinc-400 transition hover:border-cyan-300/30 hover:text-cyan-300"
              >
                🛒 Cart ({cartCount})
              </Link>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {data.candidates.map(
                (product, index) => {
                  const ranking =
                    getRanking(product.id);

                  const isRecommended =
                    product.id ===
                    selectedProductId;

                  const isAdded =
                    addedProductId ===
                    product.id;

                  return (
                    <motion.div
                      key={product.id}
                      initial={{
                        opacity: 0,
                        y: 20,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        duration: 0.45,
                        delay:
                          index * 0.05,
                      }}
                    >
                      <ProximityGlow
                        radius={220}
                        className="h-full rounded-3xl"
                      >
                        <TiltCard className="group flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025]">
                          {/* IMAGE */}

                          <div className="relative h-56 overflow-hidden bg-white">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="h-full w-full object-contain p-4 transition duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-sm text-zinc-400">
                                No image
                              </div>
                            )}

                            {isRecommended && (
                              <div className="absolute left-4 top-4 rounded-full bg-cyan-300 px-3 py-1 text-[9px] font-black tracking-wider text-black">
                                ⭐ AI PICK
                              </div>
                            )}
                          </div>

                          {/* CONTENT */}

                          <div className="flex flex-1 flex-col p-5">
                            {product.brand && (
                              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600">
                                {product.brand}
                              </div>
                            )}

                            <h3 className="mt-2 line-clamp-3 min-h-[4.5rem] text-sm font-bold leading-6">
                              {product.name}
                            </h3>

                            <div className="mt-4 flex items-center justify-between">
                              <div>
                                <div className="text-xl font-black">
                                  {formatPrice(
                                    product.price,
                                    product.currency,
                                  )}
                                </div>

                                {product.mrp &&
                                  product.mrp >
                                    product.price && (
                                    <div className="text-[10px] text-zinc-700 line-through">
                                      {formatPrice(
                                        product.mrp,
                                        product.currency,
                                      )}
                                    </div>
                                  )}
                              </div>

                              {product.rating !=
                                null && (
                                <div className="text-xs text-amber-300">
                                  ⭐{" "}
                                  {product.rating}
                                </div>
                              )}
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {product.source && (
                                <span className="rounded-full border border-white/10 px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider text-zinc-500">
                                  {product.source}
                                </span>
                              )}

                              {product.available && (
                                <span className="rounded-full border border-emerald-400/15 bg-emerald-400/5 px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider text-emerald-300">
                                  Available
                                </span>
                              )}
                            </div>

                            {ranking && (
                              <div className="mt-5">
                                <div className="flex items-center justify-between text-[9px]">
                                  <span className="text-zinc-700">
                                    BUYER MATCH
                                  </span>

                                  <span className="font-bold text-cyan-300">
                                    {ranking.score}/100
                                  </span>
                                </div>

                                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                                  <motion.div
                                    initial={{
                                      width: 0,
                                    }}
                                    animate={{
                                      width: `${Math.min(
                                        100,
                                        Math.max(
                                          0,
                                          ranking.score,
                                        ),
                                      )}%`,
                                    }}
                                    transition={{
                                      duration: 0.7,
                                      delay:
                                        index *
                                        0.04,
                                    }}
                                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-400"
                                  />
                                </div>
                              </div>
                            )}

                            {/* ACTIONS */}

                            <div className="mt-auto flex gap-2 pt-5">
                              <button
                                type="button"
                                onClick={() =>
                                  handleAddToCart(
                                    product,
                                  )
                                }
                                className={`flex-1 rounded-xl px-3 py-3 text-xs font-black transition ${
                                  isAdded
                                    ? "bg-emerald-300 text-black"
                                    : "bg-cyan-300 text-black hover:bg-cyan-200"
                                }`}
                              >
                                {isAdded
                                  ? "✓ Added"
                                  : "🛒 Add"}
                              </button>

                              <a
                                href={product.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-1 items-center justify-center rounded-xl border border-white/10 px-3 py-3 text-xs font-bold text-white transition hover:bg-white/5"
                              >
                                View →
                              </a>
                            </div>
                          </div>
                        </TiltCard>
                      </ProximityGlow>
                    </motion.div>
                  );
                },
              )}
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          FOOTER
      ====================================================== */}

      <footer className="border-t border-white/[0.06] bg-black/20">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            <div className="text-sm font-bold tracking-[0.18em]">
              MONEY AUTOPILOT
            </div>

            <div className="mt-2 text-xs text-zinc-700">
              Intelligence → Commerce → Control
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
              href="/dashboard"
              className="transition hover:text-white"
            >
              Observatory
            </Link>

            <Link
              href="/checkout"
              className="transition hover:text-white"
            >
              Checkout
            </Link>

            <Link
              href="/cart"
              className="transition hover:text-white"
            >
              Cart
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}