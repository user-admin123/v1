import { useState, useRef, useCallback, useEffect } from "react";
import { Category, MenuItem, ItemType, RestaurantInfo } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import imageCompression from 'browser-image-compression';

interface UseAdminStateProps {
  categories: Category[];
  items: MenuItem[];
  restaurant: RestaurantInfo;
  onSaveAll: (
    cats: Category[],
    items: MenuItem[],
    rest: RestaurantInfo,
    deletedCatIds: string[],
    deletedItemIds: string[],
    pendingDeleteUrls: string[]
  ) => Promise<boolean>;
}

export function useAdminState({ categories, items, restaurant, onSaveAll }: UseAdminStateProps) {
  // --- Core State Management ---
  const [draftCategories, setDraftCategories] = useState<Category[]>(categories);
  const [draftItems, setDraftItems] = useState<MenuItem[]>(items);
  const [draftRestaurant, setDraftRestaurant] = useState<RestaurantInfo>(restaurant);
  const [hasChanges, setHasChanges] = useState(false);
  const [deletedCategoryIds, setDeletedCategoryIds] = useState<string[]>([]);
  const [deletedItemIds, setDeletedItemIds] = useState<string[]>([]);
  
  // Storage Cleanup Tracker
  const [pendingDeleteUrls, setPendingDeleteUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // --- Change Tracking Logic ---

  useEffect(() => {
    const isRestaurantChanged = JSON.stringify(draftRestaurant) !== JSON.stringify(restaurant);
    const isCategoriesChanged = JSON.stringify(draftCategories) !== JSON.stringify(categories);
    const isItemsChanged = JSON.stringify(draftItems) !== JSON.stringify(items);
    const hasDeletions = deletedCategoryIds.length > 0 || deletedItemIds.length > 0;

    setHasChanges(isRestaurantChanged || isCategoriesChanged || isItemsChanged || hasDeletions);
  }, [draftRestaurant, draftCategories, draftItems, restaurant, categories, items, deletedCategoryIds, deletedItemIds]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  // Sync internal state when parent props change (e.g., after a successful save)
  useEffect(() => {
    setDraftCategories(categories);
    setDraftItems(items);
    setDraftRestaurant(restaurant);
    setDeletedCategoryIds([]);
    setDeletedItemIds([]);
    setPendingDeleteUrls([]);
  }, [categories, items, restaurant]);

  // --- Image Handling Logic ---
const onUrlChange = useCallback((newUrl: string, currentUrl: string, setter: (url: string) => void) => {
  // 1. If we are replacing/removing a Supabase image, track it for deletion
  if (currentUrl && currentUrl !== newUrl) {
    setPendingDeleteUrls(prev => [...prev, currentUrl]);
  }

  // 2. Update the state (setter will be setDraftRestaurant or setItemForm)
  setter(newUrl);
  setHasChanges(true);
}, []);
  
  const uploadToBucket = useCallback(async (file: File, type: 'logo' | 'item', name: string): Promise<string | null> => {
    setIsUploading(true);
    try {
      const options = { maxSizeMB: 0.2, maxWidthOrHeight: 1024, useWebWorker: true, fileType: 'image/webp' };
      const compressedFile = await imageCompression(file, options);
      
      const safeName = (name || 'unnamed').toLowerCase().replace(/[^a-z0-9]/g, '-');
      const fileName = `images/${type}-${safeName}-${crypto.randomUUID().slice(0, 8)}.webp`;

      const { error } = await supabase.storage.from('restaurant-assets').upload(fileName, compressedFile);
      if (error) throw error;

      const { data } = supabase.storage.from('restaurant-assets').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (err) {
      logger.error("Upload failed", err);
      toast({ title: "Upload failed", variant: "destructive" });
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const onFileSelect = useCallback(async (
    file: File, 
    type: 'logo' | 'item', 
    currentUrl: string, 
    name: string, 
    setter: (url: string) => void
  ) => {
    // If we're replacing an existing Supabase image, track it for deletion
    if (currentUrl?.includes('supabase.co')) {
      setPendingDeleteUrls(prev => [...prev, currentUrl]);
    }
    const url = await uploadToBucket(file, type, name);
    if (url) {
      setter(url);
      setHasChanges(true);
    }
  }, [uploadToBucket]);

  // Manual change marker for UI components
  const markChanged = useCallback(() => setHasChanges(true), []);

  // --- Category CRUD Logic ---
  const [catName, setCatName] = useState("");
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  const addCategory = useCallback(() => {
    if (!catName.trim()) return;
    const newCat: Category = {
      id: crypto.randomUUID(),
      name: catName.trim(),
      order_index: draftCategories.length,
      restaurant_id: draftRestaurant.id,
      created_at: new Date().toISOString(),
    };
    setDraftCategories((prev) => [...prev, newCat]);
    setCatName("");
  }, [catName, draftCategories.length, draftRestaurant.id]);

  const deleteCategory = useCallback((id: string) => {
  // 1. Identify all items belonging to this category
  const itemsInCat = draftItems.filter((i) => i.category_id === id);
  
  // 2. Extract all URLs from those items
  const imagesToDelete = itemsInCat
    .map(i => i.image_url)
    .filter(Boolean) as string[];

  // 3. Queue them for cleanup and remove the items/category from state
  setPendingDeleteUrls(prev => [...prev, ...imagesToDelete]);
  setDeletedItemIds((prev) => [...prev, ...itemsInCat.map((i) => i.id)]);
  setDeletedCategoryIds((prev) => [...prev, id]);
  
  setDraftCategories((prev) => prev.filter((c) => c.id !== id));
  setDraftItems((prev) => prev.filter((i) => i.category_id !== id));
}, [draftItems]);

  const saveEditCat = useCallback(() => {
    if (!editingCat) return;
    setDraftCategories((prev) =>
      prev.map((c) => (c.id === editingCat.id ? editingCat : c))
    );
    setEditingCat(null);
  }, [editingCat]);

  // --- Drag & Drop ---
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleDragStart = (index: number) => { dragItem.current = index; };
  const handleDragEnter = (index: number) => { dragOverItem.current = index; };
  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const updated = [...draftCategories];
    const dragged = updated[dragItem.current];
    updated.splice(dragItem.current, 1);
    updated.splice(dragOverItem.current, 0, dragged);
    const reindexed = updated.map((c, i) => ({ ...c, order_index: i }));
    dragItem.current = null;
    dragOverItem.current = null;
    setDraftCategories(reindexed);
  };

  // --- Menu Item CRUD Logic ---
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [itemForm, setItemForm] = useState({
    name: "", description: "", price: "", category_id: "",
    image_url: "", available: true, item_type: "veg" as ItemType,
  });

  const resetItemForm = useCallback(() => {
    setItemForm({
      name: "", description: "", price: "",
      category_id: draftCategories[0]?.id || "",
      image_url: "", available: true, item_type: "veg",
    });
  }, [draftCategories]);

  const openNewItem = useCallback(() => {
    resetItemForm();
    setEditingItem(null);
    setItemFormOpen(true);
  }, [resetItemForm]);

  const openEditItem = useCallback((item: MenuItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name, description: item.description,
      price: String(item.price), category_id: item.category_id,
      image_url: item.image_url, available: item.available,
      item_type: item.item_type || "veg",
    });
    setItemFormOpen(true);
  }, []);

  const saveItem = useCallback(() => {
    const price = parseFloat(itemForm.price);
    if (!itemForm.name.trim() || isNaN(price) || !itemForm.category_id) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    if (editingItem) {
      const updated: MenuItem = { ...editingItem, ...itemForm, price, updated_at: new Date().toISOString() };
      setDraftItems((prev) => prev.map((i) => (i.id === editingItem.id ? updated : i)));
    } else {
      const newItem: MenuItem = {
        id: crypto.randomUUID(), ...itemForm, restaurant_id: draftRestaurant.id, price,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setDraftItems((prev) => [...prev, newItem]);
    }
    setItemFormOpen(false);
  }, [itemForm, editingItem, draftRestaurant.id]);

  const deleteItem = useCallback((id: string) => {
  const item = draftItems.find(i => i.id === id);
  
  if (item?.image_url) {
    setPendingDeleteUrls(prev => [...prev, item.image_url]);
  }
  
  setDeletedItemIds((prev) => [...prev, id]);
  setDraftItems((prev) => prev.filter((i) => i.id !== id));
}, [draftItems]);

  const toggleAvailability = useCallback((id: string) => {
    setDraftItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, available: !i.available, updated_at: new Date().toISOString() } : i
      )
    );
  }, []);

  // --- Save Operations ---

  const saveAllChanges = useCallback(async () => {
  setSaving(true);
  try {
    const finalCleanupList = [...new Set(pendingDeleteUrls)];

    const success = await onSaveAll(
      draftCategories, 
      draftItems, 
      draftRestaurant, 
      deletedCategoryIds, 
      deletedItemIds,
      finalCleanupList
    );

    if (success) {
      // CRITICAL: Reset everything locally immediately
      setDeletedCategoryIds([]);
      setDeletedItemIds([]);
      setPendingDeleteUrls([]);
      setHasChanges(false); // Force the button to hide immediately
      toast({ title: "Success", description: "Changes synced." });
    }
  } finally {
    setSaving(false);
  }
}, [draftCategories, draftItems, draftRestaurant, deletedCategoryIds, deletedItemIds, pendingDeleteUrls, onSaveAll]);
  
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "category" | "item"; id: string; name: string;
  } | null>(null);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === "category") deleteCategory(deleteConfirm.id);
    else deleteItem(deleteConfirm.id);
    setDeleteConfirm(null);
  }, [deleteConfirm, deleteCategory, deleteItem]);

  return {
    // State
    draftCategories, draftItems, draftRestaurant,
    setDraftRestaurant, hasChanges,
    catName, setCatName, editingCat, setEditingCat,
    editingItem, itemFormOpen, setItemFormOpen, itemForm, setItemForm,
    isUploading, saving, deleteConfirm, setDeleteConfirm,

    // Handlers
    addCategory, saveEditCat,
    handleDragStart, handleDragEnter, handleDragEnd,
    openNewItem, openEditItem, saveItem, toggleAvailability,
    onFileSelect, onUrlChange, markChanged,
    saveAllChanges, handleConfirmDelete,
    setPendingDeleteUrls 
  };
}
