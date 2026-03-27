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
import { logger } from "@/lib/logger";

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

  // --- Analytics Logic (The Doorbell) ---
  useEffect(() => {
    // 1. Setup the timer
    const timer = setTimeout(async () => {
      const restId = restaurant?.id;
      if (!restId) return;

      const sessionKey = `doorbell_rung_${restId}`;
      if (sessionStorage.getItem(sessionKey)) return;

      const isAuthed = await isAuthenticated();
      if (isAuthed) {
        sessionStorage.setItem(sessionKey, "true");
        setAuthed(true);
        return;
      }

      // Ring doorbell after 5 seconds of active presence
      const { error: rpcError } = await supabase.rpc("log_customer_view", {
        target_id: restId,
      });

      if (!rpcError) {
        sessionStorage.setItem(sessionKey, "true");
        logger.info("Doorbell rung after 5s quality visit.");
      }
    }, 5000);

    // 2. Cleanup: If user leaves before 5s, cancel the timer
    return () => clearTimeout(timer);
  }, [restaurant?.id]);

  // --- Auth Management ---
  useEffect(() => {
    isAuthenticated().then((status) => {
      setAuthed(status);
      logger.auth("Initial session check", { authenticated: status });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const isNowAuthed = !!session;
      setAuthed(isNowAuthed);
      logger.auth(`Auth state changed: ${event}`, { authenticated: isNowAuthed });
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- Data Loading ---
  useEffect(() => {
    let cancelled = false;

    async function load() {
      logger.info("Initializing menu data load...");
      setLoading(true);
      setError(null);
      try {
        const rest = await fetchRestaurant();
        logger.db("FETCH", "restaurant", { id: rest.id });

        const { categories: cats, items: menuItems } = await fetchFullMenu(rest.id);
        logger.db("FETCH", "full_menu", { categories: cats.length, items: menuItems.length });

        if (!cancelled) {
          setCategories([...cats].sort((a, b) => a.order_index - b.order_index));
          setItems(menuItems);
          setRestaurant(rest);
        }
      } catch (err: any) {
        logger.error("Menu data load failed:", err.message);
        if (!cancelled) setError(err?.message || "Failed to load menu data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // --- Handlers ---

  const login = useCallback(async (email: string, password: string) => {
    logger.auth("Attempting login...", { email });
    try {
      const success = await doLogin(email, password);

      if (success) {
        logger.auth("Login successful.");
        if (restaurant?.id) {
          logger.info("Triggering Silent Eraser for Admin...");
          supabase.rpc("undo_admin_scan", { target_id: restaurant.id })
            .then(() => logger.info("Silent Eraser complete."))
            .catch(err => logger.error("Silent Eraser failed:", err));
        }

        setAuthed(true);
        return true;
      }
      
      logger.warn("Login failed: Invalid credentials.");
      return false;
    } catch (err) {
      logger.error("Unexpected login error:", err);
      return false;
    }
  }, [restaurant?.id]);

  const logout = useCallback(async () => {
  logger.auth("Logging out...");
  
  // 1. Clear Supabase Auth
  await doLogout();
  
  // 2. Clear Local Storage to prevent "Ghost Data" for the next user
  localStorage.removeItem("qrmenu_items");
  localStorage.removeItem("qrmenu_categories");
  localStorage.removeItem("qrmenu_restaurant");
  
  // 3. Update local state immediately
  setAuthed(false);
  
  logger.info("Local storage wiped. Redirecting...");
  window.location.reload(); // Optional: clean refresh to home state
}, []);

  const saveAll = useCallback(
    async (
      cats: Category[],
      menuItems: MenuItem[],
      rest: RestaurantInfo,
      deletedCatIds: string[] = [],
      deletedItemIds: string[] = []
    ) => {
      logger.db("SAVE_ALL", "Batch sync started", {
        updatedCats: cats.length,
        updatedItems: menuItems.length,
      });

      const success = await dbSaveAll(cats, menuItems, rest, deletedCatIds, deletedItemIds);
      
      if (success) {
        logger.info("Database sync successful. Updating local state.");
        setCategories([...cats].sort((a, b) => a.order_index - b.order_index));
        setItems(menuItems);
        setRestaurant(rest);
      } else {
        logger.error("Database sync failed.");
      }
      return success;
    }, []
  );

  return {
    categories,
    items,
    restaurant,
    authed,
    loading,
    error,
    login,
    logout,
    updateCategories: (cats: Category[]) => {
      logger.info("Updating local categories order.");
      setCategories([...cats].sort((a, b) => a.order_index - b.order_index));
    },
    updateItems: setItems,
    updateRestaurant: setRestaurant,
    saveAll,
    refresh: () => {
      logger.info("Manual refresh triggered.");
      window.location.reload();
    },
  };
}
