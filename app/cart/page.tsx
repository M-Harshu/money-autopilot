"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import CursorTrail from "@/components/effects/CursorTrail";
import InteractiveBackground from "@/components/effects/InteractiveBackground";
import ProximityGlow from "@/components/effects/ProximityGlow";
import TiltCard from "@/components/effects/TiltCard";

import {
  type CartItem,
  getCart,
  removeFromCart,
  updateCartQuantity,
  clearCart,
} from "@/lib/cart";

/* =========================================================
   SERVER API TYPES
========================================================= */

type ServerCartResponse = {
  cart: {
    id: string;
    items?: unknown[];
  };
  total: number;
};

type ApiError = {
  error?: string;
};

type PaymentCreateResponse = {
  transaction?: {
    id: string;
  };
  order?: {
    id: string;
  };
  error?: string | string[];
};

/* =========================================================
   CART PAGE
========================================================= */

export default function CartPage() {
  const [cart, setCart] =
    useState<CartItem[]>([]);

  const [mounted, setMounted] =
    useState(false);

  const [checkoutLoading, setCheckoutLoading] =
    useState(false);

  const [checkoutMessage, setCheckoutMessage] =
    useState("");

  const [checkoutError, setCheckoutError] =
    useState("");

  /* =======================================================
     LOAD LOCAL CART
  ======================================================= */

  useEffect(() => {
    const loadCart = () => {
      setCart(getCart());
    };

    loadCart();
    setMounted(true);

    const handleCartUpdate = () => {
      loadCart();
    };

    window.addEventListener(
      "cart-updated",
      handleCartUpdate,
    );

    window.addEventListener(
      "storage",
      handleCartUpdate,
    );

    return () => {
      window.removeEventListener(
        "cart-updated",
        handleCartUpdate,
      );

      window.removeEventListener(
        "storage",
        handleCartUpdate,
      );
    };
  }, []);

  /* =======================================================
     CART TOTALS
  ======================================================= */

  const itemCount = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total + item.cartQuantity,
      0,
    );
  }, [cart]);

  const subtotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total +
        item.price *
          item.cartQuantity,
      0,
    );
  }, [cart]);

  /* =======================================================
     PRICE FORMAT
  ======================================================= */

  function formatPrice(
    price: number,
    currency = "INR",
  ) {
    if (currency === "INR") {
      return `₹${price.toLocaleString(
        "en-IN",
      )}`;
    }

    return `${currency} ${price.toLocaleString(
      "en-US",
    )}`;
  }

  /* =======================================================
     QUANTITY
  ======================================================= */

  function increaseQuantity(
    item: CartItem,
  ) {
    const updated =
      updateCartQuantity(
        item.id,
        item.cartQuantity + 1,
      );

    setCart(updated);
  }

  function decreaseQuantity(
    item: CartItem,
  ) {
    const updated =
      updateCartQuantity(
        item.id,
        item.cartQuantity - 1,
      );

    setCart(updated);
  }

  /* =======================================================
     REMOVE ITEM
  ======================================================= */

  function removeItem(
    item: CartItem,
  ) {
    const updated =
      removeFromCart(item.id);

    setCart(updated);
  }

  /* =======================================================
     CLEAR CART
  ======================================================= */

  function handleClearCart() {
    const updated =
      clearCart();

    setCart(updated);
  }

  /* =======================================================
     PRIMARY MERCHANT
  ======================================================= */

  const primaryMerchantItem =
    cart.length > 0
      ? cart[0]
      : null;

  const primaryMerchantName =
    primaryMerchantItem?.source ||
    primaryMerchantItem?.seller ||
    "merchant";

  /* =======================================================
     SECURE CHECKOUT
  ======================================================= */

  async function openSecureCheckout() {
    if (cart.length === 0) {
      setCheckoutError(
        "Your cart is empty.",
      );

      return;
    }

    if (checkoutLoading) {
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError("");

    setCheckoutMessage(
      "Creating secure server cart...",
    );

    try {
      /* =================================================
         STEP 1
         CREATE SERVER CART
      ================================================= */

      const cartResponse =
        await fetch(
          "/api/cart",
          {
            method: "POST",

            headers: {
              "content-type":
                "application/json",
            },

            body: JSON.stringify({
              merchantId:
                "demo-merchant",

              buyerExternalId:
                "demo-buyer",
            }),
          },
        );

      const cartJson =
        (await cartResponse.json()) as
          ServerCartResponse &
            ApiError;

      if (
        !cartResponse.ok ||
        !cartJson.cart?.id
      ) {
        throw new Error(
          typeof cartJson.error ===
            "string"
            ? cartJson.error
            : "Could not create server cart.",
        );
      }

      const serverCartId =
        cartJson.cart.id;

      /* =================================================
         STEP 2
         ADD LOCAL/WEB PRODUCTS TO SERVER CART
      ================================================= */

      setCheckoutMessage(
        "Validating products and inventory...",
      );

      for (const item of cart) {
        /*
         * The browser cart may contain either:
         *
         * 1. A local Prisma Product ID
         *
         * OR
         *
         * 2. An Amazon / Flipkart WebProduct ID.
         *
         * The API now handles both cases.
         */

        const itemResponse =
          await fetch(
            "/api/cart/items",
            {
              method: "POST",

              headers: {
                "content-type":
                  "application/json",
              },

              body: JSON.stringify({
                cartId:
                  serverCartId,

                productId:
                  item.id,

                quantity:
                  item.cartQuantity,

                /*
                 * If this is an external web
                 * product, the server will create
                 * a local catalog representation.
                 */
                webProduct: {
                  id: item.id,

                  name:
                    item.name,

                  brand:
                    item.brand ??
                    null,

                  price:
                    item.price,

                  mrp:
                    item.mrp ??
                    null,

                  currency:
                    item.currency ??
                    "INR",

                  image:
                    item.image ??
                    null,

                  rating:
                    item.rating ??
                    null,

                  ratingCount:
                    item.ratingCount ??
                    null,

                  available:
                    item.available ??
                    true,

                  inventory:
                    item.inventory ??
                    1,

                  quantity:
                    item.quantity ??
                    null,

                  seller:
                    item.seller ??
                    null,

                  source:
                    item.source ??
                    "web",

                  url:
                    item.url,
                },
              }),
            },
          );

        const itemJson =
          (await itemResponse.json()) as
            ApiError;

        if (
          !itemResponse.ok
        ) {
          throw new Error(
            typeof itemJson.error ===
              "string"
              ? itemJson.error
              : `Could not add "${item.name}" to the server cart.`,
          );
        }
      }

      /* =================================================
         STEP 3
         REFRESH SERVER CART
      ================================================= */

      setCheckoutMessage(
        "Recalculating the server-approved total...",
      );

      const refreshedResponse =
        await fetch(
          `/api/cart?cartId=${encodeURIComponent(
            serverCartId,
          )}`,
        );

      const refreshedJson =
        (await refreshedResponse.json()) as
          ServerCartResponse &
            ApiError;

      if (
        !refreshedResponse.ok ||
        !refreshedJson.cart?.id
      ) {
        throw new Error(
          typeof refreshedJson.error ===
            "string"
            ? refreshedJson.error
            : "Could not validate the server cart.",
        );
      }

      /* =================================================
         STEP 4
         POLICY + PAYMENT ORDER
      ================================================= */

      setCheckoutMessage(
        "Running financial policy checks...",
      );

      const paymentResponse =
        await fetch(
          "/api/payment/create",
          {
            method: "POST",

            headers: {
              "content-type":
                "application/json",
            },

            body: JSON.stringify({
              cartId:
                serverCartId,

              confirmed: true,
            }),
          },
        );

      const paymentJson =
        (await paymentResponse.json()) as
          PaymentCreateResponse;

      if (
        !paymentResponse.ok ||
        !paymentJson.transaction?.id
      ) {
        let errorMessage =
          "Payment creation failed.";

        if (
          Array.isArray(
            paymentJson.error,
          )
        ) {
          errorMessage =
            paymentJson.error.join(
              ", ",
            );
        } else if (
          typeof paymentJson.error ===
          "string"
        ) {
          errorMessage =
            paymentJson.error;
        }

        throw new Error(
          errorMessage,
        );
      }

      /* =================================================
         STEP 5
         OPEN CHECKOUT
      ================================================= */

      setCheckoutMessage(
        "Policy approved. Opening secure payment...",
      );

      window.location.href =
        `/checkout?transactionId=${encodeURIComponent(
          paymentJson.transaction.id,
        )}`;
    } catch (error) {
      console.error(
        "Secure checkout error:",
        error,
      );

      setCheckoutError(
        error instanceof Error
          ? error.message
          : "Secure checkout failed.",
      );

      setCheckoutMessage("");
    } finally {
      setCheckoutLoading(false);
    }
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050507] text-white">
      <CursorTrail />

      <InteractiveBackground />

      {/* =====================================================
          NAVBAR
      ====================================================== */}

      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#050507]/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-3"
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

            <Link
              href="/shop"
              className="text-sm text-zinc-500 transition hover:text-white"
            >
              AI Shop
            </Link>

            <Link
              href="/dashboard"
              className="text-sm text-zinc-500 transition hover:text-white"
            >
              Observatory
            </Link>

            <span className="text-sm font-semibold text-cyan-300">
              Cart
            </span>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-[10px] font-bold tracking-wider text-emerald-300 sm:flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />

              SYSTEM ONLINE
            </div>

            <Link
              href="/cart"
              className="rounded-xl border border-cyan-300/20 bg-cyan-300/5 px-4 py-2 text-xs font-bold text-cyan-300 transition hover:bg-cyan-300 hover:text-black"
            >
              🛒 {itemCount}
            </Link>
          </div>
        </div>
      </header>

      {/* =====================================================
          HERO
      ====================================================== */}

      <section className="relative mx-auto max-w-7xl px-6 pb-12 pt-16 lg:px-8 lg:pt-24">
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
          <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-300/5 px-4 py-2 text-[10px] font-bold tracking-[0.25em] text-fuchsia-300">
            <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-300" />

            AUTONOMOUS CART
          </div>

          <h1 className="mt-7 text-5xl font-black tracking-[-0.05em] sm:text-6xl lg:text-7xl">
            Your
            <br />

            <span className="bg-gradient-to-r from-cyan-300 via-white to-fuchsia-400 bg-clip-text text-transparent">
              selected products.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-500">
            Products selected from the AI commerce
            engine. Review your choices before
            continuing.
          </p>
        </motion.div>
      </section>

      {/* =====================================================
          CART
      ====================================================== */}

      <section className="relative mx-auto max-w-7xl px-6 pb-28 lg:px-8">
        {!mounted ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-16 text-center text-zinc-500">
            Loading cart...
          </div>
        ) : cart.length === 0 ? (
          <ProximityGlow
            radius={280}
            className="rounded-[2rem]"
          >
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-12 text-center sm:p-20">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl border border-cyan-300/20 bg-cyan-300/5 text-4xl">
                🛒
              </div>

              <h2 className="mt-7 text-3xl font-black">
                Your cart is empty.
              </h2>

              <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-zinc-600">
                Go back to AI Shop and let the
                commerce agents find something
                for you.
              </p>

              <Link
                href="/shop"
                className="mt-8 inline-flex rounded-2xl bg-cyan-300 px-7 py-4 text-sm font-black text-black transition hover:bg-cyan-200"
              >
                Find products →
              </Link>
            </div>
          </ProximityGlow>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <div>
              <div className="mb-5 flex items-end justify-between">
                <div>
                  <div className="text-[10px] font-bold tracking-[0.25em] text-cyan-300">
                    PRODUCT SELECTION
                  </div>

                  <h2 className="mt-2 text-2xl font-black">
                    {itemCount}{" "}
                    {itemCount === 1
                      ? "item"
                      : "items"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={
                    handleClearCart
                  }
                  className="text-xs font-bold text-zinc-600 transition hover:text-red-300"
                >
                  Clear cart
                </button>
              </div>

              <div className="space-y-4">
                {cart.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{
                      opacity: 0,
                      y: 15,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                  >
                    <ProximityGlow
                      radius={230}
                      className="rounded-3xl"
                    >
                      <TiltCard className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                        <div className="flex flex-col gap-5 sm:flex-row">
                          <div className="h-44 w-full shrink-0 overflow-hidden rounded-2xl bg-white sm:w-44">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="h-full w-full object-contain p-4"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-3xl text-zinc-400">
                                ◇
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                {item.brand && (
                                  <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600">
                                    {item.brand}
                                  </div>
                                )}

                                <h3 className="mt-2 text-base font-black leading-6">
                                  {item.name}
                                </h3>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  removeItem(
                                    item,
                                  )
                                }
                                className="shrink-0 text-xs text-zinc-700 transition hover:text-red-300"
                                aria-label={`Remove ${item.name}`}
                              >
                                ✕
                              </button>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              {item.source && (
                                <span className="rounded-full border border-white/10 px-3 py-1 text-[8px] font-bold uppercase tracking-wider text-zinc-500">
                                  {item.source}
                                </span>
                              )}

                              {item.rating !=
                                null && (
                                <span className="rounded-full border border-amber-300/10 bg-amber-300/5 px-3 py-1 text-[9px] text-amber-300">
                                  ⭐{" "}
                                  {
                                    item.rating
                                  }
                                </span>
                              )}

                              {item.available && (
                                <span className="rounded-full border border-emerald-400/15 bg-emerald-400/5 px-3 py-1 text-[8px] font-bold uppercase tracking-wider text-emerald-300">
                                  Available
                                </span>
                              )}
                            </div>

                            <div className="mt-6 flex flex-wrap items-end justify-between gap-5">
                              <div>
                                <div className="text-2xl font-black text-cyan-300">
                                  {formatPrice(
                                    item.price,
                                    item.currency,
                                  )}
                                </div>

                                {item.mrp !=
                                  null &&
                                  item.mrp >
                                    item.price && (
                                    <div className="text-[10px] text-zinc-700 line-through">
                                      {formatPrice(
                                        item.mrp,
                                        item.currency,
                                      )}
                                    </div>
                                  )}
                              </div>

                              <div>
                                <div className="mb-2 text-[8px] font-bold uppercase tracking-[0.2em] text-zinc-700">
                                  Quantity
                                </div>

                                <div className="flex overflow-hidden rounded-xl border border-white/10 bg-black/30">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      decreaseQuantity(
                                        item,
                                      )
                                    }
                                    className="h-10 w-10 text-zinc-400 transition hover:bg-white/5 hover:text-white"
                                    aria-label="Decrease quantity"
                                  >
                                    −
                                  </button>

                                  <div className="flex h-10 min-w-12 items-center justify-center border-x border-white/10 text-sm font-bold">
                                    {
                                      item.cartQuantity
                                    }
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      increaseQuantity(
                                        item,
                                      )
                                    }
                                    className="h-10 w-10 text-zinc-400 transition hover:bg-white/5 hover:text-white"
                                    aria-label="Increase quantity"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="mt-5 border-t border-white/[0.06] pt-4">
                              <a
                                href={
                                  item.url
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-[10px] font-bold text-cyan-300 transition hover:text-white"
                              >
                                View on actual merchant
                                <span>
                                  →
                                </span>
                              </a>
                            </div>
                          </div>
                        </div>
                      </TiltCard>
                    </ProximityGlow>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* =================================================
                SUMMARY
            ================================================== */}

            <aside className="lg:sticky lg:top-28 lg:self-start">
              <ProximityGlow
                radius={260}
                className="rounded-[2rem]"
              >
                <TiltCard className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-7">
                  <div className="text-[10px] font-bold tracking-[0.25em] text-fuchsia-300">
                    CART INTELLIGENCE
                  </div>

                  <h2 className="mt-2 text-2xl font-black">
                    Order summary
                  </h2>

                  <div className="mt-8 space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500">
                        Products
                      </span>

                      <span>
                        {itemCount}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500">
                        Subtotal
                      </span>

                      <span className="font-bold">
                        {formatPrice(
                          subtotal,
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500">
                        Delivery
                      </span>

                      <span className="text-right text-emerald-300">
                        Calculated by merchant
                      </span>
                    </div>

                    <div className="h-px bg-white/10" />

                    <div className="flex items-end justify-between">
                      <span className="text-sm text-zinc-500">
                        Cart value
                      </span>

                      <span className="text-3xl font-black">
                        {formatPrice(
                          subtotal,
                        )}
                      </span>
                    </div>
                  </div>

                  {/* =================================================
                      MONEY AUTOPILOT CHECKOUT
                  ================================================== */}

                  <div className="mt-7">
                    <div className="mb-3 text-[9px] font-bold tracking-[0.2em] text-emerald-300">
                      MONEY AUTOPILOT CHECKOUT
                    </div>

                    <button
                      type="button"
                      onClick={
                        openSecureCheckout
                      }
                      disabled={
                        checkoutLoading
                      }
                      className="relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-emerald-300 px-5 py-4 text-xs font-black text-black shadow-lg shadow-emerald-500/10 transition hover:-translate-y-0.5 hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      <span className="relative flex items-center justify-center gap-2">
                        {checkoutLoading ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />

                            Creating secure checkout...
                          </>
                        ) : (
                          <>
                            🔐 Secure with Money Autopilot

                            <span>
                              →
                            </span>
                          </>
                        )}
                      </span>
                    </button>

                    {checkoutMessage && (
                      <div className="mt-3 rounded-xl border border-cyan-300/10 bg-cyan-300/[0.03] p-3 text-[10px] leading-5 text-cyan-300">
                        {
                          checkoutMessage
                        }
                      </div>
                    )}

                    {checkoutError && (
                      <div className="mt-3 rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-[10px] leading-5 text-red-300">
                        {
                          checkoutError
                        }
                      </div>
                    )}
                  </div>

                  {/* =================================================
                      ACTUAL MERCHANT
                  ================================================== */}

                  {primaryMerchantItem?.url && (
                    <div className="mt-5 border-t border-white/[0.06] pt-5">
                      <div className="mb-3 text-[9px] font-bold tracking-[0.2em] text-cyan-300">
                        ACTUAL MERCHANT
                      </div>

                      <a
                        href={
                          primaryMerchantItem.url
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center rounded-xl border border-white/10 px-5 py-4 text-xs font-bold text-zinc-300 transition hover:bg-white/5 hover:text-white"
                      >
                        Buy from{" "}
                        {
                          primaryMerchantName
                        }{" "}
                        →
                      </a>
                    </div>
                  )}

                  {/* =================================================
                      EXPLANATION
                  ================================================== */}

                  <div className="mt-4 rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.03] p-4">
                    <div className="text-[9px] font-bold tracking-[0.2em] text-cyan-300">
                      HOW MONEY AUTOPILOT WORKS
                    </div>

                    <p className="mt-2 text-[10px] leading-5 text-zinc-600">
                      The server validates your
                      cart, checks financial policy,
                      creates the approved payment
                      order, and only then opens
                      Razorpay.
                    </p>
                  </div>

                  {/* =================================================
                      FLOW
                  ================================================== */}

                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="space-y-2 text-[9px] font-bold tracking-wider text-zinc-600">
                      <div className="flex justify-between">
                        <span>
                          01 CART
                        </span>

                        <span className="text-emerald-300">
                          READY
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span>
                          02 POLICY
                        </span>

                        <span className="text-zinc-600">
                          SERVER
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span>
                          03 RAZORPAY
                        </span>

                        <span className="text-zinc-600">
                          TEST MODE
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span>
                          04 VERIFY
                        </span>

                        <span className="text-zinc-600">
                          SERVER
                        </span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/shop"
                    className="mt-4 flex w-full items-center justify-center rounded-xl border border-white/10 px-5 py-4 text-xs font-bold text-zinc-400 transition hover:bg-white/5 hover:text-white"
                  >
                    ← Continue shopping
                  </Link>
                </TiltCard>
              </ProximityGlow>
            </aside>
          </div>
        )}
      </section>

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

          <div className="flex flex-wrap gap-6 text-xs text-zinc-600">
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
          </div>
        </div>
      </footer>
    </main>
  );
}