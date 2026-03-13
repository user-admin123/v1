import { supabase } from "./supabase";
import { Category, MenuItem, RestaurantInfo } from "./types";
import {
  saveCategories as saveLocalCategories,
  saveMenuItems as saveLocalItems,
  saveRestaurant as saveLocalRestaurant,
} from "./store";
import { logger } from "./logger";

// ---------- Fetch helpers (Supabase primary, localStorage cache) ----------

export async function fetchCategories(): Promise<Category[]> {
  logger.db("SELECT", "categories", "fetching all ordered by order_index");
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("order_index", { ascending: true });

  if (error) {
    logger.error("fetchCategories failed:", error.message, error);
    throw error;
  }
  const cats = (data || []) as Category[];
  logger.db("SELECT", "categories", `got ${cats.length} rows`);
  saveLocalCategories(cats);
  return cats;
}

export async function fetchMenuItems(): Promise<MenuItem[]> {
  logger.db("SELECT", "menu_items", "fetching all");
  const { data, error } = await supabase.from("menu_items").select("*");

  if (error) {
    logger.error("fetchMenuItems failed:", error.message, error);
    throw error;
  }
  const items = (data || []) as MenuItem[];
  logger.db("SELECT", "menu_items", `got ${items.length} rows`);
  saveLocalItems(items);
  return items;
}

export async function fetchRestaurant(): Promise<RestaurantInfo> {
  logger.db("SELECT", "restaurant", "fetching first row with .limit(1)");
  
  const { data, error } = await supabase
    .from("restaurant")
    .select("*")
    .limit(1);

  if (error) {
    logger.error("fetchRestaurant failed:", error.message, error);
    throw error;
  }

  if (data && data.length > 0) {
    const rest = data[0] as RestaurantInfo;
    logger.db("SELECT", "restaurant", `got row: ${rest.name} (ID: ${rest.id})`);
    saveLocalRestaurant(rest);
    return rest;
  }

  logger.warn("No restaurant row found, returning blank");
  // If no ID exists, the Doorbell in useMenuData will simply stay quiet (correct behavior)
  return { name: "", tagline: "", logo_url: "" };
}

// ---------- Save helpers ----------

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

// ---------- Delete helpers ----------

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

// ---------- Batch save ----------

export async function saveAllChanges(
  categories: Category[],
  items: MenuItem[],
  restaurant: RestaurantInfo,
  deletedCategoryIds: string[] = [],
  deletedItemIds: string[] = []
): Promise<boolean> {
  logger.db("BATCH SAVE", "all tables", `cats=${categories.length}, items=${items.length}, delCats=${deletedCategoryIds.length}, delItems=${deletedItemIds.length}`);
  saveLocalCategories(categories);
  saveLocalItems(items);
  saveLocalRestaurant(restaurant);

  try {
    // 1. Delete items first (including items from deleted categories)
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

    // 3. Upsert remaining data
    const [catRes, itemRes, restRes] = await Promise.all([
      categories.length > 0
        ? supabase.from("categories").upsert(categories, { onConflict: "id" })
        : { error: null },
      items.length > 0
        ? supabase.from("menu_items").upsert(items, { onConflict: "id" })
        : { error: null },
      supabase.from("restaurant").upsert(restaurant),
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
