import { Category, MenuItem, ItemType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Upload, Link, X, Loader2, Image as ImageIcon } from "lucide-react"; 
import VegBadge from "@/components/VegBadge";
import { cn } from "@/lib/utils"; 

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
  imageInputMode: "upload" | "url";
  setImageInputMode: (mode: "upload" | "url") => void;
  imageUrlInput: string;
  setImageUrlInput: (url: string) => void;
  onSave: () => void;
  isUploading: boolean;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageUrlApply: () => void;
}

const ItemFormDialog = ({
  open, onOpenChange, editingItem, categories,
  itemForm, setItemForm, imageInputMode, setImageInputMode,
  imageUrlInput, setImageUrlInput, onSave, onImageUpload, onImageUrlApply,
  isUploading
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

        {/* Professional Image Handling Section */}
        <div className="space-y-3 pt-2 border-t border-border/40">
          <Label className="text-[11px] font-bold uppercase tracking-widest text-primary/70">Visual Asset</Label>
          
          {itemForm.image_url ? (
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-muted border-2 border-background shadow-lg group">
              <img src={itemForm.image_url} alt="Preview" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="sm" 
                  className="h-9 shadow-xl rounded-full px-4"
                  onClick={() => { setItemForm({ ...itemForm, image_url: "" }); setImageUrlInput(""); }}
                  disabled={isUploading}
                >
                  <X className="w-4 h-4 mr-2" /> Replace Photo
                </Button>
              </div>
              {isUploading && (
                <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse">Processing Image</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3 p-1 bg-muted/30 rounded-2xl border border-border/40">
              {/* Tab Mode Toggles */}
              <div className="flex p-1 bg-muted/60 rounded-xl">
                <button
                  type="button"
                  onClick={() => setImageInputMode("upload")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all",
                    imageInputMode === "upload" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"
                  )}
                >
                  <Upload className="w-3.5 h-3.5" /> Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setImageInputMode("url")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all",
                    imageInputMode === "url" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"
                  )}
                >
                  <Link className="w-3.5 h-3.5" /> Image URL
                </button>
              </div>

              {/* Tab Content */}
              <div className="px-1 pb-1">
                {imageInputMode === "upload" ? (
                  <label className={cn(
                    "flex flex-col items-center justify-center gap-3 cursor-pointer border-2 border-dashed rounded-xl py-10 transition-all",
                    isUploading ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/40 hover:border-primary/30"
                  )}>
                    {isUploading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <ImageIcon className="w-6 h-6 text-muted-foreground/60" />}
                    <div className="text-center">
                      <span className="text-xs font-semibold block">Choose a high-res photo</span>
                      <span className="text-[10px] text-muted-foreground">PNG, JPG or WebP supported</span>
                    </div>
                    <input type="file" accept="image/*" onChange={onImageUpload} className="hidden" disabled={isUploading} />
                  </label>
                ) : (
                  <div className="flex flex-col gap-2 p-1">
                    <div className="flex gap-2">
                      <Input 
                        value={imageUrlInput} 
                        onChange={(e) => setImageUrlInput(e.target.value)} 
                        placeholder="Paste image address (https://...)" 
                        className="text-xs h-10 bg-muted/40 border-muted pl-4"
                        disabled={isUploading}
                      />
                      <Button 
                        size="sm" 
                        onClick={onImageUrlApply} 
                        disabled={!imageUrlInput.trim() || isUploading}
                        className="h-10 px-4"
                      >
                        Apply
                      </Button>
                    </div>
                    <p className="text-[9px] text-muted-foreground/60 px-1 italic">* Ensure the link is public and direct to an image file.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

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
