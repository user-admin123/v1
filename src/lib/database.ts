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
  if (!url) {
    logger.db("CLEANUP", "Skipping: URL is null or undefined");
    return null;
  }

  // Check if it belongs to your bucket
  if (!url.includes('restaurant-assets')) {
    logger.db("CLEANUP", `Skipping: URL does not contain 'restaurant-assets'. URL: ${url}`);
    return null;
  }

  try {
    const parts = url.split('restaurant-assets/');
    
    if (parts.length < 2) {
      logger.error("CLEANUP", `Failed to split URL. Separator 'restaurant-assets/' not found correctly in: ${url}`);
      return null;
    }

    // parts[1] is the path after the bucket name
    const rawPath = parts[1].split('?')[0]; // Remove ?t=123123 params
    const cleanPath = decodeURIComponent(rawPath);
    
    logger.db("CLEANUP", `Extracted Internal Path: ${cleanPath}`);
    return cleanPath;
  } catch (err) {
    logger.error("CLEANUP", "Path extraction crashed", err);
    return null;
  }
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
  logger.db("BATCH SAVE", "--- STARTING SEQUENTIAL SAVE ---", { 
    items: items.length, 
    deletes: deletedItemIds.length, 
    cleanup: pendingDeleteUrls.length 
  });

  try {
    // 1. SANITIZE
    const activeCategories = categories.filter(c => !deletedCategoryIds.includes(c.id));
    const activeItems = items.filter(i => !deletedItemIds.includes(i.id));

    // 2. PREPARE CLEANUP PATHS
    logger.db("BATCH SAVE", "Processing cleanup URLs...");
    const internalPaths = [...new Set(pendingDeleteUrls)]
      .map(url => getInternalPath(url))
      .filter((path): path is string => !!path);

    // 3. EXECUTE DELETIONS (Items first to avoid FK constraints)
    if (deletedItemIds.length > 0) {
      logger.db("BATCH SAVE", `Deleting ${deletedItemIds.length} items...`);
      const { error } = await supabase.from("menu_items").delete().in("id", deletedItemIds);
      if (error) throw new Error(`Items delete failed: ${error.message}`);
    }
    
    if (deletedCategoryIds.length > 0) {
      logger.db("BATCH SAVE", `Deleting ${deletedCategoryIds.length} categories...`);
      const { error } = await supabase.from("categories").delete().in("id", deletedCategoryIds);
      if (error) throw new Error(`Categories delete failed: ${error.message}`);
    }

    // 4. EXECUTE UPSERTS (Strictly Sequential to prevent Deadlocks)
    
    logger.db("BATCH SAVE", "Updating Restaurant info...");
    const { error: restError } = await supabase.from("restaurant").upsert(restaurant, { onConflict: 'id' });
    if (restError) throw new Error(`Restaurant upsert failed: ${restError.message}`);

    if (activeCategories.length > 0) {
      logger.db("BATCH SAVE", `Upserting ${activeCategories.length} categories...`);
      const { error: catError } = await supabase.from("categories").upsert(activeCategories, { onConflict: 'id' });
      if (catError) throw new Error(`Categories upsert failed: ${catError.message}`);
    }

    if (activeItems.length > 0) {
      logger.db("BATCH SAVE", `Upserting ${activeItems.length} items...`);
      const { error: itemError } = await supabase.from("menu_items").upsert(activeItems, { onConflict: 'id' });
      if (itemError) throw new Error(`Items upsert failed: ${itemError.message}`);
    }

    // 5. QUEUE STORAGE CLEANUP
    if (internalPaths.length > 0) {
      logger.db("BATCH SAVE", `Queuing ${internalPaths.length} files for storage deletion...`);
      const { error: qError } = await supabase
        .from("storage_cleanup_queue")
        .insert(
          internalPaths.map(path => ({
            file_path: path,
            restaurant_id: restaurant.id
          }))
        );
      
      if (qError) logger.error("Cleanup Queue DB Error", qError.message);
    }

    logger.db("BATCH SAVE", "--- SUCCESS: ALL DATA PERSISTED ---");
    return true;

  } catch (err: any) {
    logger.error("BATCH SAVE FAILED", err.message || err);
    return false;
  }
}
