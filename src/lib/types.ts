export interface Category {
  id: string;
  name: string;
  order_index: number;
  restaurant_id: string; 
  created_at: string;
}

export type ItemType = "veg" | "nonveg";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  available: boolean;
  image_url: string;
  category_id: string;
  restaurant_id: string; 
  item_type: ItemType;
  created_at: string;
  updated_at: string;
}

export interface RestaurantInfo {
  id: string;
  name: string;
  tagline: string;
  logo_url: string;
  show_veg_filter?: boolean;
  show_sold_out?: boolean;
  show_search?: boolean;
  show_qr_logo?: boolean;
}
