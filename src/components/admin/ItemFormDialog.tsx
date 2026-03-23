import { Category, MenuItem, ItemType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react"; 
import VegBadge from "@/components/VegBadge";
import { ImageUploader } from "./ImageUploader";

interface ItemForm {
  name: string;
  description: string;
  price: string;
  category_id: string;
  image_url: string;
  available: boolean;
  item_type: ItemType;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: MenuItem | null;
  categories: Category[];
  itemForm: ItemForm;
  setItemForm: (form: ItemForm) => void;
  onSave: () => void;
  isUploading: boolean;
  // Unified handlers from useAdminState hook
  onFileSelect: (file: File, type: 'logo' | 'item', currentUrl: string, name: string, setter: (url: string) => void) => void;
  onUrlChange: (newUrl: string, currentUrl: string, setter: (url: string) => void) => void;
}

const ItemFormDialog = ({
  open, onOpenChange, editingItem, categories,
  itemForm, setItemForm, onSave, isUploading,
  onFileSelect, onUrlChange
}: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="glass-card border-border/30 sm:max-w-md max-h-[90vh] overflow-y-auto outline-none">
      <DialogHeader>
        <DialogTitle className="text-xl font-bold tracking-tight">
          {editingItem ? "Edit Menu Item" : "Create New Item"}
        </DialogTitle>
        <DialogDescription className="text-xs">
          Configure your item details and high-quality imagery.
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-5 mt-4">
        {/* Basic Info Group */}
        <div className="space-y-4 p-0.5">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Item Name *</Label>
            <Input
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              className="bg-muted/40 border-muted focus:bg-background h-10 transition-all"
              placeholder="e.g. Truffle Mushroom Pizza"
              disabled={isUploading}
            />
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Description</Label>
            <Textarea
              value={itemForm.description}
              onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
              className="bg-muted/40 border-muted focus:bg-background resize-none min-h-[80px]"
              placeholder="Describe the ingredients and taste..."
              disabled={isUploading}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Price ($) *</Label>
              <Input
                type="number" step="0.01"
                value={itemForm.price}
                onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                className="bg-muted/40 border-muted focus:bg-background h-10"
                placeholder="0.00"
                disabled={isUploading}
              />
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Category *</Label>
              <Select
                value={itemForm.category_id}
                onValueChange={(v) => setItemForm({ ...itemForm, category_id: v })}
                disabled={isUploading}
              >
                <SelectTrigger className="bg-muted/40 border-muted h-10">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Dietary Type *</Label>
            <Select
              value={itemForm.item_type}
              onValueChange={(v) => setItemForm({ ...itemForm, item_type: v as ItemType })}
              disabled={isUploading}
            >
              <SelectTrigger className="bg-muted/40 border-muted h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="veg">
                  <div className="flex items-center gap-2"><VegBadge type="veg" /> Vegetarian</div>
                </SelectItem>
                <SelectItem value="nonveg">
                  <div className="flex items-center gap-2"><VegBadge type="nonveg" /> Non-Vegetarian</div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Unified Image Section */}
        <ImageUploader 
          label="Visual Asset"
          value={itemForm.image_url}
          isUploading={isUploading}
          aspect="video"
          onFileSelect={(file) => onFileSelect(
            file, 
            'item', 
            itemForm.image_url, 
            itemForm.name, 
            (url) => setItemForm({ ...itemForm, image_url: url })
          )}
          onUrlChange={(newUrl) => onUrlChange(
            newUrl, 
            itemForm.image_url, 
            (url) => setItemForm({ ...itemForm, image_url: url })
          )}
        />

        {/* Availability Toggle */}
        <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/30">
          <div className="space-y-0.5">
            <Label className="text-sm font-semibold">Active & Available</Label>
            <p className="text-[10px] text-muted-foreground">Hide this item from the menu instantly</p>
          </div>
          <Switch
            checked={itemForm.available}
            onCheckedChange={(v) => setItemForm({ ...itemForm, available: v })}
            disabled={isUploading}
          />
        </div>

        <Button 
          onClick={onSave} 
          className="w-full h-12 text-sm font-bold uppercase tracking-widest shadow-lg shadow-primary/20" 
          disabled={isUploading || !itemForm.name || !itemForm.price || !itemForm.category_id}
        >
          {isUploading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Optimizing...</span>
            </div>
          ) : (
            editingItem ? "Update Menu Item" : "Publish to Menu"
          )}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

export default ItemFormDialog;
