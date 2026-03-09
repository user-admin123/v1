import { useState, useRef, useCallback, useEffect } from "react";
import { Category, MenuItem, ItemType, RestaurantInfo } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

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
  const [draftCategories, setDraftCategories] = useState<Category[]>(categories);
  const [draftItems, setDraftItems] = useState<MenuItem[]>(items);
  const [draftRestaurant, setDraftRestaurant] = useState<RestaurantInfo>(restaurant);
  const [hasChanges, setHasChanges] = useState(false);
  const [deletedCategoryIds, setDeletedCategoryIds] = useState<string[]>([]);
  const [deletedItemIds, setDeletedItemIds] = useState<string[]>([]);

  // Sync drafts when props change (e.g. after save)
  useEffect(() => {
    setDraftCategories(categories);
    setDraftItems(items);
    setDraftRestaurant(restaurant);
    setHasChanges(false);
    setDeletedCategoryIds([]);
    setDeletedItemIds([]);
  }, [categories, items, restaurant]);

  const markChanged = useCallback(() => setHasChanges(true), []);

  // --- Category CRUD ---
  const [catName, setCatName] = useState("");
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  const addCategory = useCallback(() => {
    if (!catName.trim()) return;
    const newCat: Category = {
      id: crypto.randomUUID(),
      name: catName.trim(),
      order_index: draftCategories.length,
      created_at: new Date().toISOString(),
    };
    setDraftCategories((prev) => [...prev, newCat]);
    setCatName("");
    setHasChanges(true);
  }, [catName, draftCategories.length]);

  const deleteCategory = useCallback((id: string) => {
    setDeletedItemIds((prev) => [
      ...prev,
      ...draftItems.filter((i) => i.category_id === id).map((i) => i.id),
    ]);
    setDeletedCategoryIds((prev) => [...prev, id]);
    setDraftCategories((prev) => prev.filter((c) => c.id !== id));
    setDraftItems((prev) => prev.filter((i) => i.category_id !== id));
    setHasChanges(true);
  }, [draftItems]);

  const saveEditCat = useCallback(() => {
    if (!editingCat) return;
    setDraftCategories((prev) =>
      prev.map((c) => (c.id === editingCat.id ? editingCat : c))
    );
    setEditingCat(null);
    setHasChanges(true);
  }, [editingCat]);

  // Drag & drop
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
    setHasChanges(true);
  };

  // --- Item CRUD ---
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
    setImageInputMode(item.image_url && !item.image_url.startsWith("data:") ? "url" : "upload");
    setImageUrlInput(item.image_url && !item.image_url.startsWith("data:") ? item.image_url : "");
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
        id: crypto.randomUUID(), ...itemForm, price,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setDraftItems((prev) => [...prev, newItem]);
    }
    setItemFormOpen(false);
    setHasChanges(true);
  }, [itemForm, editingItem]);

  const deleteItem = useCallback((id: string) => {
    setDeletedItemIds((prev) => [...prev, id]);
    setDraftItems((prev) => prev.filter((i) => i.id !== id));
    setHasChanges(true);
  }, []);

  const toggleAvailability = useCallback((id: string) => {
    setDraftItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, available: !i.available, updated_at: new Date().toISOString() } : i
      )
    );
    setHasChanges(true);
  }, []);

  // --- Image handling ---
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Max 2MB allowed.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setItemForm((prev) => ({ ...prev, image_url: reader.result as string }));
    };
    reader.readAsDataURL(file);
  }, []);

  const handleImageUrlApply = useCallback(() => {
    if (imageUrlInput.trim()) {
      setItemForm((prev) => ({ ...prev, image_url: imageUrlInput.trim() }));
    }
  }, [imageUrlInput]);

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Max 2MB allowed.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setDraftRestaurant((prev) => ({ ...prev, logo_url: reader.result as string }));
      setHasChanges(true);
    };
    reader.readAsDataURL(file);
  }, []);

  // --- Save all ---
  const [saving, setSaving] = useState(false);

  const saveAllChanges = useCallback(async () => {
    setSaving(true);
    try {
      const success = await onSaveAll(draftCategories, draftItems, draftRestaurant, deletedCategoryIds, deletedItemIds);
      setHasChanges(false);
      setDeletedCategoryIds([]);
      setDeletedItemIds([]);
      toast({
        title: "All changes saved!",
        description: success ? "Synced to database." : "Saved locally (database unavailable).",
      });
    } finally {
      setSaving(false);
    }
  }, [draftCategories, draftItems, draftRestaurant, deletedCategoryIds, deletedItemIds, onSaveAll]);

  // --- Delete confirmation ---
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
    // Draft state
    draftCategories, draftItems, draftRestaurant,
    setDraftRestaurant, hasChanges, markChanged,
    // Category
    catName, setCatName, editingCat, setEditingCat,
    addCategory, saveEditCat,
    handleDragStart, handleDragEnter, handleDragEnd,
    // Item
    editingItem, itemFormOpen, setItemFormOpen, itemForm, setItemForm,
    imageInputMode, setImageInputMode, imageUrlInput, setImageUrlInput,
    openNewItem, openEditItem, saveItem, toggleAvailability,
    handleImageUpload, handleImageUrlApply,
    // Logo
    handleLogoUpload,
    // Save
    saving, saveAllChanges,
    // Delete confirmation
    deleteConfirm, setDeleteConfirm, handleConfirmDelete,
  };
}
