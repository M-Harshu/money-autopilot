import { NextResponse } from "next/server";
import { z } from "zod";

import {
  addItem,
  addWebItem,
  removeItem,
} from "@/lib/commerce/cart";

const webProduct = z.object({
  id:
    z.string().min(1),

  name:
    z.string().min(1),

  brand:
    z.string().nullable().optional(),

  price:
    z.number().finite().positive(),

  mrp:
    z.number().finite().nullable().optional(),

  currency:
    z.string().nullable().optional(),

  image:
    z.string().nullable().optional(),

  rating:
    z.number().finite().nullable().optional(),

  ratingCount:
    z.number().finite().nullable().optional(),

  available:
    z.boolean().optional(),

  inventory:
    z.number().finite().nullable().optional(),

  quantity:
    z.string().nullable().optional(),

  seller:
    z.string().nullable().optional(),

  source:
    z.string().nullable().optional(),

  url:
    z.string().min(1),
});

const add = z.object({
  cartId:
    z.string().min(1),

  productId:
    z.string().min(1),

  quantity:
    z.number().int().positive(),

  webProduct:
    webProduct.optional(),
});

const del = z.object({
  cartId:
    z.string().min(1),

  productId:
    z.string().min(1),
});

export async function POST(
  req: Request,
) {
  try {
    const body =
      add.parse(
        await req.json(),
      );

    /*
     * Web product:
     *
     * Amazon / Flipkart / other external
     * product IDs do not necessarily exist
     * in our Prisma catalog.
     *
     * Convert them into a server-side
     * catalog product first.
     */
    if (body.webProduct) {
      const item =
        await addWebItem(
          body.cartId,
          body.webProduct,
          body.quantity,
        );

      return NextResponse.json(
        item,
      );
    }

    /*
     * Normal internal catalog product.
     */
    const item =
      await addItem(
        body.cartId,
        body.productId,
        body.quantity,
      );

    return NextResponse.json(
      item,
    );
  } catch (e) {
    console.error(
      "Add cart item error:",
      e,
    );

    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Invalid cart item",
      },
      {
        status: 400,
      },
    );
  }
}

export async function DELETE(
  req: Request,
) {
  try {
    const body =
      del.parse(
        await req.json(),
      );

    const item =
      await removeItem(
        body.cartId,
        body.productId,
      );

    return NextResponse.json(
      item,
    );
  } catch (e) {
    console.error(
      "Remove cart item error:",
      e,
    );

    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Invalid cart item",
      },
      {
        status: 400,
      },
    );
  }
}