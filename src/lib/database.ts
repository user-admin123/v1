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

  // Explicitly selecting only columns that exist in the table
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
    .eq("res_id", restaurantId)
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
  
  // Strip out any UI-only fields if they exist
  const cleanCats = cats.map(cat => ({
    id: cat.id,
    name: cat.name,
    order_index: cat.order_index,
    restaurant_id: cat.restaurant_id
  }));

  const { error } = await supabase.from("categories").upsert(cleanCats, { onConflict: "id" });
  if (error) {
    logger.error("saveCategories failed:", error.message, error);
    throw error;
  }
  logger.db("UPSERT", "categories", "success");
}

export async function saveMenuItems(items: MenuItem[]): Promise<void> {
  logger.db("UPSERT", "menu_items", `saving ${items.length} rows`);
  saveLocalItems(items);

  // Strip out any non-DB fields (like calculated quantities)
  const cleanItems = items.map(item => ({
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    available: item.available,
    image_url: item.image_url,
    category_id: item.category_id,
    restaurant_id: item.restaurant_id,
    item_type: item.item_type
  }));

  const { error } = await supabase.from("menu_items").upsert(cleanItems, { onConflict: "id" });
  if (error) {
    logger.error("saveMenuItems failed:", error.message, error);
    throw error;
  }
  logger.db("UPSERT", "menu_items", "success");
}

export async function saveRestaurant(info: RestaurantInfo): Promise<void> {
  logger.db("UPSERT", "restaurant", "Cleaning payload for save...");
  
  // CRITICAL: Filter out any fields not in the restaurant table
  const cleanInfo = {
    id: info.id,
    name: info.name,
    tagline: info.tagline || "",
    logo_url: info.logo_url || "",
    show_veg_filter: info.show_veg_filter ?? false,
    show_sold_out: info.show_sold_out ?? true,
    show_search: info.show_search ?? false,
    show_qr_logo: info.show_qr_logo ?? false
  };

  saveLocalRestaurant(info);
  const { error } = await supabase.from("restaurant").upsert(cleanInfo, { onConflict: 'id' });
  
  if (error) {
    logger.error("saveRestaurant failed:", error.message, error);
    throw error;
  }
  logger.db("UPSERT", "restaurant", "success");
}

// -----------------------------------------------------------------------------
// STANDALONE DELETE HELPERS
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
      if (error) throw error;
    }
    
    if (deletedCategoryIds.length > 0) {
      const { error } = await supabase.from("categories").delete().in("id", deletedCategoryIds);
      if (error) throw error;
    }

    // 2. Execute Upsert: Restaurant (CLEAN PAYLOAD)
    const cleanRestaurant = {
      id: restaurant.id,
      name: restaurant.name,
      tagline: restaurant.tagline || "",
      logo_url: restaurant.logo_url || "",
      show_veg_filter: restaurant.show_veg_filter ?? false,
      show_sold_out: restaurant.show_sold_out ?? true,
      show_search: restaurant.show_search ?? false,
      show_qr_logo: restaurant.show_qr_logo ?? false
    };

    const { error: restError } = await supabase.from("restaurant").upsert(cleanRestaurant, { onConflict: 'id' });
    if (restError) throw restError;

    // 3. Execute Upsert: Categories
    if (activeCategories.length > 0) {
      const cleanCats = activeCategories.map(c => ({
        id: c.id,
        name: c.name,
        order_index: c.order_index,
        restaurant_id: c.restaurant_id
      }));
      const { error: catError } = await supabase.from("categories").upsert(cleanCats, { onConflict: 'id' });
      if (catError) throw catError;
    }

    // 4. Execute Upsert: Items
    if (activeItems.length > 0) {
      const cleanItems = activeItems.map(i => ({
        id: i.id,
        name: i.name,
        description: i.description,
        price: i.price,
        available: i.available,
        image_url: i.image_url,
        category_id: i.category_id,
        restaurant_id: i.restaurant_id,
        item_type: i.item_type
      }));
      const { error: itemError } = await supabase.from("menu_items").upsert(cleanItems, { onConflict: 'id' });
      if (itemError) throw itemError;
    }

    logger.db("BATCH SAVE", "--- SUCCESS: ALL DATA PERSISTED ---", "success");
    return true;

  } catch (err: any) {
    logger.error("BATCH SAVE FAILED", err.message || err);
    return false;
  }
}
