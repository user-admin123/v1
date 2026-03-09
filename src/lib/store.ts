import { Category, MenuItem, RestaurantInfo } from "./types";
import { supabase } from "./supabase";
import { logger } from "./logger";

const CATEGORIES_KEY = "qrmenu_categories";
const ITEMS_KEY = "qrmenu_items";
const RESTAURANT_KEY = "qrmenu_restaurant";

function getStored<T>(key: string): T | null {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

function save<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Restaurant
export function getRestaurant(): RestaurantInfo | null {
  return getStored(RESTAURANT_KEY);
}
export function saveRestaurant(info: RestaurantInfo) {
  save(RESTAURANT_KEY, info);
}

// Categories
export function getCategories(): Category[] | null {
  return getStored(CATEGORIES_KEY);
}
export function saveCategories(cats: Category[]) {
  save(CATEGORIES_KEY, cats);
}

// Menu Items
export function getMenuItems(): MenuItem[] | null {
  return getStored(ITEMS_KEY);
}
export function saveMenuItems(items: MenuItem[]) {
  save(ITEMS_KEY, items);
}

// Auth via Supabase Auth
export async function login(email: string, password: string): Promise<boolean> {
  logger.auth("login attempt", { email });
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    logger.error("Login failed:", error.message);
    return false;
  }
  logger.auth("login success", { email });
  return true;
}

export async function logout(): Promise<void> {
  logger.auth("logout");
  await supabase.auth.signOut();
}

export async function isAuthenticated(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  logger.auth("session check", { authenticated: !!session });
  return !!session;
}
