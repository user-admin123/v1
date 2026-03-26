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
    deletedItemIds: string[]
  ) => Promise<boolean>;
}

export function useAdminState({ categories, items, restaurant, onSaveAll }: UseAdminStateProps) {
  // --- Core State ---
  const [draftCategories, setDraftCategories] = useState<Category[]>(categories);
  const [draftItems, setDraftItems] = useState<MenuItem[]>(items);
  const [draftRestaurant, setDraftRestaurant] = useState<RestaurantInfo>(restaurant);
  const [hasChanges, setHasChanges] = useState(false);
  const [deletedCategoryIds, setDeletedCategoryIds] = useState<string[]>([]);
  const [deletedItemIds, setDeletedItemIds] = useState<string[]>([]);
  
  const [isUploading, setIsUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // --- 1. Effect: Global Change Tracker ---
  useEffect(() => {
    const isRestaurantChanged = JSON.stringify(draftRestaurant) !== JSON.stringify(restaurant);
    const isCategoriesChanged = JSON.stringify(draftCategories) !== JSON.stringify(categories);
    const isItemsChanged = JSON.stringify(draftItems) !== JSON.stringify(items);
    const hasDeletions = deletedCategoryIds.length > 0 || deletedItemIds.length > 0;

    setHasChanges(isRestaurantChanged || isCategoriesChanged || isItemsChanged || hasDeletions);
  }, [draftRestaurant, draftCategories, draftItems, restaurant, categories, items, deletedCategoryIds, deletedItemIds]);

  // Prevent accidental tab close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  // Sync props to state on load
  useEffect(() => {
    setDraftCategories(categories);
    setDraftItems(items);
    setDraftRestaurant(restaurant);
  }, [categories, items, restaurant]);

  // --- 2. Image Upload Logic ---
  const uploadToBucket = useCallback(async (file: File, type: 'logo' | 'item', name: string): Promise<string | null> => {
    setIsUploading(true);
    logger.db("UPLOAD", `Starting upload for ${type}: ${name}`);
    
    try {
      const options = { maxSizeMB: 0.2, maxWidthOrHeight: 1024, useWebWorker: true, fileType: 'image/webp' };
      const compressedFile = await imageCompression(file, options);
      
      const safeName = (name || 'unnamed').toLowerCase().replace(/[^a-z0-9]/g, '-');
      const fileName = `images/${safeName}-${Date.now()}.webp`;

      const { error } = await supabase.storage.from('restaurant-assets').upload(fileName, compressedFile);
      if (error) throw error;

      const { data } = supabase.storage.from('restaurant-assets').getPublicUrl(fileName);
      logger.db("UPLOAD", `Success. New URL: ${data.publicUrl}`);
      return data.publicUrl;
    } catch (err) {
      logger.error("Upload failed", err);
      toast({ title: "Upload failed", variant: "destructive" });
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  // For Logo or Item - Handles "Change to another Direct URL" or "Clear Image"
  const onUrlChange = useCallback((newUrl: string, setter: (url: string) => void) => {
    setter(newUrl);
    setHasChanges(true);
  }, []);

  // For Logo or Item - Handles "Upload new file"
  const onFileSelect = useCallback(async (
    file: File, 
    type: 'logo' | 'item', 
    name: string, 
    setter: (url: string) => void
  ) => {
    const url = await uploadToBucket(file, type, name);
    if (url) {
      setter(url);
      setHasChanges(true);
    }
  }, [uploadToBucket]);

  // --- 3. Category CRUD ---
  const [catName, setCatName] = useState("");
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  const addCategory = useCallback(() => {
    if (!catName.trim()) return;
    const newCat: Category = {
      id: crypto.randomUUID(),
      name: catName.trim(),
      order_index: draftCategories.length,
      restaurant_id: draftRestaurant.id,
    };
    setDraftCategories((prev) => [...prev, newCat]);
    setCatName("");
  }, [catName, draftCategories.length, draftRestaurant.id]);

  const deleteCategory = useCallback((id: string) => {
    const itemsInCat = draftItems.filter((i) => i.category_id === id);
    setDeletedItemIds((prev) => [...prev, ...itemsInCat.map((i) => i.id)]);
    setDeletedCategoryIds((prev) => [...prev, id]);
    setDraftCategories((prev) => prev.filter((c) => c.id !== id));
    setDraftItems((prev) => prev.filter((i) => i.category_id !== id));
  }, [draftItems]);

  const saveEditCat = useCallback(() => {
    if (!editingCat) return;
    setDraftCategories((prev) => prev.map((c) => (c.id === editingCat.id ? editingCat : c)));
    setEditingCat(null);
  }, [editingCat]);

  // --- 4. Drag & Drop ---
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

  // --- 5. Menu Item CRUD ---
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [itemForm, setItemForm] = useState({
    name: "", description: "", price: "", category_id: "",
    image_url: "", available: true, item_type: "veg" as ItemType,
  });

  const saveItem = useCallback(() => {
    const price = parseFloat(itemForm.price);
    if (!itemForm.name.trim() || isNaN(price) || !itemForm.category_id) return;

    if (editingItem) {
      const updated: MenuItem = { ...editingItem, ...itemForm, price };
      setDraftItems((prev) => prev.map((i) => (i.id === editingItem.id ? updated : i)));
    } else {
      const newItem: MenuItem = {
        id: crypto.randomUUID(), ...itemForm, restaurant_id: draftRestaurant.id, price,
      };
      setDraftItems((prev) => [...prev, newItem]);
    }
    setItemFormOpen(false);
  }, [itemForm, editingItem, draftRestaurant.id]);

  const deleteItem = useCallback((id: string) => {
    setDeletedItemIds((prev) => [...prev, id]);
    setDraftItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const toggleAvailability = useCallback((id: string) => {
    setDraftItems((prev) => prev.map((i) => i.id === id ? { ...i, available: !i.available } : i));
  }, []);

  // --- 6. Final Save All ---
  const saveAllChanges = useCallback(async () => {
    logger.db("BATCH SAVE", "Hook triggering save transaction");
    setSaving(true);
    
    try {
      const success = await onSaveAll(
        draftCategories, 
        draftItems, 
        draftRestaurant, 
        deletedCategoryIds, 
        deletedItemIds
      );

      if (success) {
        setDeletedCategoryIds([]);
        setDeletedItemIds([]);
        setHasChanges(false);
        toast({ title: "Save Complete", description: "All changes have been successfully persisted." });
      }
    } catch (err) {
      logger.error("Save Transaction Failed", err);
      toast({ title: "Save Failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [draftCategories, draftItems, draftRestaurant, deletedCategoryIds, deletedItemIds, onSaveAll]);

  // --- 7. Delete Modal Helpers ---
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "category" | "item"; id: string; name: string; } | null>(null);
  const handleConfirmDelete = useCallback(() => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === "category") deleteCategory(deleteConfirm.id);
    else deleteItem(deleteConfirm.id);
    setDeleteConfirm(null);
  }, [deleteConfirm, deleteCategory, deleteItem]);

  return {
    draftCategories, draftItems, draftRestaurant, setDraftRestaurant,
    hasChanges, catName, setCatName, editingCat, setEditingCat,
    editingItem, itemFormOpen, setItemFormOpen, itemForm, setItemForm,
    isUploading, saving, deleteConfirm, setDeleteConfirm,
    addCategory, saveEditCat,
    handleDragStart, handleDragEnter, handleDragEnd,
    openNewItem: () => { 
      setItemFormOpen(true); 
      setEditingItem(null); 
      setItemForm({ name: "", description: "", price: "", category_id: draftCategories[0]?.id || "", image_url: "", available: true, item_type: "veg" }); 
    },
    openEditItem: (item: MenuItem) => { 
      setEditingItem(item); 
      setItemForm({ ...item, price: String(item.price) }); 
      setItemFormOpen(true); 
    },
    saveItem, toggleAvailability, onFileSelect, onUrlChange, 
    saveAllChanges, handleConfirmDelete, markChanged: () => setHasChanges(true)
  };
}
