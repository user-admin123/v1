import { useState, useCallback, useEffect } from "react";
import { Category, MenuItem, RestaurantInfo } from "@/lib/types";
import {
  fetchCategories,
  fetchMenuItems,
  fetchRestaurant,
  saveAllChanges as dbSaveAll,
} from "@/lib/database";
import {
  login as doLogin,
  logout as doLogout,
  isAuthenticated,
} from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function useMenuData() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [restaurant, setRestaurant] = useState<RestaurantInfo>({ name: "", tagline: "", logo_url: "" });
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

 // --- PRODUCTION DOORBELL LOGIC ---
  useEffect(() => {
    const ringDoorbell = async () => {
      const restId = restaurant?.id;
      const sessionKey = `doorbell_rung_${restId}`;
      // NEW GUARD: If user is authenticated (Admin), do not ring the doorbell
      if (authed) {
        if (import.meta.env.DEV) console.log("Admin detected: Skipping view count.");
        return;
      }
      // Guard clauses
      if (!restId || sessionStorage.getItem(sessionKey)) return;
      const { error: rpcError } = await supabase.rpc('log_customer_view', { 
        target_rest_id: restId 
      });
      if (rpcError) {
        // Vite-specific dev logging
        if (import.meta.env.DEV) console.error("Doorbell Error:", rpcError);
        return; 
      }
      sessionStorage.setItem(sessionKey, 'true');
    };
    ringDoorbell();
  }, [restaurant?.id, authed]);

  // Check auth on mount + listen for changes
  useEffect(() => {
    isAuthenticated().then(setAuthed);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch data from Supabase
  useEffect(() => {
    let cancelled = false;
    // Inside useMenuData.ts
async function load() {
  setLoading(true);
  try {
    // 1. Get Restaurant first
    const rest = await fetchRestaurant();
    
    // 2. Get the combined menu data using the Restaurant ID
    const { categories: cats, items: menuItems } = await fetchFullMenu(rest.id);

    if (!cancelled) {
      setCategories(cats); // Already sorted by order_index in the query
      setItems(menuItems);
      setRestaurant(rest);
    }
  } catch (err: any) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}
    load();
    return () => { cancelled = true; };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, menuItems, rest] = await Promise.all([
        fetchCategories(),
        fetchMenuItems(),
        fetchRestaurant(),
      ]);
      setCategories(cats.sort((a, b) => a.order_index - b.order_index));
      setItems(menuItems);
      setRestaurant(rest);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Failed to refresh");
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCategories = useCallback((cats: Category[]) => {
    setCategories([...cats].sort((a, b) => a.order_index - b.order_index));
  }, []);

  const updateItems = useCallback((newItems: MenuItem[]) => {
    setItems(newItems);
  }, []);

  const updateRestaurant = useCallback((info: RestaurantInfo) => {
    setRestaurant(info);
  }, []);

  const saveAll = useCallback(async (cats: Category[], menuItems: MenuItem[], rest: RestaurantInfo, deletedCatIds: string[] = [], deletedItemIds: string[] = []) => {
    const success = await dbSaveAll(cats, menuItems, rest, deletedCatIds, deletedItemIds);
    if (success) {
      setCategories([...cats].sort((a, b) => a.order_index - b.order_index));
      setItems(menuItems);
      setRestaurant(rest);
    }
    return success;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const ok = await doLogin(email, password);
    return ok;
  }, []);

  const logout = useCallback(async () => {
    await doLogout();
  }, []);

  return {
    categories, items, restaurant, authed, loading, error,
    login, logout,
    updateCategories, updateItems, updateRestaurant,
    saveAll, refresh,
  };
}
