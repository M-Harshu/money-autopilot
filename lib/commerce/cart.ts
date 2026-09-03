import { prisma } from "@/lib/db/client";
import { getAvailableInventory } from "@/lib/commerce/catalog";

export type WebProductInput = {
  id: string;
  name: string;
  brand?: string | null;
  price: number;
  mrp?: number | null;
  currency?: string | null;
  image?: string | null;
  rating?: number | null;
  ratingCount?: number | null;
  available?: boolean;
  inventory?: number | null;
  quantity?: string | null;
  seller?: string | null;
  source?: string | null;
  url: string;
};

export async function getOrCreateCart(
  merchantId: string,
  buyerProfileId: string,
) {
  const existingCart =
    await prisma.cart.findFirst({
      where: {
        merchantId,
        buyerProfileId,
        status: "OPEN",
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

  if (existingCart) {
    return existingCart;
  }

  return prisma.cart.create({
    data: {
      merchantId,
      buyerProfileId,
      status: "OPEN",
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });
}

/**
 * Creates a completely fresh server cart for a checkout.
 *
 * This is intentionally different from getOrCreateCart().
 * A checkout must never inherit items from an older
 * abandoned/pending cart.
 */
export async function createCheckoutCart(
  merchantId: string,
  buyerProfileId: string,
) {
  return prisma.cart.create({
    data: {
      merchantId,
      buyerProfileId,
      status: "OPEN",
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });
}

export async function addItem(
  cartId: string,
  productId: string,
  quantity: number,
) {
  if (quantity < 1) {
    throw new Error(
      "Quantity must be positive.",
    );
  }

  const cart = await prisma.cart.findUnique({
    where: {
      id: cartId,
    },
  });

  if (!cart) {
    throw new Error("Cart not found.");
  }

  if (cart.status !== "OPEN") {
    throw new Error(
      "This cart is no longer open.",
    );
  }

  const product =
    await prisma.product.findUnique({
      where: {
        id: productId,
      },
      include: {
        inventory: true,
      },
    });

  if (!product) {
    throw new Error("Product not found.");
  }

  const stock =
    await getAvailableInventory(
      productId,
    );

  if (stock < quantity) {
    throw new Error(
      `Insufficient inventory for ${product.name}.`,
    );
  }

  return prisma.cartItem.upsert({
    where: {
      cartId_productId: {
        cartId,
        productId,
      },
    },
    update: {
      quantity,
      unitPrice: product.price,
    },
    create: {
      cartId,
      productId,
      quantity,
      unitPrice: product.price,
    },
    include: {
      product: {
        include: {
          inventory: true,
        },
      },
    },
  });
}

/**
 * Adds an external Amazon/Flipkart/etc product to the
 * internal server catalog.
 *
 * The browser is never trusted for the final amount.
 * The server stores the product price and calculates
 * the cart total from the database.
 */
export async function addWebItem(
  cartId: string,
  webProduct: WebProductInput,
  quantity: number,
) {
  if (quantity < 1) {
    throw new Error(
      "Quantity must be positive.",
    );
  }

  if (
    !Number.isFinite(webProduct.price) ||
    webProduct.price <= 0
  ) {
    throw new Error(
      "Invalid web product price.",
    );
  }

  if (!webProduct.url) {
    throw new Error(
      "Web product URL is required.",
    );
  }

  const cart = await prisma.cart.findUnique({
    where: {
      id: cartId,
    },
  });

  if (!cart) {
    throw new Error("Cart not found.");
  }

  if (cart.status !== "OPEN") {
    throw new Error(
      "This cart is no longer open.",
    );
  }

  const sku =
    `WEB-${webProduct.source ?? "product"}-${webProduct.id}`
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .slice(0, 190);

  const brand =
    webProduct.brand?.trim() ||
    webProduct.source?.trim() ||
    "Web Merchant";

  const productName =
    webProduct.name.trim();

  const price =
    Number(webProduct.price);

  const cost =
    Math.max(0, price * 0.8);

  const margin =
    Math.max(0, price - cost);

  const rating =
    webProduct.rating != null &&
    Number.isFinite(
      webProduct.rating,
    )
      ? Math.min(
          5,
          Math.max(
            0,
            Number(webProduct.rating),
          ),
        )
      : 0;

  const inventoryQuantity =
    webProduct.available === false
      ? 0
      : Math.max(
          quantity,
          Number(
            webProduct.inventory ?? 1,
          ),
        );

  const product =
    await prisma.product.upsert({
      where: {
        sku,
      },
      update: {
        name: productName,
        brand,
        price: price.toString(),
        cost: cost.toString(),
        margin: margin.toString(),
        rating: rating.toString(),
        description:
          `${brand} product sourced from ${webProduct.source ?? "web"}.`,
        merchantId:
          cart.merchantId,
        features: [
          "web product",
          webProduct.source ??
            "web",
        ],
        returnRisk: "unknown",
        relevantAccessories: [],
      },
      create: {
        sku,
        merchantId:
          cart.merchantId,
        name: productName,
        brand,
        category: "web_product",
        description:
          `${brand} product sourced from ${webProduct.source ?? "web"}.`,
        price: price.toString(),
        cost: cost.toString(),
        margin: margin.toString(),
        rating: rating.toString(),
        features: [
          "web product",
          webProduct.source ??
            "web",
        ],
        returnRisk: "unknown",
        relevantAccessories: [],
      },
    });

  await prisma.inventory.upsert({
    where: {
      productId: product.id,
    },
    update: {
      quantity:
        inventoryQuantity,
    },
    create: {
      productId: product.id,
      quantity:
        inventoryQuantity,
    },
  });

  if (
    inventoryQuantity < quantity
  ) {
    throw new Error(
      `Insufficient inventory for ${productName}.`,
    );
  }

  return prisma.cartItem.upsert({
    where: {
      cartId_productId: {
        cartId,
        productId: product.id,
      },
    },
    update: {
      quantity,
      unitPrice: product.price,
    },
    create: {
      cartId,
      productId: product.id,
      quantity,
      unitPrice: product.price,
    },
    include: {
      product: {
        include: {
          inventory: true,
        },
      },
    },
  });
}

export async function removeItem(
  cartId: string,
  productId: string,
) {
  return prisma.cartItem.delete({
    where: {
      cartId_productId: {
        cartId,
        productId,
      },
    },
  });
}

export async function getCart(
  cartId: string,
) {
  return prisma.cart.findUnique({
    where: {
      id: cartId,
    },
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
  });
}

type CartItemForTotal = {
  quantity: number;
  unitPrice:
    | number
    | {
        toNumber(): number;
      };
};

export function calculateCartTotal(
  items: CartItemForTotal[],
) {
  return items.reduce(
    (sum, item) =>
      sum +
      item.quantity *
        Number(item.unitPrice),
    0,
  );
}

export async function validateCart(
  cartId: string,
) {
  const cart =
    await getCart(cartId);

  if (!cart) {
    throw new Error(
      "Cart not found.",
    );
  }

  if (cart.status !== "OPEN") {
    throw new Error(
      "Cart is no longer open.",
    );
  }

  if (cart.items.length === 0) {
    throw new Error(
      "Cart is empty.",
    );
  }

  for (const item of cart.items) {
    const inventory =
      item.product.inventory;

    if (
      (inventory?.quantity ?? 0) <
      item.quantity
    ) {
      throw new Error(
        `Out of stock: ${item.product.name}`,
      );
    }

    if (
      Number(item.unitPrice) !==
      Number(item.product.price)
    ) {
      throw new Error(
        `Stale price for ${item.product.name}`,
      );
    }
  }

  return {
    cart,
    total:
      calculateCartTotal(
        cart.items,
      ),
  };
}