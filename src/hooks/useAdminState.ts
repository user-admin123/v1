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
  // --- Core State ---
  const [draftCategories, setDraftCategories] = useState<Category[]>(categories);
  const [draftItems, setDraftItems] = useState<MenuItem[]>(items);
  const [draftRestaurant, setDraftRestaurant] = useState<RestaurantInfo>(restaurant);
  const [hasChanges, setHasChanges] = useState(false);
  const [deletedCategoryIds, setDeletedCategoryIds] = useState<string[]>([]);
  const [deletedItemIds, setDeletedItemIds] = useState<string[]>([]);
  
  // Storage Cleanup Tracker (The "Delete Queue")
  const [pendingDeleteUrls, setPendingDeleteUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // --- Internal Helper: Is this our Bucket Image? ---
  const isInternalBucketUrl = (url: string | null | undefined): boolean => {
    if (!url) return false;
    // Checks if the URL belongs to your Supabase project's specific bucket
    return url.includes('supabase.co') && url.includes('restaurant-assets');
  };

  // --- 1. Effect: Debug Monitor ---
  useEffect(() => {
    if (pendingDeleteUrls.length > 0) {
      console.log("🔍 [QUEUE CHECK]: Current URLs marked for deletion:", pendingDeleteUrls);
    }
  }, [pendingDeleteUrls]);

  // --- 2. Effect: Global Change Tracker ---
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

  // --- 3. Image Upload Logic ---
  const uploadToBucket = useCallback(async (file: File, type: 'logo' | 'item', name: string): Promise<string | null> => {
    setIsUploading(true);
    console.log(`📤 Starting upload for ${type}: ${name}`);
    try {
      const options = { maxSizeMB: 0.2, maxWidthOrHeight: 1024, useWebWorker: true, fileType: 'image/webp' };
      const compressedFile = await imageCompression(file, options);
      
      const safeName = (name || 'unnamed').toLowerCase().replace(/[^a-z0-9]/g, '-');
      const fileName = `images/${type}/${safeName}-${Date.now()}.webp`;

      const { error } = await supabase.storage.from('restaurant-assets').upload(fileName, compressedFile);
      if (error) throw error;

      const { data } = supabase.storage.from('restaurant-assets').getPublicUrl(fileName);
      console.log("✅ Upload Successful. New URL:", data.publicUrl);
      return data.publicUrl;
    } catch (err) {
      logger.error("Upload failed", err);
      toast({ title: "Upload failed", variant: "destructive" });
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  // --- 4. Image Handlers (Direct URL vs File) ---

  // For Logo or Item - Handles "Change to another Direct URL" or "Clear Image"
  const onUrlChange = useCallback((newUrl: string, currentUrl: string, setter: (url: string) => void) => {
    if (isInternalBucketUrl(currentUrl) && currentUrl !== newUrl) {
      console.log("🗑️ URL Changed/Cleared: Queuing old bucket image for removal", currentUrl);
      setPendingDeleteUrls(prev => [...new Set([...prev, currentUrl])]);
    }
    setter(newUrl);
    setHasChanges(true);
  }, []);

  // For Logo or Item - Handles "Upload new file"
  const onFileSelect = useCallback(async (
    file: File, 
    type: 'logo' | 'item', 
    currentUrl: string, 
    name: string, 
    setter: (url: string) => void
  ) => {
    const url = await uploadToBucket(file, type, name);
    if (url) {
      if (isInternalBucketUrl(currentUrl)) {
        console.log("🗑️ Replacement: Queuing old bucket image for removal", currentUrl);
        setPendingDeleteUrls(prev => [...new Set([...prev, currentUrl])]);
      }
      setter(url);
      setHasChanges(true);
    }
  }, [uploadToBucket]);

  // --- 5. Category CRUD ---
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
    const itemsInCat = draftItems.filter((i) => i.category_id === id);
    
    // Find all images in this category that belong to the bucket
    const bucketImages = itemsInCat
      .map(i => i.image_url)
      .filter(url => isInternalBucketUrl(url)) as string[];
      
    if (bucketImages.length > 0) {
      console.log(`🗑️ Category Delete: Queuing ${bucketImages.length} images`, bucketImages);
      setPendingDeleteUrls(prev => [...new Set([...prev, ...bucketImages])]);
    }

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

  // --- 6. Drag & Drop ---
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

  // --- 7. Menu Item CRUD ---
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
      // Logic: If user changed the URL in the form (either via File upload or Manual Text)
      // we must ensure the "Original" image from the item is queued if it was a bucket image.
      if (isInternalBucketUrl(editingItem.image_url) && editingItem.image_url !== itemForm.image_url) {
        console.log("🗑️ Item Save: Image changed, queuing original bucket URL", editingItem.image_url);
        setPendingDeleteUrls(prev => [...new Set([...prev, editingItem.image_url])]);
      }

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
    if (item && isInternalBucketUrl(item.image_url)) {
      console.log("🗑️ Item Delete: Queuing bucket image", item.image_url);
      setPendingDeleteUrls(prev => [...new Set([...prev, item.image_url])]);
    }
    setDeletedItemIds((prev) => [...prev, id]);
    setDraftItems((prev) => prev.filter((i) => i.id !== id));
  }, [draftItems]);

  const toggleAvailability = useCallback((id: string) => {
    setDraftItems((prev) => prev.map((i) => i.id === id ? { ...i, available: !i.available, updated_at: new Date().toISOString() } : i));
  }, []);

  // --- 8. Final Save All ---
  const saveAllChanges = useCallback(async () => {
  const cleanupQueue = [...new Set(pendingDeleteUrls)];
  
  // LOG 3: Verify what the hook is sending
  console.log("🚀 HOOK TRIGGERING SAVE WITH CLEANUP:", cleanupQueue);

  setSaving(true);
  try {
    const success = await onSaveAll(
      draftCategories, 
      draftItems, 
      draftRestaurant, 
      deletedCategoryIds, 
      deletedItemIds,
      cleanupQueue // Passing the 6th argument
    );

    if (success) {
      // Reset all tracking states only on success
      setDeletedCategoryIds([]);
      setDeletedItemIds([]);
      setPendingDeleteUrls([]);
      setHasChanges(false);
      toast({ title: "Save Complete", description: "Changes persisted and old assets queued for deletion." });
    }
  } catch (err) {
    console.error("❌ Save Transaction Failed", err);
    toast({ title: "Save Failed", variant: "destructive" });
  } finally {
    setSaving(false);
  }
}, [draftCategories, draftItems, draftRestaurant, deletedCategoryIds, deletedItemIds, pendingDeleteUrls, onSaveAll]);
  // --- Delete Modal Helpers ---
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
    openNewItem: () => { setItemFormOpen(true); setEditingItem(null); setItemForm({ name: "", description: "", price: "", category_id: draftCategories[0]?.id || "", image_url: "", available: true, item_type: "veg" }); },
    openEditItem: (item: MenuItem) => { setEditingItem(item); setItemForm({ ...item, price: String(item.price) }); setItemFormOpen(true); },
    saveItem, toggleAvailability, onFileSelect, onUrlChange, 
    saveAllChanges, handleConfirmDelete, markChanged: () => setHasChanges(true)
  };
}
