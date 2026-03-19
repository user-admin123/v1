import { useState, useCallback, useEffect } from "react";
import { Category, MenuItem, RestaurantInfo } from "@/lib/types";
import {
  fetchFullMenu,
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
  // --- State ---
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [restaurant, setRestaurant] = useState<RestaurantInfo>({
    name: "",
    tagline: "",
    logo_url: "",
  });
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Analytics Logic ---

  /**
   * PRODUCTION DOORBELL LOGIC
   * Logs a customer view via Supabase RPC if the user is not an admin.
   */
  useEffect(() => {
    const ringDoorbell = async () => {
      const restId = restaurant?.id;
      const sessionKey = `doorbell_rung_${restId}`;

      // Skip if Admin or if already rung in this session
      if (authed) {
        if (import.meta.env.DEV) console.log("Admin detected: Skipping view count.");
        return;
      }

      if (!restId || sessionStorage.getItem(sessionKey)) return;

      const { error: rpcError } = await supabase.rpc("log_customer_view", {
        target_rest_id: restId,
      });

      if (rpcError) {
        if (import.meta.env.DEV) console.error("Doorbell Error:", rpcError);
        return;
      }

      sessionStorage.setItem(sessionKey, "true");
    };

    ringDoorbell();
  }, [restaurant?.id, authed]);

  // --- Auth Management ---

  useEffect(() => {
    isAuthenticated().then(setAuthed);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- Data Loading ---

  /**
   * INITIAL LOAD
   * Fetches restaurant info first, then uses the ID to fetch the full menu.
   */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const rest = await fetchRestaurant();
        const { categories: cats, items: menuItems } = await fetchFullMenu(rest.id);

        if (!cancelled) {
          setCategories([...cats].sort((a, b) => a.order_index - b.order_index));
          setItems(menuItems);
          setRestaurant(rest);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to load menu data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Handlers ---

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rest = await fetchRestaurant();
      const { categories: cats, items: menuItems } = await fetchFullMenu(rest.id);

      setCategories([...cats].sort((a, b) => a.order_index - b.order_index));
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

  const saveAll = useCallback(
    async (
      cats: Category[],
      menuItems: MenuItem[],
      rest: RestaurantInfo,
      deletedCatIds: string[] = [],
      deletedItemIds: string[] = []
    ) => {
      const success = await dbSaveAll(cats, menuItems, rest, deletedCatIds, deletedItemIds);
      if (success) {
        setCategories([...cats].sort((a, b) => a.order_index - b.order_index));
        setItems(menuItems);
        setRestaurant(rest);
      }
      return success;
    },
    []
  );

  const login = useCallback(async (email: string, password: string) => {
    return await doLogin(email, password);
  }, []);

  const logout = useCallback(async () => {
    await doLogout();
  }, []);

  return {
    // State
    categories,
    items,
    restaurant,
    authed,
    loading,
    error,
    // Methods
    login,
    logout,
    updateCategories,
    updateItems,
    updateRestaurant,
    saveAll,
    refresh,
  };
}
