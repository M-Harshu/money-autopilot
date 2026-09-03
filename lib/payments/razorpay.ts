import Razorpay from "razorpay";
import crypto from "node:crypto";

import { env } from "@/lib/env/server";
import type {
  PaymentOrder,
  PaymentProvider,
} from "@/lib/payments/provider";

function client() {
  const configuration = env();

  return new Razorpay({
    key_id:
      configuration.RAZORPAY_KEY_ID,

    key_secret:
      configuration.RAZORPAY_KEY_SECRET,
  });
}

export const razorpayProvider: PaymentProvider = {
  async createOrder(
    amount: number,
    receipt: string,
  ): Promise<PaymentOrder> {
    if (
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      throw new Error(
        "Invalid payment amount.",
      );
    }

    const order =
      await client().orders.create({
        amount,
        currency: "INR",
        receipt,
      });

    return {
      id: order.id,
      amount: Number(order.amount),
      currency: order.currency,
      receipt:
        order.receipt ?? receipt,
    };
  },

  verifyPayment(
    orderId: string,
    paymentId: string,
    signature: string,
  ): boolean {
    const configuration = env();

    const expected =
      crypto
        .createHmac(
          "sha256",
          configuration.RAZORPAY_KEY_SECRET,
        )
        .update(
          `${orderId}|${paymentId}`,
        )
        .digest("hex");

    const expectedBuffer =
      Buffer.from(
        expected,
        "hex",
      );

    const signatureBuffer =
      Buffer.from(
        signature,
        "hex",
      );

    return (
      expectedBuffer.length ===
        signatureBuffer.length &&
      crypto.timingSafeEqual(
        expectedBuffer,
        signatureBuffer,
      )
    );
  },
};