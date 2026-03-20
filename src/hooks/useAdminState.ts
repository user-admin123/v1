import { useState, useRef, useCallback, useEffect } from "react";
import { Category, MenuItem, ItemType, RestaurantInfo } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import imageCompression from 'browser-image-compression';
import { supabase } from "@/lib/supabase"; // Ensure this is imported

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

  // NEW: Tracking for Bucket Cleanup
  const [isUploading, setIsUploading] = useState(false);
  const [pendingDeleteUrls, setPendingDeleteUrls] = useState<string[]>([]);

  // --- Effects & Sync Logic ---
  useEffect(() => {
    const isRestaurantChanged = JSON.stringify(draftRestaurant) !== JSON.stringify(restaurant);
    const isCategoriesChanged = JSON.stringify(draftCategories) !== JSON.stringify(categories);
    const isItemsChanged = JSON.stringify(draftItems) !== JSON.stringify(items);
    const hasDeletions = deletedCategoryIds.length > 0 || deletedItemIds.length > 0;
    setHasChanges(isRestaurantChanged || isCategoriesChanged || isItemsChanged || hasDeletions);
  }, [draftRestaurant, draftCategories, draftItems, restaurant, categories, items, deletedCategoryIds, deletedItemIds]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  useEffect(() => {
    setDraftCategories(categories);
    setDraftItems(items);
    setDraftRestaurant(restaurant);
    setDeletedCategoryIds([]);
    setDeletedItemIds([]);
    setPendingDeleteUrls([]); // Reset deletions on sync
  }, [categories, items, restaurant]);

  const markChanged = useCallback(() => {}, []);

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
    setDeletedItemIds((prev) => [
      ...prev,
      ...draftItems.filter((i) => i.category_id === id).map((i) => i.id),
    ]);
    setDeletedCategoryIds((prev) => [...prev, id]);
    setDraftCategories((prev) => prev.filter((c) => c.id !== id));
    setDraftItems((prev) => prev.filter((i) => i.category_id !== id));
  }, [draftItems]);

  const saveEditCat = useCallback(() => {
    if (!editingCat) return;
    setDraftCategories((prev) => prev.map((c) => (c.id === editingCat.id ? editingCat : c)));
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

  // --- Menu Item CRUD Logic ---
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
    setImageInputMode(item.image_url && !item.image_url.includes("supabase.co") && item.image_url.startsWith("http") ? "url" : "upload");
    setImageUrlInput(item.image_url && !item.image_url.includes("supabase.co") ? item.image_url : "");
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
    setDeletedItemIds((prev) => [...prev, id]);
    setDraftItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const toggleAvailability = useCallback((id: string) => {
    setDraftItems((prev) =>
      prev.map((i) => i.id === id ? { ...i, available: !i.available, updated_at: new Date().toISOString() } : i)
    );
  }, []);

  // --- REPLACED: Image Processing & Uploads ---

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
      toast({ title: "Upload failed", variant: "destructive" });
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Track old image for deletion if it was a bucket image
    if (itemForm.image_url.includes('supabase.co')) {
      setPendingDeleteUrls(prev => [...prev, itemForm.image_url]);
    }

    const url = await uploadToBucket(file, 'menu-items');
    if (url) {
      setItemForm((prev) => ({ ...prev, image_url: url }));
    }
  }, [itemForm.image_url, uploadToBucket]);

  const handleImageUrlApply = useCallback(() => {
    if (imageUrlInput.trim()) {
      // If we switch to a URL, the previous bucket image (if any) should be marked for deletion
      if (itemForm.image_url.includes('supabase.co')) {
        setPendingDeleteUrls(prev => [...prev, itemForm.image_url]);
      }
      setItemForm((prev) => ({ ...prev, image_url: imageUrlInput.trim() }));
    }
  }, [imageUrlInput, itemForm.image_url]);

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (draftRestaurant.logo_url?.includes('supabase.co')) {
      setPendingDeleteUrls(prev => [...prev, draftRestaurant.logo_url!]);
    }

    const url = await uploadToBucket(file, 'logos');
    if (url) {
      setDraftRestaurant((prev) => ({ ...prev, logo_url: url }));
    }
  }, [draftRestaurant.logo_url, uploadToBucket]);

  // --- Save Operations with Cleanup ---
  const [saving, setSaving] = useState(false);

  const saveAllChanges = useCallback(async () => {
    setSaving(true);
    try {
      const success = await onSaveAll(draftCategories, draftItems, draftRestaurant, deletedCategoryIds, deletedItemIds);
      
      if (success) {
        // Find images of items that were deleted permanently
        const deletedItemImages = items
          .filter(i => deletedItemIds.includes(i.id))
          .map(i => i.image_url);

        const toClear = [...pendingDeleteUrls, ...deletedItemImages].filter(u => u?.includes('restaurant-assets'));
        
        if (toClear.length > 0) {
          const paths = toClear.map(u => u.split('restaurant-assets/')[1]);
          await supabase.storage.from('restaurant-assets').remove(paths);
        }

        setPendingDeleteUrls([]);
        toast({ title: "All changes saved & storage cleaned!", variant: "default" });
      }
    } catch (err) {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [draftCategories, draftItems, draftRestaurant, deletedCategoryIds, deletedItemIds, items, pendingDeleteUrls, onSaveAll]);

  // --- Delete Confirmation State ---
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
    draftCategories, draftItems, draftRestaurant,
    setDraftRestaurant, hasChanges, markChanged,
    catName, setCatName, editingCat, setEditingCat,
    editingItem, itemFormOpen, setItemFormOpen, itemForm, setItemForm,
    imageInputMode, setImageInputMode, imageUrlInput, setImageUrlInput, isUploading,
    saving, deleteConfirm, setDeleteConfirm,
    addCategory, saveEditCat,
    handleDragStart, handleDragEnter, handleDragEnd,
    openNewItem, openEditItem, saveItem, toggleAvailability,
    handleImageUpload, handleImageUrlApply,
    handleLogoUpload,
    saveAllChanges, handleConfirmDelete,
  };
}
