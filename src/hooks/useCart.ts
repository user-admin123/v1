import { useState, useCallback, useEffect, useMemo } from "react";
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
    return stored ? JSON.parse(stored) : {};
  } catch { return {}; }
}

export function useCart(availableItems: MenuItem[] = []) {
  const [cart, setCart] = useState<Record<string, CartItem>>(getStoredCart);

  // Persistence
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  /**
   * OPTIMIZED VALIDATION
   * Uses a Map for O(1) lookup and useMemo to prevent lag
   */
  const { cartItems, totalItems, totalPrice } = useMemo(() => {
    // 1. Create a fast lookup map (Run once per menu update)
    const itemMap = new Map(availableItems.map(i => [i.id, i]));
    
    const validated: CartItem[] = [];
    let tItems = 0;
    let tPrice = 0;

    // 2. Single pass through the cart
    Object.values(cart).forEach((item) => {
      const dbItem = itemMap.get(item.id);
      
      // Only include if item exists in DB and is available (or admin allows sold out)
      if (dbItem && (dbItem.available !== false)) {
        validated.push(item);
        tItems += item.quantity;
        tPrice += item.price * item.quantity;
      }
    });

    return { cartItems: validated, totalItems: tItems, totalPrice: tPrice };
  }, [cart, availableItems]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">) => {
    setCart((prev) => ({
      ...prev,
      [item.id]: { ...item, quantity: (prev[item.id]?.quantity || 0) + 1 },
    }));
  }, []);

  const removeItem = useCallback((id: string) => {
    setCart((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: { ...existing, quantity: existing.quantity - 1 } };
    });
  }, []);

  const getQuantity = useCallback((id: string) => cart[id]?.quantity || 0, [cart]);
  const clearCart = useCallback(() => setCart({}), []);

  return { cart, cartItems, totalItems, totalPrice, addItem, removeItem, getQuantity, clearCart };
}
