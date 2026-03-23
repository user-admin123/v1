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
// STORAGE HELPERS
// -----------------------------------------------------------------------------

// Add this helper at the top or within the file
const getInternalPath = (url: string | null | undefined): string | null => {
  if (!url || !url.includes('supabase.co') || !url.includes('restaurant-assets/')) return null;
  try {
    const parts = url.split('restaurant-assets/');
    // Returns 'images/item-123.webp' instead of the full URL
    return parts.length > 1 ? decodeURIComponent(parts[1].split('?')[0]) : null;
  } catch { return null; }
};

// ... (fetch helpers remain the same)

// -----------------------------------------------------------------------------
// BATCH SAVE (Updated for Cleanup Queue)
// -----------------------------------------------------------------------------

export async function saveAllChanges(
  categories: Category[],
  items: MenuItem[],
  restaurant: RestaurantInfo,
  deletedCategoryIds: string[] = [],
  deletedItemIds: string[] = [],
  pendingDeleteUrls: string[] = []
): Promise<boolean> {
  logger.db(
    "BATCH SAVE",
    "all tables",
    `cats=${categories.length}, items=${items.length}, delCats=${deletedCategoryIds.length}, delItems=${deletedItemIds.length}, pendingDeletes=${pendingDeleteUrls.length}`
  );

  // Sync local cache
  saveLocalCategories(categories);
  saveLocalItems(items);
  saveLocalRestaurant(restaurant);

  try {
    // 1. Prepare Cleanup Queue Data
    const internalPaths = [...new Set(pendingDeleteUrls)]
      .map(url => getInternalPath(url))
      .filter((path): path is string => !!path);

    // 2. Perform Deletions
    if (deletedItemIds.length > 0) {
      const { error } = await supabase.from("menu_items").delete().in("id", deletedItemIds);
      if (error) throw new Error(`Delete items: ${error.message}`);
    }

    if (deletedCategoryIds.length > 0) {
      const { error } = await supabase.from("categories").delete().in("id", deletedCategoryIds);
      if (error) throw new Error(`Delete categories: ${error.message}`);
    }

    // 3. Upsert Remaining Data
    const [catRes, itemRes, restRes] = await Promise.all([
      categories.length > 0
        ? supabase.from("categories").upsert(
            categories.map((c) => ({ ...c, restaurant_id: restaurant.id })),
            { onConflict: "id" }
          )
        : { error: null },
      items.length > 0
        ? supabase.from("menu_items").upsert(
            items.map((i) => ({ ...i, restaurant_id: restaurant.id })),
            { onConflict: "id" }
          )
        : { error: null },
      supabase.from("restaurant").upsert(restaurant, { onConflict: "id" }),
    ]);

    if (catRes.error || itemRes.error || restRes.error) {
      throw new Error("Upsert failed");
    }

    // 4. Log files to Cleanup Queue instead of deleting physically
    if (internalPaths.length > 0) {
      const queueEntries = internalPaths.map(path => ({
        file_path: path,
        restaurant_id: restaurant.id // Tied to restaurant for RLS
      }));

      const { error: queueError } = await supabase
        .from("storage_cleanup_queue")
        .insert(queueEntries);
      
      if (queueError) logger.error("Failed to queue storage cleanup:", queueError.message);
    }

    logger.db("BATCH SAVE", "success");
    return true;
  } catch (err: any) {
    logger.error("Batch save failed:", err.message);
    return false;
  }
}
