import { useState, useCallback, useEffect } from "react";
import { MenuItem } from "@/lib/types";

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
  } catch {
    return {};
  }
  return {};
}

function saveCart(cart: Record<string, CartItem>) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function useCart(availableItems: MenuItem[] = []) {
  const [cart, setCart] = useState<Record<string, CartItem>>(getStoredCart);

  // Sync state to localStorage whenever the cart changes
  useEffect(() => {
    saveCart(cart);
  }, [cart]);

  /**
   * VALIDATION LOGIC
   * This is the "Magic" that fixes your stale data bug.
   * It filters the raw cart data against the actual items currently in the database.
   */
  const cartItems = Object.values(cart).filter((cartItem) => {
    // 1. If we are still loading or have no menu data yet, show everything from storage
    if (availableItems.length === 0) return true;

    // 2. Find the item in the fresh menu data
    const dbItem = availableItems.find((i) => i.id === cartItem.id);

    // 3. Only keep it if it exists in the DB AND is marked as available
    // If an Admin hides it or deletes it, it fails this check and disappears from the cart.
    return dbItem && dbItem.available !== false;
  });

  // Calculate totals based ONLY on the validated/filtered items above
  const totalItems = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

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
      if (!existing) return prev;
      
      if (existing.quantity <= 1) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { 
        ...prev, 
        [id]: { ...existing, quantity: existing.quantity - 1 } 
      };
    });
  }, []);

  const getQuantity = useCallback((id: string) => cart[id]?.quantity || 0, [cart]);

  const clearCart = useCallback(() => {
    setCart({});
  }, []);

  return { 
    cart, 
    cartItems, 
    totalItems, 
    totalPrice, 
    addItem, 
    removeItem, 
    getQuantity, 
    clearCart 
  };
}
