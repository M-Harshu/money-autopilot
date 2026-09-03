import { NextResponse } from "next/server";
import { z } from "zod";

import { validateCart } from "@/lib/commerce/cart";
import { evaluateFinancialAction } from "@/lib/policies/engine";
import { prisma } from "@/lib/db/client";
import { razorpayProvider } from "@/lib/payments/razorpay";
import { audit } from "@/lib/audit/service";

const schema = z.object({
  cartId: z.string().min(1),
  confirmed: z.boolean(),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());

    /*
     * ============================================================
     * 1. SERVER-SIDE CART VALIDATION
     * ============================================================
     *
     * The browser never supplies the payment amount.
     *
     * The amount comes exclusively from the database-backed cart.
     */
    const { cart, total } =
      await validateCart(body.cartId);

    /*
     * ============================================================
     * 2. FINANCIAL POLICY
     * ============================================================
     */
    const policy =
      evaluateFinancialAction({
        amount: total,
        confirmed: body.confirmed,
      });

    await audit({
      merchantId: cart.merchantId,
      buyerProfileId:
        cart.buyerProfileId,
      eventType: policy.allowed
        ? "PAYMENT_APPROVED"
        : "POLICY_BLOCKED",
      actor: "policy_engine",
      policyResult: policy,
      result: policy.allowed
        ? "ALLOWED"
        : "BLOCKED",
    });

    if (!policy.allowed) {
      return NextResponse.json(
        {
          error: policy.reasons,
          policy,
        },
        {
          status: 403,
        },
      );
    }

    /*
     * ============================================================
     * 3. FIND AN EXISTING PENDING PAYMENT
     * ============================================================
     *
     * This protects against:
     *
     * - double clicking
     * - refreshing checkout
     * - opening checkout twice
     *
     * BUT we only reuse it when its amount exactly matches
     * the currently validated cart total.
     */
    const pendingOrder =
      await prisma.order.findFirst({
        where: {
          cartId: cart.id,

          status: {
            in: [
              "CREATED",
              "PENDING",
            ],
          },

          transaction: {
            is: {
              state: "PENDING",
            },
          },
        },

        include: {
          transaction: true,
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    if (
      pendingOrder?.transaction?.razorpayOrderId
    ) {
      const existingTransaction =
        pendingOrder.transaction;

      const existingAmount =
        Number(
          existingTransaction.amount,
        );

      /*
       * Never reuse a pending transaction if its
       * server amount differs from the current cart.
       */
      if (
        existingAmount === total
      ) {
        await audit({
          merchantId:
            cart.merchantId,

          buyerProfileId:
            cart.buyerProfileId,

          transactionId:
            existingTransaction.id,

          eventType:
            "PAYMENT_ORDER_REUSED",

          actor:
            "payment_service",

          metadata: {
            razorpayOrderId:
              existingTransaction.razorpayOrderId,

            amount: total,

            currency: "INR",

            reason:
              "Existing pending transaction matches validated cart total.",
          },
        });

        return NextResponse.json({
          transaction:
            existingTransaction,

          order: {
            id:
              existingTransaction.razorpayOrderId,

            amount:
              Math.round(
                total * 100,
              ),

            currency: "INR",
          },

          keyId:
            process.env
              .RAZORPAY_KEY_ID,
        });
      }

      /*
       * Amount mismatch.
       *
       * We deliberately DO NOT reuse the old transaction.
       * A new server-approved transaction will be created below.
       */
      await audit({
        merchantId:
          cart.merchantId,

        buyerProfileId:
          cart.buyerProfileId,

        transactionId:
          existingTransaction.id,

        eventType:
          "PAYMENT_ORDER_REJECTED",

        actor:
          "payment_service",

        metadata: {
          reason:
            "Pending transaction amount does not match current cart total.",

          existingAmount,

          currentCartTotal:
            total,
        },
      });

      /*
       * Mark the stale transaction as failed.
       *
       * This prevents it from being reused again.
       */
      await prisma.transaction.update({
        where: {
          id: existingTransaction.id,
        },

        data: {
          state: "FAILED",
          failureReason:
            "Cart total changed after payment order creation.",
        },
      });

      await prisma.order.update({
        where: {
          id: pendingOrder.id,
        },

        data: {
          status: "CANCELLED",
        },
      });
    }

    /*
     * ============================================================
     * 4. CREATE A NEW INTERNAL ORDER
     * ============================================================
     *
     * Every new payment attempt gets its own Order.
     */
    const order =
      await prisma.order.create({
        data: {
          cartId: cart.id,

          merchantId:
            cart.merchantId,

          buyerProfileId:
            cart.buyerProfileId,

          total,

          status: "CREATED",
        },
      });

    /*
     * ============================================================
     * 5. CREATE TRANSACTION
     * ============================================================
     */
    const tx =
      await prisma.transaction.create({
        data: {
          orderId: order.id,

          merchantId:
            cart.merchantId,

          buyerProfileId:
            cart.buyerProfileId,

          amount: total,

          currency: "INR",

          state: "CREATED",

          attemptCount: 0,
        },
      });

    /*
     * ============================================================
     * 6. CREATE RAZORPAY ORDER
     * ============================================================
     *
     * IMPORTANT:
     *
     * Razorpay receives ONLY the server-calculated total.
     *
     * Browser price is never trusted here.
     */
    const razorpayOrder =
      await razorpayProvider.createOrder(
        Math.round(
          total * 100,
        ),
        `ma_${tx.id}`,
      );

    /*
     * ============================================================
     * 7. SAVE RAZORPAY ORDER
     * ============================================================
     */
    const saved =
      await prisma.transaction.update({
        where: {
          id: tx.id,
        },

        data: {
          state: "PENDING",

          razorpayOrderId:
            razorpayOrder.id,

          attemptCount: {
            increment: 1,
          },
        },
      });

    /*
     * ============================================================
     * 8. MARK INTERNAL ORDER PENDING
     * ============================================================
     */
    await prisma.order.update({
      where: {
        id: order.id,
      },

      data: {
        status: "PENDING",
      },
    });

    /*
     * ============================================================
     * 9. AUDIT
     * ============================================================
     */
    await audit({
      merchantId:
        cart.merchantId,

      buyerProfileId:
        cart.buyerProfileId,

      transactionId:
        tx.id,

      eventType:
        "PAYMENT_ORDER_CREATED",

      actor:
        "razorpay_adapter",

      metadata: {
        order_id:
          razorpayOrder.id,

        amount: total,

        currency: "INR",
      },
    });

    /*
     * ============================================================
     * 10. RETURN SERVER-APPROVED PAYMENT
     * ============================================================
     */
    return NextResponse.json({
      transaction: saved,

      order:
        razorpayOrder,

      keyId:
        process.env
          .RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error(
      "Payment creation error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Payment creation failed",
      },
      {
        status: 400,
      },
    );
  }
}