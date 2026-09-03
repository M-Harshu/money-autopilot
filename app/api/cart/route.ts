import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getCart,
  calculateCartTotal,
  createCheckoutCart,
} from "@/lib/commerce/cart";

import { prisma } from "@/lib/db/client";

const create = z.object({
  merchantId: z.string().min(1),
  buyerExternalId: z.string().min(1),
});

const read = z.object({
  cartId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = create.parse(
      await req.json(),
    );

    const buyer =
      await prisma.buyerProfile.findUnique({
        where: {
          externalId:
            body.buyerExternalId,
        },
      });

    if (!buyer) {
      return NextResponse.json(
        {
          error:
            "Buyer profile not found.",
        },
        {
          status: 404,
        },
      );
    }

    const merchant =
      await prisma.merchant.findUnique({
        where: {
          id: body.merchantId,
        },
      });

    if (!merchant) {
      return NextResponse.json(
        {
          error:
            "Merchant not found.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * IMPORTANT:
     *
     * Checkout always receives a completely
     * fresh server cart.
     *
     * We intentionally do NOT use
     * getOrCreateCart() here because that
     * function can reuse an older OPEN cart.
     */
    const cart =
      await createCheckoutCart(
        merchant.id,
        buyer.id,
      );

    /*
     * A newly created checkout cart must
     * always be empty.
     */
    if (cart.items.length !== 0) {
      throw new Error(
        "Security check failed: new checkout cart is not empty.",
      );
    }

    return NextResponse.json({
      cart,
      total:
        calculateCartTotal(
          cart.items,
        ),
    });
  } catch (error) {
    console.error(
      "Create checkout cart error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create checkout cart.",
      },
      {
        status: 400,
      },
    );
  }
}

export async function GET(req: Request) {
  try {
    const cartId =
      read.parse({
        cartId:
          new URL(req.url).searchParams.get(
            "cartId",
          ),
      }).cartId;

    const cart =
      await getCart(cartId);

    if (!cart) {
      return NextResponse.json(
        {
          error: "Cart not found.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      cart,
      total:
        calculateCartTotal(
          cart.items,
        ),
    });
  } catch (error) {
    console.error(
      "Get cart error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Invalid cart.",
      },
      {
        status: 400,
      },
    );
  }
}