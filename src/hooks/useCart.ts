import { useState, useCallback, useEffect } from "react";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
}

const CART_KEY = "qrmenu_cart";

function getStoredCart(): Record<string, CartItem> {
  try {
    const stored = localStorage.getItem(CART_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {};
}

function saveCart(cart: Record<string, CartItem>) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function useCart() {
  const [cart, setCart] = useState<Record<string, CartItem>>(getStoredCart);

  useEffect(() => {
    saveCart(cart);
  }, [cart]);

  const addItem = useCallback((item: { id: string; name: string; price: number; image_url?: string }) => {
    setCart((prev) => {
      const existing = prev[item.id];
      return {
        ...prev,
        [item.id]: {
          id: item.id,
          name: item.name,
          price: item.price,
          image_url: item.image_url,
          quantity: (existing?.quantity || 0) + 1,
        },
      };
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setCart((prev) => {
      const existing = prev[id];
      if (!existing || existing.quantity <= 1) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: { ...existing, quantity: existing.quantity - 1 } };
    });
  }, []);

  const getQuantity = useCallback((id: string) => cart[id]?.quantity || 0, [cart]);

  const cartItems = Object.values(cart).filter((i) => i.quantity > 0);
  const totalItems = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const clearCart = useCallback(() => {
    setCart({});
  }, []);

  return { cart, cartItems, totalItems, totalPrice, addItem, removeItem, getQuantity, clearCart };
}
