export type CartItem = {
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
  cartQuantity: number;
};

const CART_KEY = "money-autopilot-cart";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getCart(): CartItem[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw =
      window.localStorage.getItem(CART_KEY);

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is CartItem => {
      if (
        typeof item !== "object" ||
        item === null
      ) {
        return false;
      }

      const value =
        item as Partial<CartItem>;

      return (
        typeof value.id === "string" &&
        typeof value.name === "string" &&
        typeof value.price === "number" &&
        typeof value.url === "string" &&
        typeof value.cartQuantity ===
          "number" &&
        value.cartQuantity > 0
      );
    });
  } catch {
    return [];
  }
}

export function saveCart(
  items: CartItem[],
) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(
    CART_KEY,
    JSON.stringify(items),
  );

  window.dispatchEvent(
    new Event("cart-updated"),
  );
}

export function addToCart(
  product: Omit<CartItem, "cartQuantity">,
) {
  const cart = getCart();

  const existing =
    cart.find(
      (item) => item.id === product.id,
    );

  if (existing) {
    existing.cartQuantity += 1;
  } else {
    cart.push({
      ...product,
      cartQuantity: 1,
    });
  }

  saveCart(cart);

  return cart;
}

export function removeFromCart(
  productId: string,
) {
  const updated = getCart().filter(
    (item) => item.id !== productId,
  );

  saveCart(updated);

  return updated;
}

export function updateCartQuantity(
  productId: string,
  quantity: number,
) {
  if (quantity <= 0) {
    return removeFromCart(productId);
  }

  const cart = getCart();

  const item = cart.find(
    (entry) =>
      entry.id === productId,
  );

  if (!item) {
    return cart;
  }

  item.cartQuantity = quantity;

  saveCart(cart);

  return cart;
}

export function clearCart() {
  saveCart([]);

  return [];
}

export function getCartCount() {
  return getCart().reduce(
    (total, item) =>
      total + item.cartQuantity,
    0,
  );
}

export function getCartSubtotal() {
  return getCart().reduce(
    (total, item) =>
      total +
      item.price * item.cartQuantity,
    0,
  );
}