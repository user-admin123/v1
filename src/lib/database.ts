import { supabase } from "./supabase";
import { Category, MenuItem, RestaurantInfo } from "./types";
import {
  saveCategories as saveLocalCategories,
  saveMenuItems as saveLocalItems,
  saveRestaurant as saveLocalRestaurant,
} from "./store";
import { logger } from "./logger";

// -----------------------------------------------------------------------------
// FETCH HELPERS
// -----------------------------------------------------------------------------

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

  const categories = (data || []).map(({ menu_items, ...cat }) => cat) as Category[];
  const items = (data || []).flatMap((cat) => cat.menu_items || []) as MenuItem[];

  logger.db("SELECT", "full_menu", `Got ${categories.length} cats and ${items.length} items`);

  saveLocalCategories(categories);
  saveLocalItems(items);

  return { categories, items };
}

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
// INDIVIDUAL SAVE HELPERS
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
// STANDALONE DELETE HELPERS (Restored from Old Code)
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
// BATCH SAVE (Sequential Flow)
// -----------------------------------------------------------------------------

export async function saveAllChanges(
  categories: Category[],
  items: MenuItem[],
  restaurant: RestaurantInfo,
  deletedCategoryIds: string[] = [],
  deletedItemIds: string[] = []
): Promise<boolean> {
  logger.db("BATCH SAVE", "--- STARTING SEQUENTIAL SAVE ---", { 
    items: items.length, 
    deletes: deletedItemIds.length 
  });

  try {
    const activeCategories = categories.filter(c => !deletedCategoryIds.includes(c.id));
    const activeItems = items.filter(i => !deletedItemIds.includes(i.id));

    // 1. Execute Deletions
    if (deletedItemIds.length > 0) {
      const { error } = await supabase.from("menu_items").delete().in("id", deletedItemIds);
      if (error) {
        logger.error("Batch delete items failed:", error.message, error);
        throw error;
      }
    }
    
    if (deletedCategoryIds.length > 0) {
      const { error } = await supabase.from("categories").delete().in("id", deletedCategoryIds);
      if (error) {
        logger.error("Batch delete categories failed:", error.message, error);
        throw error;
      }
    }

    // 2. Execute Upserts
    const { error: restError } = await supabase.from("restaurant").upsert(restaurant, { onConflict: 'id' });
    if (restError) {
        logger.error("Batch upsert restaurant failed:", restError.message, restError);
        throw restError;
    }

    if (activeCategories.length > 0) {
      const { error: catError } = await supabase.from("categories").upsert(activeCategories, { onConflict: 'id' });
      if (catError) {
          logger.error("Batch upsert categories failed:", catError.message, catError);
          throw catError;
      }
    }

    if (activeItems.length > 0) {
      const { error: itemError } = await supabase.from("menu_items").upsert(activeItems, { onConflict: 'id' });
      if (itemError) {
          logger.error("Batch upsert items failed:", itemError.message, itemError);
          throw itemError;
      }
    }

    logger.db("BATCH SAVE", "--- SUCCESS: ALL DATA PERSISTED ---", "success");
    return true;

  } catch (err: any) {
    logger.error("BATCH SAVE FAILED", err.message || err);
    return false;
  }
}
