import { supabase } from "./supabase";
import { Category, MenuItem, RestaurantInfo } from "./types";
import {
  saveCategories as saveLocalCategories,
  saveMenuItems as saveLocalItems,
  saveRestaurant as saveLocalRestaurant,
} from "./store";
import { logger } from "./logger";

// -----------------------------------------------------------------------------
// FETCH HELPERS (Supabase Primary, localStorage Cache)
// -----------------------------------------------------------------------------

/**
 * FETCH FULL MENU
 * Optimized for Egress and Disk I/O by selecting specific columns
 * and filtering by restaurant_id.
 */
export async function fetchFullMenu(restaurantId: string): Promise<{ categories: Category[]; items: MenuItem[] }> {
  logger.db("SELECT", "categories + menu_items", `Fetching joined data for ${restaurantId}`);

  const { data, error } = await supabase
    .from("categories")
    .select(`
      id, 
      name, 
      order_index, 
      restaurant_id,
      menu_items (
        id, 
        name, 
        price, 
        description, 
        available, 
        image_url, 
        item_type, 
        category_id,
        restaurant_id
      )
    `)
    .eq("restaurant_id", restaurantId)
    .order("order_index", { ascending: true });

  if (error) {
    logger.error("fetchFullMenu failed:", error.message, error);
    throw error;
  }

  // 1. Extract Categories (Remove nested menu_items array for the category state)
  const categories = (data || []).map(({ menu_items, ...cat }) => cat) as Category[];

  // 2. Extract Items (Flatten all menu_items from all categories into one list)
  const items = (data || []).flatMap((cat) => cat.menu_items || []) as MenuItem[];

  logger.db("SELECT", "full_menu", `Got ${categories.length} cats and ${items.length} items`);

  // 3. Save to Local Storage (Offline-first logic)
  saveLocalCategories(categories);
  saveLocalItems(items);

  return { categories, items };
}

/**
 * FETCH RESTAURANT INFO
 * Uses .single() and specific columns to reduce payload.
 */
export async function fetchRestaurant(): Promise<RestaurantInfo> {
  logger.db("SELECT", "restaurant", "fetching single info");

  const { data, error } = await supabase
    .from("restaurant")
    .select("id, name, tagline, logo_url, show_veg_filter, show_sold_out, show_search, show_qr_logo")
    .limit(1)
    .single();

  if (error) {
    logger.error("fetchRestaurant failed:", error.message, error);
    throw error;
  }

  const rest = data as RestaurantInfo;
  saveLocalRestaurant(rest);
  return rest;
}

/**
 * FETCH ADMIN USAGE
 * Fetches dashboard stats for a specific restaurant.
 */
export async function fetchAdminUsage(restaurantId: string): Promise<any> {
  logger.db("SELECT", "admin_usage_dashboard", `fetching stats for id=${restaurantId}`);

  const { data, error } = await supabase
    .from("admin_usage_dashboard")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .single();

  if (error) {
    logger.error("fetchAdminUsage failed:", error.message, error);
    throw error;
  }

  logger.db("SELECT", "admin_usage_dashboard", "got usage stats successfully");
  return data;
}

// -----------------------------------------------------------------------------
// SAVE HELPERS
// -----------------------------------------------------------------------------

export async function saveCategories(cats: Category[]): Promise<void> {
  logger.db("UPSERT", "categories", `saving ${cats.length} rows`);
  saveLocalCategories(cats);
  const { error } = await supabase.from("categories").upsert(cats, { onConflict: "id" });
  if (error) {
    logger.error("saveCategories failed:", error.message, error);
    throw error;
  }
  logger.db("UPSERT", "categories", "success");
}

export async function saveMenuItems(items: MenuItem[]): Promise<void> {
  logger.db("UPSERT", "menu_items", `saving ${items.length} rows`);
  saveLocalItems(items);
  const { error } = await supabase.from("menu_items").upsert(items, { onConflict: "id" });
  if (error) {
    logger.error("saveMenuItems failed:", error.message, error);
    throw error;
  }
  logger.db("UPSERT", "menu_items", "success");
}

export async function saveRestaurant(info: RestaurantInfo): Promise<void> {
  logger.db("UPSERT", "restaurant", info);
  saveLocalRestaurant(info);
  const { error } = await supabase.from("restaurant").upsert(info);
  if (error) {
    logger.error("saveRestaurant failed:", error.message, error);
    throw error;
  }
  logger.db("UPSERT", "restaurant", "success");
}

// -----------------------------------------------------------------------------
// DELETE HELPERS
// -----------------------------------------------------------------------------

export async function deleteCategory(id: string): Promise<void> {
  logger.db("DELETE", "menu_items", `cascade for category_id=${id}`);
  await supabase.from("menu_items").delete().eq("category_id", id);
  logger.db("DELETE", "categories", `id=${id}`);
  await supabase.from("categories").delete().eq("id", id);
}

export async function deleteMenuItem(id: string): Promise<void> {
  logger.db("DELETE", "menu_items", `id=${id}`);
  await supabase.from("menu_items").delete().eq("id", id);
}

// -----------------------------------------------------------------------------
// BATCH SAVE
// -----------------------------------------------------------------------------

export async function saveAllChanges(
  categories: Category[],
  items: MenuItem[],
  restaurant: RestaurantInfo,
  deletedCategoryIds: string[] = [],
  deletedItemIds: string[] = []
): Promise<boolean> {
  logger.db(
    "BATCH SAVE",
    "all tables",
    `cats=${categories.length}, items=${items.length}, delCats=${deletedCategoryIds.length}, delItems=${deletedItemIds.length}`
  );

  // Sync local cache first
  saveLocalCategories(categories);
  saveLocalItems(items);
  saveLocalRestaurant(restaurant);

  try {
    // 1. Delete items first (maintains integrity before potential category deletion)
    const allDeletedItemIds = [...new Set(deletedItemIds)];
    if (allDeletedItemIds.length > 0) {
      logger.db("DELETE", "menu_items", `ids=${allDeletedItemIds.join(",")}`);
      const { error } = await supabase.from("menu_items").delete().in("id", allDeletedItemIds);
      if (error) {
        logger.error("Delete menu_items failed:", error.message);
        return false;
      }
    }

    // 2. Delete categories
    if (deletedCategoryIds.length > 0) {
      logger.db("DELETE", "categories", `ids=${deletedCategoryIds.join(",")}`);
      const { error } = await supabase.from("categories").delete().in("id", deletedCategoryIds);
      if (error) {
        logger.error("Delete categories failed:", error.message);
        return false;
      }
    }

    // 3. Upsert remaining data with restaurant_id safety injection
    const [catRes, itemRes, restRes] = await Promise.all([
      categories.length > 0
        ? supabase
            .from("categories")
            .upsert(
              categories.map((c) => ({ ...c, restaurant_id: restaurant.id })),
              { onConflict: "id" }
            )
        : { error: null },
      items.length > 0
        ? supabase
            .from("menu_items")
            .upsert(
              items.map((i) => ({ ...i, restaurant_id: restaurant.id })),
              { onConflict: "id" }
            )
        : { error: null },
      supabase.from("restaurant").upsert(restaurant, { onConflict: "id" }),
    ]);

    if (catRes.error || itemRes.error || restRes.error) {
      logger.error("Batch save errors:", {
        categories: catRes.error?.message,
        menu_items: itemRes.error?.message,
        restaurant: restRes.error?.message,
      });
      return false;
    }

    logger.db("BATCH SAVE", "all tables", "success");
    return true;
  } catch (err: any) {
    logger.error("Batch save exception:", err.message);
    return false;
  }
}
