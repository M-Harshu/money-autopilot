import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db/client";
import { razorpayProvider } from "@/lib/payments/razorpay";
import { assertTransition } from "@/lib/commerce/transaction";
import { audit } from "@/lib/audit/service";

const schema = z.object({
  transactionId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

type TransactionState =
  | "CREATED"
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "RECOVERING";

function isTransactionState(
  value: string,
): value is TransactionState {
  return [
    "CREATED",
    "PENDING",
    "SUCCESS",
    "FAILED",
    "RECOVERING",
  ].includes(value);
}

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());

    /*
     * Find the transaction.
     */
    const transaction =
      await prisma.transaction.findUnique({
        where: {
          id: body.transactionId,
        },
      });

    if (
      !transaction ||
      !transaction.razorpayOrderId
    ) {
      throw new Error(
        "Transaction/order not found.",
      );
    }

    /*
     * A transaction can only be verified while
     * it is waiting for payment.
     *
     * This also prevents the same transaction
     * from being processed twice.
     */
    if (transaction.state !== "PENDING") {
      throw new Error(
        "Transaction is not pending.",
      );
    }

    /*
     * Verify the Razorpay signature using the
     * Razorpay order ID stored on the server.
     *
     * The browser cannot choose the order ID.
     */
    const verified =
      razorpayProvider.verifyPayment(
        transaction.razorpayOrderId,
        body.razorpayPaymentId,
        body.razorpaySignature,
      );

    if (!verified) {
      throw new Error(
        "Payment signature verification failed.",
      );
    }

    /*
     * Make sure the current state is one of our
     * supported transaction states.
     */
    if (
      !isTransactionState(
        transaction.state,
      )
    ) {
      throw new Error(
        "Invalid transaction state.",
      );
    }

    /*
     * Make sure PENDING -> SUCCESS is a valid
     * state transition.
     */
    assertTransition(
      transaction.state,
      "SUCCESS",
    );

    /*
     * Everything below happens inside one
     * database transaction.
     *
     * If inventory/order/cart processing fails,
     * the database changes are rolled back.
     */
    const result =
      await prisma.$transaction(
        async (db) => {
          /*
           * Get the order and all cart items.
           */
          const order =
            await db.order.findUnique({
              where: {
                id: transaction.orderId,
              },
              include: {
                cart: {
                  include: {
                    items: {
                      include: {
                        product: {
                          include: {
                            inventory: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            });

          if (!order) {
            throw new Error(
              "Order not found.",
            );
          }

          if (!order.cart) {
            throw new Error(
              "Cart not found for order.",
            );
          }

          if (
            order.cart.items.length === 0
          ) {
            throw new Error(
              "Cannot complete payment for an empty cart.",
            );
          }

          /*
           * Prevent processing an already completed
           * order.
           */
          if (
            order.status === "COMPLETED"
          ) {
            throw new Error(
              "Order has already been completed.",
            );
          }

          /*
           * Decrease inventory for every product
           * purchased.
           *
           * The quantity condition prevents inventory
           * from becoming negative.
           */
          for (const item of order.cart.items) {
            const inventory =
              item.product.inventory;

            if (!inventory) {
              throw new Error(
                `Inventory not found for ${item.product.name}.`,
              );
            }

            if (
              inventory.quantity <
              item.quantity
            ) {
              throw new Error(
                `Insufficient inventory for ${item.product.name}.`,
              );
            }

            const inventoryUpdate =
              await db.inventory.updateMany({
                where: {
                  productId:
                    item.productId,

                  /*
                   * Make sure another checkout did
                   * not consume the stock first.
                   */
                  quantity: {
                    gte: item.quantity,
                  },
                },
                data: {
                  quantity: {
                    decrement:
                      item.quantity,
                  },
                },
              });

            if (
              inventoryUpdate.count !== 1
            ) {
              throw new Error(
                `Inventory changed while processing ${item.product.name}. Please contact support.`,
              );
            }
          }

          /*
           * Mark the transaction successful.
           */
          const updatedTransaction =
            await db.transaction.update({
              where: {
                id: transaction.id,
              },
              data: {
                state: "SUCCESS",
                razorpayPaymentId:
                  body.razorpayPaymentId,
                razorpaySignature:
                  body.razorpaySignature,
              },
            });

          /*
           * Mark the internal order completed.
           */
          await db.order.update({
            where: {
              id: order.id,
            },
            data: {
              status: "COMPLETED",
            },
          });

          /*
           * Close the cart.
           *
           * A completed cart cannot be reused for
           * another checkout.
           */
          await db.cart.update({
            where: {
              id: order.cartId,
            },
            data: {
              status: "COMPLETED",
            },
          });

          return {
            transaction:
              updatedTransaction,
            orderId: order.id,
          };
        },
      );

    /*
     * Record the successful payment after the
     * database transaction has completed.
     */
    await audit({
      merchantId:
        transaction.merchantId,

      buyerProfileId:
        transaction.buyerProfileId,

      transactionId:
        transaction.id,

      eventType:
        "PAYMENT_SUCCESS",

      actor:
        "payment_verifier",

      result:
        "SUCCESS",

      metadata: {
        razorpayOrderId:
          transaction.razorpayOrderId,

        razorpayPaymentId:
          body.razorpayPaymentId,

        amount:
          transaction.amount,

        currency:
          transaction.currency,
      },
    });

    /*
     * Return the final verified state.
     */
    return NextResponse.json({
      success: true,

      transaction:
        result.transaction,

      order: {
        id: result.orderId,
        status: "COMPLETED",
      },
    });
  } catch (error) {
    console.error(
      "Payment verification error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Verification failed",
      },
      {
        status: 400,
      },
    );
  }
}