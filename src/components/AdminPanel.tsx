import { useState } from "react";
import { Category, MenuItem, RestaurantInfo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save } from "lucide-react";
import { useAdminState } from "@/hooks/useAdminState";
import AdminFloatingButtons from "@/components/admin/AdminFloatingButtons";
import DeleteConfirmDialog from "@/components/admin/DeleteConfirmDialog";
import QrFullscreenDialog from "@/components/admin/QrFullscreenDialog";
import CategoriesTab from "@/components/admin/CategoriesTab";
import ItemsTab from "@/components/admin/ItemsTab";
import SettingsTab from "@/components/admin/SettingsTab";
import QrTab from "@/components/admin/QrTab";
import ItemFormDialog from "@/components/admin/ItemFormDialog";
import UsageInsights from "@/components/admin/UsageInsights";

interface Props {
  categories: Category[];
  items: MenuItem[];
  restaurant: RestaurantInfo;
  onUpdateCategories: (cats: Category[]) => void;
  onUpdateItems: (items: MenuItem[]) => void;
  onUpdateRestaurant: (info: RestaurantInfo) => void;
  onSaveAll: (
    cats: Category[], 
    items: MenuItem[], 
    rest: RestaurantInfo, 
    deletedCatIds: string[], 
    deletedItemIds: string[]
  ) => Promise<boolean>;
  onLogout: () => void;
}

const AdminPanel = ({ 
  categories, 
  items, 
  restaurant, 
  onSaveAll, 
  onLogout 
}: Props) => {
  const [open, setOpen] = useState(false);
  const [qrFullscreen, setQrFullscreen] = useState(false);
  const menuUrl = window.location.origin;

  const admin = useAdminState({ categories, items, restaurant, onSaveAll });

  return (
    <>
      <AdminFloatingButtons
        hasChanges={admin.hasChanges}
        saving={admin.saving}
        onSave={admin.saveAllChanges}
        onOpenPanel={() => setOpen(true)}
        onLogout={onLogout}
      />

      <DeleteConfirmDialog
        deleteConfirm={admin.deleteConfirm}
        onClose={() => admin.setDeleteConfirm(null)}
        onConfirm={admin.handleConfirmDelete}
      />

      <QrFullscreenDialog
        open={qrFullscreen}
        onClose={() => { setQrFullscreen(false); setOpen(true); }}
        restaurant={admin.draftRestaurant}
        menuUrl={menuUrl}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-card border-border/30 sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Admin Panel</DialogTitle>
            <DialogDescription>Manage your restaurant menu. Click "Update Changes" to save.</DialogDescription>
          </DialogHeader>

          {admin.hasChanges && (
            <Button 
              onClick={admin.saveAllChanges} 
              disabled={admin.saving || admin.isUploading} 
              className="w-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-70 shadow-lg"
            >
              {admin.saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Update Changes</>
              )}
            </Button>
          )}

          <Tabs defaultValue="categories" className="mt-2">
            <TabsList className="w-full bg-muted/50 p-1">
              <TabsTrigger value="categories" className="flex-1 text-[11px] sm:text-xs">Categories</TabsTrigger>
              <TabsTrigger value="items" className="flex-1 text-[11px] sm:text-xs">Items</TabsTrigger>
              <TabsTrigger value="settings" className="flex-1 text-[11px] sm:text-xs">Settings</TabsTrigger>
              <TabsTrigger value="insights" className="flex-1 text-[11px] sm:text-xs">Insights</TabsTrigger>
              <TabsTrigger value="qr" className="flex-1 text-[11px] sm:text-xs">QR</TabsTrigger>
            </TabsList>

            <TabsContent value="categories">
              <CategoriesTab
                categories={admin.draftCategories}
                catName={admin.catName}
                onCatNameChange={admin.setCatName}
                onAddCategory={admin.addCategory}
                editingCat={admin.editingCat}
                onSetEditingCat={admin.setEditingCat}
                onSaveEditCat={admin.saveEditCat}
                onDeleteRequest={(cat) => admin.setDeleteConfirm({ type: "category", id: cat.id, name: cat.name })}
                onDragStart={admin.handleDragStart}
                onDragEnter={admin.handleDragEnter}
                onDragEnd={admin.handleDragEnd}
              />
            </TabsContent>

            <TabsContent value="items">
              <ItemsTab
                categories={admin.draftCategories}
                items={admin.draftItems}
                onAddNew={admin.openNewItem}
                onEdit={admin.openEditItem}
                onDeleteRequest={(item) => admin.setDeleteConfirm({ type: "item", id: item.id, name: item.name })}
                onToggleAvailability={admin.toggleAvailability}
              />
            </TabsContent>

            <TabsContent value="settings">
              <SettingsTab
                restaurant={admin.draftRestaurant}
                onUpdate={admin.setDraftRestaurant}
                isUploading={admin.isUploading}
                markChanged={admin.markChanged}
                onFileSelect={(file) => admin.onFileSelect(
                  file, 
                  'logo', 
                  admin.draftRestaurant.name, 
                  (url) => admin.setDraftRestaurant(prev => ({ ...prev, logo_url: url }))
                )}
                onUrlChange={(newUrl) => admin.onUrlChange(
                  newUrl, 
                  (url) => admin.setDraftRestaurant(prev => ({ ...prev, logo_url: url }))
                )}
              />
            </TabsContent>

            <TabsContent value="insights">
              <UsageInsights restaurantId={restaurant.id} />
            </TabsContent>

            <TabsContent value="qr">
              <QrTab
                restaurant={admin.draftRestaurant}
                menuUrl={menuUrl}
                onViewFullscreen={() => { setOpen(false); setQrFullscreen(true); }}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <ItemFormDialog
        open={admin.itemFormOpen}
        onOpenChange={admin.setItemFormOpen}
        editingItem={admin.editingItem}
        categories={admin.draftCategories}
        itemForm={admin.itemForm}
        setItemForm={admin.setItemForm}
        isUploading={admin.isUploading}
        onSave={admin.saveItem}
        onFileSelect={(file) => admin.onFileSelect(
          file, 
          'item', 
          admin.itemForm.name, 
          (url) => admin.setItemForm(prev => ({ ...prev, image_url: url }))
        )}
        onUrlChange={(newUrl) => admin.onUrlChange(
          newUrl, 
          (url) => admin.setItemForm(prev => ({ ...prev, image_url: url }))
        )}
      />
    </>
  );
};

export default AdminPanel;
