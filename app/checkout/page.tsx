"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

import CursorTrail from "@/components/effects/CursorTrail";

type RazorpayPaymentResponse = {
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  handler: (
    response: RazorpayPaymentResponse,
  ) => void;
  modal?: {
    ondismiss?: () => void;
  };
};

type RazorpayInstance = {
  open: () => void;
};

type RazorpayConstructor = new (
  options: RazorpayOptions,
) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay: RazorpayConstructor;
  }
}

type Transaction = {
  id: string;
  amount: string | number;
  currency?: string;
  state?: string;
  razorpayOrderId?: string | null;
};

type PaymentConfig = {
  keyId: string;
};

type ApiErrorResponse = {
  error?: string;
};

/* =========================================================
   CHECKOUT
========================================================= */

export default function Checkout() {
  const [status, setStatus] = useState(
    "Waiting for a server-approved transaction.",
  );

  const [tx, setTx] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [verified, setVerified] =
    useState(false);

  const [amount, setAmount] =
    useState<number | null>(null);

  const [currency, setCurrency] =
    useState("INR");

  const [mouse, setMouse] = useState({
    x: 50,
    y: 50,
  });

  /* -------------------------------------------------------
     GET TRANSACTION ID
  ------------------------------------------------------- */

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search,
      );

    setTx(
      params.get("transactionId") ?? "",
    );
  }, []);

  /* -------------------------------------------------------
     PROXIMITY BACKGROUND
  ------------------------------------------------------- */

  useEffect(() => {
    function handleMouseMove(
      event: MouseEvent,
    ) {
      setMouse({
        x:
          (event.clientX /
            window.innerWidth) *
          100,

        y:
          (event.clientY /
            window.innerHeight) *
          100,
      });
    }

    window.addEventListener(
      "mousemove",
      handleMouseMove,
      { passive: true },
    );

    return () => {
      window.removeEventListener(
        "mousemove",
        handleMouseMove,
      );
    };
  }, []);

  /* -------------------------------------------------------
     VERIFY PAYMENT
  ------------------------------------------------------- */

  async function verify(
    response: RazorpayPaymentResponse,
  ) {
    setStatus(
      "Verifying payment securely...",
    );

    setLoading(true);

    try {
      const res = await fetch(
        "/api/payment/verify",
        {
          method: "POST",

          headers: {
            "content-type":
              "application/json",
          },

          body: JSON.stringify({
            transactionId: tx,

            razorpayPaymentId:
              response.razorpay_payment_id,

            razorpaySignature:
              response.razorpay_signature,
          }),
        },
      );

      const json: ApiErrorResponse =
        await res.json();

      if (!res.ok) {
        setStatus(
          "Verification failed: " +
            (json.error ??
              "Unknown error"),
        );

        return;
      }

      setVerified(true);

      setStatus(
        "Payment verified successfully.",
      );
    } catch {
      setStatus(
        "Unable to verify the payment. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  /* -------------------------------------------------------
     OPEN RAZORPAY
  ------------------------------------------------------- */

  async function openCheckout() {
    if (!tx) {
      setStatus(
        "Missing transaction ID.",
      );

      return;
    }

    if (loading || verified) {
      return;
    }

    setLoading(true);

    setStatus(
      "Loading server-approved transaction...",
    );

    try {
      /* -----------------------------------------------
         LOAD TRANSACTION
      ------------------------------------------------ */

      const response =
        await fetch(
          "/api/transactions",
        );

      if (!response.ok) {
        throw new Error(
          "Unable to load transaction.",
        );
      }

      const transactions:
        Transaction[] =
        await response.json();

      const transaction =
        transactions.find(
          (item) =>
            item.id === tx,
        );

      if (!transaction) {
        setStatus(
          "Transaction not found.",
        );

        return;
      }

      /* -----------------------------------------------
         ALREADY PAID
      ------------------------------------------------ */

      if (
        transaction.state ===
        "SUCCESS"
      ) {
        setVerified(true);

        setAmount(
          Number(transaction.amount),
        );

        setCurrency(
          transaction.currency ??
            "INR",
        );

        setStatus(
          "This payment has already been completed.",
        );

        return;
      }

      /* -----------------------------------------------
         RAZORPAY ORDER
      ------------------------------------------------ */

      if (
        !transaction.razorpayOrderId
      ) {
        setStatus(
          "No pending Razorpay order found for this transaction.",
        );

        return;
      }

      /* -----------------------------------------------
         PAYMENT CONFIG
      ------------------------------------------------ */

      const configResponse =
        await fetch(
          "/api/payment/config",
        );

      if (!configResponse.ok) {
        throw new Error(
          "Unable to load payment configuration.",
        );
      }

      const config: PaymentConfig =
        await configResponse.json();

      if (!config.keyId) {
        throw new Error(
          "Razorpay public key is not configured.",
        );
      }

      /* -----------------------------------------------
         LOAD RAZORPAY
      ------------------------------------------------ */

      await loadRazorpayScript();

      /* -----------------------------------------------
         VALIDATE AMOUNT
      ------------------------------------------------ */

      const transactionAmount =
        Number(
          transaction.amount,
        );

      const transactionCurrency =
        transaction.currency ??
        "INR";

      if (
        !Number.isFinite(
          transactionAmount,
        ) ||
        transactionAmount <= 0
      ) {
        throw new Error(
          "Invalid transaction amount.",
        );
      }

      setAmount(
        transactionAmount,
      );

      setCurrency(
        transactionCurrency,
      );

      /* -----------------------------------------------
         CREATE CHECKOUT
      ------------------------------------------------ */

      const razorpay =
        new window.Razorpay({
          key: config.keyId,

          amount: Math.round(
            transactionAmount *
              100,
          ),

          currency:
            transactionCurrency,

          order_id:
            transaction.razorpayOrderId,

          name:
            "Money Autopilot",

          description:
            "Secure commerce checkout",

          handler: verify,

          modal: {
            ondismiss: () => {
              setLoading(false);

              setStatus(
                "Checkout closed. Your transaction remains pending.",
              );
            },
          },
        });

      setLoading(false);

      setStatus(
        "Opening secure payment checkout...",
      );

      razorpay.open();
    } catch (error) {
      setLoading(false);

      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to open checkout.",
      );
    }
  }

  /* -------------------------------------------------------
     DISPLAY AMOUNT
  ------------------------------------------------------- */

  const formattedAmount =
    amount !== null
      ? amount.toLocaleString(
          "en-IN",
          {
            maximumFractionDigits: 2,
          },
        )
      : "—";

  /* =======================================================
     UI
  ======================================================= */

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#030407] text-white"
      style={
        {
          "--mouse-x": `${mouse.x}%`,
          "--mouse-y": `${mouse.y}%`,
        } as React.CSSProperties
      }
    >
      {/* =================================================
          GLOBAL PARTICLE CURSOR
          SAME EFFECT AS SHOP
      ================================================= */}

      <CursorTrail />

      {/* =================================================
          BACKGROUND
      ================================================= */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Mouse proximity light */}

        <div
          className="absolute h-[35rem] w-[35rem] rounded-full bg-cyan-400/10 blur-[140px] transition-all duration-700"
          style={{
            left:
              "calc(var(--mouse-x) - 18rem)",

            top:
              "calc(var(--mouse-y) - 18rem)",
          }}
        />

        {/* Pink ambient orb */}

        <div className="absolute right-[-12rem] top-[-12rem] h-[30rem] w-[30rem] animate-pulse rounded-full bg-fuchsia-500/10 blur-[130px]" />

        {/* Blue ambient orb */}

        <div className="absolute bottom-[-15rem] left-[-10rem] h-[30rem] w-[30rem] rounded-full bg-blue-500/10 blur-[130px]" />

        {/* Grid */}

        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)",

            backgroundSize:
              "60px 60px",

            maskImage:
              "radial-gradient(circle at center, black, transparent 75%)",

            WebkitMaskImage:
              "radial-gradient(circle at center, black, transparent 75%)",
          }}
        />
      </div>

      {/* =================================================
          NAVBAR
      ================================================= */}

      <header className="relative z-20 border-b border-white/[0.06] bg-black/30 backdrop-blur-2xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link
            href="/"
            className="group flex items-center gap-3"
          >
            <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-cyan-300/20 bg-white/[0.04]">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-300/30 to-fuchsia-500/30 blur-xl transition duration-500 group-hover:scale-150" />

              <span className="relative text-sm font-black">
                M
              </span>
            </div>

            <div>
              <div className="text-sm font-black tracking-[0.18em]">
                MONEY AUTOPILOT
              </div>

              <div className="text-[9px] tracking-[0.3em] text-zinc-600">
                SECURE COMMERCE
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/shop"
              className="hidden rounded-xl px-4 py-2 text-sm text-zinc-500 transition hover:bg-white/5 hover:text-white sm:block"
            >
              ← Back to Shop
            </Link>

            <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-[9px] font-bold tracking-[0.15em] text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />

              SECURE
            </div>
          </div>
        </div>
      </header>

      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <div className="relative z-10 mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-20">
        {/* HERO */}

        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/5 px-4 py-2 text-[9px] font-bold tracking-[0.25em] text-cyan-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />

            SERVER-APPROVED TRANSACTION
          </div>

          <h1 className="mt-7 text-5xl font-black tracking-[-0.05em] sm:text-7xl">
            Secure
            <br />

            <span className="bg-gradient-to-r from-cyan-300 via-white to-fuchsia-400 bg-clip-text text-transparent">
              payment.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-zinc-500 sm:text-base">
            Your transaction has been validated by
            Money Autopilot before being handed to
            the payment provider.
          </p>
        </div>

        {/* =================================================
            CHECKOUT GRID
        ================================================= */}

        <div className="mx-auto mt-12 grid max-w-5xl gap-5 lg:grid-cols-[1.15fr_.85fr]">
          {/* =================================================
              PAYMENT CARD
          ================================================= */}

          <section className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-[90px] transition duration-700 group-hover:bg-cyan-400/20" />

            <div className="relative">
              {/* Header */}

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-bold tracking-[0.25em] text-cyan-300">
                    PAYMENT TERMINAL
                  </div>

                  <h2 className="mt-2 text-xl font-black">
                    Ready to pay
                  </h2>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-xl">
                  🔐
                </div>
              </div>

              {/* =================================================
                  AMOUNT
              ================================================= */}

              <div className="relative mt-8 overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/30 p-7">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-300/[0.04] to-fuchsia-400/[0.04]" />

                <div className="relative">
                  <div className="text-[9px] font-bold tracking-[0.2em] text-zinc-600">
                    SERVER APPROVED AMOUNT
                  </div>

                  <div className="mt-4 flex items-end gap-3">
                    <span className="text-5xl font-black tracking-tight sm:text-6xl">
                      {currency === "INR"
                        ? "₹"
                        : ""}

                      {formattedAmount}
                    </span>

                    <span className="mb-2 rounded-full border border-white/10 px-3 py-1 text-[9px] font-bold tracking-wider text-zinc-500">
                      {currency}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-[10px] text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                    Amount locked by server
                  </div>
                </div>
              </div>

              {/* =================================================
                  TRANSACTION
              ================================================= */}

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold tracking-[0.2em] text-zinc-600">
                    TRANSACTION ID
                  </span>

                  <span
                    className={`text-[9px] font-bold ${
                      verified
                        ? "text-emerald-300"
                        : "text-amber-300"
                    }`}
                  >
                    {verified
                      ? "VERIFIED"
                      : "PENDING"}
                  </span>
                </div>

                <div className="mt-3 break-all font-mono text-xs text-zinc-400">
                  {tx ||
                    "Loading transaction..."}
                </div>
              </div>

              {/* =================================================
                  PAYMENT BUTTON
              ================================================= */}

              <button
                type="button"
                onClick={
                  openCheckout
                }
                disabled={
                  !tx ||
                  loading ||
                  verified
                }
                className="group/button relative mt-6 w-full overflow-hidden rounded-2xl bg-cyan-300 px-6 py-5 font-black text-black shadow-[0_0_40px_rgba(103,232,249,.12)] transition duration-300 hover:-translate-y-0.5 hover:bg-cyan-200 hover:shadow-[0_0_60px_rgba(103,232,249,.25)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                <span className="absolute inset-0 -translate-x-full bg-white/30 transition-transform duration-700 group-hover/button:translate-x-full" />

                <span className="relative flex items-center justify-center gap-3">
                  {verified ? (
                    <>
                      <span className="text-lg">
                        ✓
                      </span>

                      Payment verified
                    </>
                  ) : loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />

                      Preparing secure checkout...
                    </>
                  ) : (
                    <>
                      Continue to secure payment

                      <span className="text-lg transition-transform group-hover/button:translate-x-1">
                        →
                      </span>
                    </>
                  )}
                </span>
              </button>

              {/* =================================================
                  STATUS
              ================================================= */}

              <div
                className={`mt-5 rounded-2xl border p-4 transition-all duration-500 ${
                  verified
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300 shadow-[0_0_40px_rgba(52,211,153,.08)]"
                    : "border-white/10 bg-white/[0.025] text-zinc-400"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5">
                    {verified
                      ? "✓"
                      : loading
                        ? "◌"
                        : "○"}
                  </span>

                  <div>
                    <div className="text-[9px] font-bold tracking-[0.2em]">
                      TRANSACTION STATUS
                    </div>

                    <div className="mt-1 text-sm">
                      {status}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              RIGHT SIDE
          ================================================= */}

          <aside className="space-y-5">
            {/* PAYMENT PROTECTION */}

            <section className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-6 backdrop-blur-xl sm:p-7">
              <div className="text-[9px] font-bold tracking-[0.25em] text-fuchsia-300">
                PAYMENT PROTECTION
              </div>

              <h2 className="mt-2 text-xl font-black">
                Guarded by design.
              </h2>

              <div className="mt-7 space-y-3">
                <SecurityItem
                  icon="01"
                  title="Server-controlled amount"
                  description="The browser never chooses the payment amount."
                  active
                />

                <SecurityItem
                  icon="02"
                  title="Policy validation"
                  description="Financial controls run before payment creation."
                  active
                />

                <SecurityItem
                  icon="03"
                  title="Razorpay order lock"
                  description="Payment uses the server-approved Razorpay order."
                  active
                />

                <SecurityItem
                  icon="04"
                  title="Signature verification"
                  description="The server verifies the payment before success."
                  active={
                    verified
                  }
                />
              </div>
            </section>

            {/* PAYMENT FLOW */}

            <section className="rounded-[2rem] border border-white/10 bg-white/[0.025] p-6 backdrop-blur-xl sm:p-7">
              <div className="text-[9px] font-bold tracking-[0.25em] text-cyan-300">
                PAYMENT FLOW
              </div>

              <div className="mt-6 space-y-4">
                <FlowStep
                  number="01"
                  label="TRANSACTION"
                  status="APPROVED"
                  done
                />

                <FlowStep
                  number="02"
                  label="RAZORPAY"
                  status={
                    verified
                      ? "COMPLETED"
                      : loading
                        ? "LOADING"
                        : "READY"
                  }
                  done={
                    verified
                  }
                  active={
                    loading ||
                    !verified
                  }
                />

                <FlowStep
                  number="03"
                  label="VERIFICATION"
                  status={
                    verified
                      ? "VERIFIED"
                      : "WAITING"
                  }
                  done={
                    verified
                  }
                />

                <FlowStep
                  number="04"
                  label="SETTLEMENT"
                  status={
                    verified
                      ? "CONTROLLED"
                      : "LOCKED"
                  }
                  done={
                    verified
                  }
                />
              </div>
            </section>
          </aside>
        </div>

        {/* =================================================
            TRUST STRIP
        ================================================= */}

        <div className="mx-auto mt-8 max-w-5xl">
          <div className="grid gap-3 sm:grid-cols-3">
            <TrustCard
              icon="◆"
              title="SERVER FIRST"
              text="Transaction authority stays on the server."
            />

            <TrustCard
              icon="◇"
              title="POLICY CONTROL"
              text="Financial rules run before payment."
            />

            <TrustCard
              icon="✦"
              title="VERIFIED"
              text="Success requires server verification."
            />
          </div>
        </div>
      </div>

      {/* =================================================
          FOOTER
      ================================================= */}

      <footer className="relative z-10 border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <div className="text-xs font-bold tracking-[0.2em]">
              MONEY AUTOPILOT
            </div>

            <div className="mt-1 text-[10px] text-zinc-700">
              Intelligence → Commerce → Control
            </div>
          </div>

          <div className="flex gap-5 text-xs text-zinc-600">
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
          </div>
        </div>
      </footer>
    </main>
  );
}

/* =========================================================
   SECURITY ITEM
========================================================= */

function SecurityItem({
  icon,
  title,
  description,
  active,
}: {
  icon: string;
  title: string;
  description: string;
  active: boolean;
}) {
  return (
    <div className="group rounded-2xl border border-white/10 bg-black/20 p-4 transition duration-300 hover:border-cyan-300/20 hover:bg-cyan-300/[0.03]">
      <div className="flex gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-[9px] font-bold ${
            active
              ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-300"
              : "border-white/10 bg-white/[0.03] text-zinc-600"
          }`}
        >
          {active
            ? "✓"
            : icon}
        </div>

        <div>
          <div className="text-xs font-bold">
            {title}
          </div>

          <p className="mt-1 text-[11px] leading-5 text-zinc-600">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   FLOW STEP
========================================================= */

function FlowStep({
  number,
  label,
  status,
  done,
  active,
}: {
  number: string;
  label: string;
  status: string;
  done?: boolean;
  active?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-[9px] font-bold ${
          done
            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
            : active
              ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-300"
              : "border-white/10 bg-white/[0.03] text-zinc-600"
        }`}
      >
        {done
          ? "✓"
          : number}
      </div>

      <div className="flex-1">
        <div className="text-[10px] font-bold tracking-wider">
          {label}
        </div>
      </div>

      <div
        className={`text-[8px] font-bold tracking-wider ${
          done
            ? "text-emerald-300"
            : active
              ? "text-cyan-300"
              : "text-zinc-700"
        }`}
      >
        {status}
      </div>
    </div>
  );
}

/* =========================================================
   TRUST CARD
========================================================= */

function TrustCard({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-cyan-300">
          {icon}
        </span>

        <span className="text-[9px] font-bold tracking-[0.18em] text-zinc-400">
          {title}
        </span>
      </div>

      <p className="mt-2 text-[10px] leading-5 text-zinc-700">
        {text}
      </p>
    </div>
  );
}

/* =========================================================
   RAZORPAY SCRIPT
========================================================= */

async function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) {
    return;
  }

  const existing =
    document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );

  if (existing) {
    await waitForRazorpay();
    return;
  }

  await new Promise<void>(
    (resolve, reject) => {
      const script =
        document.createElement(
          "script",
        );

      script.src =
        "https://checkout.razorpay.com/v1/checkout.js";

      script.async = true;

      script.onload =
        () => resolve();

      script.onerror =
        () =>
          reject(
            new Error(
              "Unable to load Razorpay Checkout.",
            ),
          );

      document.body.appendChild(
        script,
      );
    },
  );
}

/* =========================================================
   WAIT FOR RAZORPAY
========================================================= */

async function waitForRazorpay(): Promise<void> {
  for (
    let attempt = 0;
    attempt < 50;
    attempt += 1
  ) {
    if (window.Razorpay) {
      return;
    }

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          100,
        ),
    );
  }

  throw new Error(
    "Razorpay Checkout did not initialize.",
  );
}