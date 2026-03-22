import { useState, useRef, useCallback, useEffect } from "react";
import { Category, MenuItem, ItemType, RestaurantInfo } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import imageCompression from 'browser-image-compression';
import { supabase } from "@/lib/supabase";
import { deleteStorageFiles } from "@/lib/database";

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
  // --- Core State Management ---
  const [draftCategories, setDraftCategories] = useState<Category[]>(categories);
  const [draftItems, setDraftItems] = useState<MenuItem[]>(items);
  const [draftRestaurant, setDraftRestaurant] = useState<RestaurantInfo>(restaurant);
  const [hasChanges, setHasChanges] = useState(false);
  const [deletedCategoryIds, setDeletedCategoryIds] = useState<string[]>([]);
  const [deletedItemIds, setDeletedItemIds] = useState<string[]>([]);

  // --- Tracking for Bucket Cleanup & Loading States ---
  const [isUploading, setIsUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingDeleteUrls, setPendingDeleteUrls] = useState<string[]>([]);

  // --- Change Detection Logic ---
  useEffect(() => {
    const isRestaurantChanged = JSON.stringify(draftRestaurant) !== JSON.stringify(restaurant);
    const isCategoriesChanged = JSON.stringify(draftCategories) !== JSON.stringify(categories);
    const isItemsChanged = JSON.stringify(draftItems) !== JSON.stringify(items);
    const hasDeletions = deletedCategoryIds.length > 0 || deletedItemIds.length > 0;
    
    setHasChanges(isRestaurantChanged || isCategoriesChanged || isItemsChanged || hasDeletions);
  }, [draftRestaurant, draftCategories, draftItems, restaurant, categories, items, deletedCategoryIds, deletedItemIds]);

  // Prevent accidental navigation with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  // Sync draft with server data when server data updates (only if not currently editing/uploading)
  // FIX: Remove !hasChanges so that once the DB save is done, 
// the hook accepts the fresh data from the server.
useEffect(() => {
  if (!saving && !isUploading) {
    setDraftCategories(categories);
    setDraftItems(items);
    setDraftRestaurant(restaurant);
    setDeletedCategoryIds([]);
    setDeletedItemIds([]);
    setPendingDeleteUrls([]);
  }
}, [categories, items, restaurant, saving, isUploading]);
  
  const markChanged = useCallback(() => setHasChanges(true), []);

  // --- Image Processing & Storage ---
  const uploadToBucket = useCallback(async (file: File, folder: string): Promise<string | null> => {
    setIsUploading(true);
    try {
      const options = { maxSizeMB: 0.2, maxWidthOrHeight: 800, useWebWorker: true, fileType: 'image/webp' };
      const compressedBlob = await imageCompression(file, options);
      
      const fileName = `${folder}/${crypto.randomUUID()}.webp`;
      const { error } = await supabase.storage.from('restaurant-assets').upload(fileName, compressedBlob);
      if (error) throw error;

      return supabase.storage.from('restaurant-assets').getPublicUrl(fileName).data.publicUrl;
    } catch (err) {
      console.error("Upload error:", err);
      toast({ title: "Upload failed", variant: "destructive" });
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  // --- Logo Handlers (for SettingsTab) ---
  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (draftRestaurant.logo_url?.includes('supabase.co')) {
      setPendingDeleteUrls(prev => [...prev, draftRestaurant.logo_url!]);
    }

    const url = await uploadToBucket(file, 'logos');
    if (url) {
      setDraftRestaurant(prev => ({ ...prev, logo_url: url }));
      markChanged();
    }
    e.target.value = "";
  }, [draftRestaurant.logo_url, uploadToBucket, markChanged]);

  const removeLogo = useCallback(() => {
    if (draftRestaurant.logo_url?.includes('supabase.co')) {
      setPendingDeleteUrls(prev => [...prev, draftRestaurant.logo_url!]);
    }
    setDraftRestaurant(prev => ({ ...prev, logo_url: "", show_qr_logo: false }));
    markChanged();
  }, [draftRestaurant.logo_url, markChanged]);

  // --- Menu Item Logic & Form States ---
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [itemForm, setItemForm] = useState({
    name: "", description: "", price: "", category_id: "",
    image_url: "", available: true, item_type: "veg" as ItemType,
  });
  const [imageInputMode, setImageInputMode] = useState<"upload" | "url">("upload");
  const [imageUrlInput, setImageUrlInput] = useState("");

  const resetItemForm = useCallback(() => {
    setItemForm({
      name: "", description: "", price: "",
      category_id: draftCategories[0]?.id || "",
      image_url: "", available: true, item_type: "veg",
    });
    setImageInputMode("upload");
    setImageUrlInput("");
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
    const isExternalUrl = item.image_url && !item.image_url.includes("supabase.co") && item.image_url.startsWith("http");
    setImageInputMode(isExternalUrl ? "url" : "upload");
    setImageUrlInput(isExternalUrl ? item.image_url : "");
    setItemFormOpen(true);
  }, []);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (itemForm.image_url?.includes('supabase.co')) {
      setPendingDeleteUrls(prev => [...prev, itemForm.image_url]);
    }
    const url = await uploadToBucket(file, 'menu-items');
    if (url) setItemForm(prev => ({ ...prev, image_url: url }));
    e.target.value = "";
  }, [itemForm.image_url, uploadToBucket]);

  const handleImageUrlApply = useCallback(() => {
    if (imageUrlInput.trim()) {
      if (itemForm.image_url?.includes('supabase.co')) {
        setPendingDeleteUrls(prev => [...prev, itemForm.image_url]);
      }
      setItemForm(prev => ({ ...prev, image_url: imageUrlInput.trim() }));
    }
  }, [imageUrlInput, itemForm.image_url]);

  const saveItem = useCallback(() => {
    const price = parseFloat(itemForm.price);
    if (!itemForm.name.trim() || isNaN(price) || !itemForm.category_id) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    if (editingItem) {
      const updated: MenuItem = { ...editingItem, ...itemForm, price, updated_at: new Date().toISOString() };
      setDraftItems(prev => prev.map(i => (i.id === editingItem.id ? updated : i)));
    } else {
      const newItem: MenuItem = {
        id: crypto.randomUUID(), ...itemForm, restaurant_id: draftRestaurant.id, price,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setDraftItems(prev => [...prev, newItem]);
    }
    setItemFormOpen(false);
  }, [itemForm, editingItem, draftRestaurant.id]);

  const deleteItem = useCallback((id: string) => {
    setDeletedItemIds(prev => [...prev, id]);
    setDraftItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const toggleAvailability = useCallback((id: string) => {
    setDraftItems(prev => prev.map(i => 
      i.id === id ? { ...i, available: !i.available, updated_at: new Date().toISOString() } : i
    ));
  }, []);

  // --- Category Logic ---
  const [catName, setCatName] = useState("");
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  const addCategory = useCallback(() => {
    if (!catName.trim()) return;
    const newCat: Category = {
      id: crypto.randomUUID(), name: catName.trim(), order_index: draftCategories.length,
      restaurant_id: draftRestaurant.id, created_at: new Date().toISOString(),
    };
    setDraftCategories(prev => [...prev, newCat]);
    setCatName("");
  }, [catName, draftCategories.length, draftRestaurant.id]);

  const deleteCategory = useCallback((id: string) => {
    setDeletedItemIds(prev => [...prev, ...draftItems.filter(i => i.category_id === id).map(i => i.id)]);
    setDeletedCategoryIds(prev => [...prev, id]);
    setDraftCategories(prev => prev.filter(c => c.id !== id));
    setDraftItems(prev => prev.filter(i => i.category_id !== id));
  }, [draftItems]);

  const saveEditCat = useCallback(() => {
    if (!editingCat) return;
    setDraftCategories(prev => prev.map(c => (c.id === editingCat.id ? editingCat : c)));
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
    dragItem.current = null; dragOverItem.current = null;
    setDraftCategories(reindexed);
  };

  // --- Save All & Final Cleanup ---
  const saveAllChanges = useCallback(async () => {
  setSaving(true);
  try {
    // Capture images of items marked for deletion BEFORE calling the DB
    const itemImagesToDelete = items
      .filter(i => deletedItemIds.includes(i.id))
      .map(i => i.image_url);

    // Call the middleman's onSaveAll prop
    const success = await onSaveAll(
      draftCategories, 
      draftItems, 
      draftRestaurant, 
      deletedCategoryIds, 
      deletedItemIds
    );

    if (success) {
      // 1. Physically delete files from bucket (Logos + Deleted Items)
      const totalCleanupList = [...pendingDeleteUrls, ...itemImagesToDelete];
      await deleteStorageFiles(totalCleanupList);

      // 2. Reset tracking states (This hides the "Update" button)
      setHasChanges(false);
      setDeletedCategoryIds([]);
      setDeletedItemIds([]);
      setPendingDeleteUrls([]);

      // 3. Success Toast
      toast({ 
        title: "Changes Published", 
        description: "Menu and images updated successfully." 
      });
    } else {
      // If DB function returned false
      toast({ title: "Sync Interrupted", variant: "destructive" });
    }
  } catch (err) {
    toast({ title: "Critical Error", description: "Check your connection", variant: "destructive" });
  } finally {
    setSaving(false);
  }
}, [draftCategories, draftItems, draftRestaurant, deletedCategoryIds, deletedItemIds, items, pendingDeleteUrls, onSaveAll]);
  
  // --- Delete Modal State ---
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "category" | "item"; id: string; name: string; } | null>(null);
  const handleConfirmDelete = useCallback(() => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === "category") deleteCategory(deleteConfirm.id);
    else deleteItem(deleteConfirm.id);
    setDeleteConfirm(null);
  }, [deleteConfirm, deleteCategory, deleteItem]);

  return {
    draftCategories, draftItems, draftRestaurant, setDraftRestaurant,
    hasChanges, markChanged, catName, setCatName, editingCat, setEditingCat,
    editingItem, itemFormOpen, setItemFormOpen, itemForm, setItemForm,
    imageInputMode, setImageInputMode, imageUrlInput, setImageUrlInput,
    isUploading, saving, deleteConfirm, setDeleteConfirm,
    addCategory, saveEditCat, openNewItem, openEditItem, saveItem, deleteItem,
    toggleAvailability, handleImageUpload, handleImageUrlApply,
    handleLogoUpload, removeLogo, saveAllChanges,
    handleDragStart, handleDragEnter, handleDragEnd, handleConfirmDelete
  };
}
