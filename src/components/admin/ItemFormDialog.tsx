import { Category, MenuItem, ItemType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Upload, Link, X, Loader2 } from "lucide-react"; 
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
  isUploading // Ensure this is destructured from props
}: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="glass-card border-border/30 sm:max-w-md max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-foreground">
          {editingItem ? "Edit Item" : "Add Item"}
        </DialogTitle>
        <DialogDescription>Fill in the item details below.</DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4 mt-2">
        <div className="space-y-1">
          <Label>Name *</Label>
          <Input
            value={itemForm.name}
            onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
            className="bg-muted/50"
          />
        </div>
        
        <div className="space-y-1">
          <Label>Description</Label>
          <Textarea
            value={itemForm.description}
            onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
            className="bg-muted/50 resize-none"
            rows={2}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Price *</Label>
            <Input
              type="number" step="0.01"
              value={itemForm.price}
              onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
              className="bg-muted/50"
            />
          </div>
          
          <div className="space-y-1 min-w-0">
            <Label>Category *</Label>
            <Select
              value={itemForm.category_id}
              onValueChange={(v) => setItemForm({ ...itemForm, category_id: v })}
            >
              <SelectTrigger className="bg-muted/50 w-full min-w-0 overflow-hidden">
                <div className="line-clamp-1 text-left break-all">
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent className="max-w-[300px]">
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="min-w-0">
                    <span className="line-clamp-1 break-all">{c.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <Label>Type *</Label>
          <Select
            value={itemForm.item_type}
            onValueChange={(v) => setItemForm({ ...itemForm, item_type: v as ItemType })}
          >
            <SelectTrigger className="bg-muted/50 w-full min-w-0 overflow-hidden">
              <div className="line-clamp-1 text-left">
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="veg">
                <span className="flex items-center gap-2"><VegBadge type="veg" /> Vegetarian</span>
              </SelectItem>
              <SelectItem value="nonveg">
                <span className="flex items-center gap-2"><VegBadge type="nonveg" /> Non-Vegetarian</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Image Section */}
        <div className="space-y-2">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">Item Image</Label>
          
          {itemForm.image_url && (
            <div className="relative w-full h-40 rounded-xl overflow-hidden bg-muted border border-border/30">
              <img src={itemForm.image_url} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => { setItemForm({ ...itemForm, image_url: "" }); setImageUrlInput(""); }}
                className="absolute top-2 right-2 rounded-full bg-black/60 backdrop-blur-md p-1.5 text-white hover:bg-black/80 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setImageInputMode("upload")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                imageInputMode === "upload" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
              )}
            >
              <Upload className="w-3 h-3" /> Upload
            </button>
            <button
              type="button"
              onClick={() => setImageInputMode("url")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                imageInputMode === "url" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
              )}
            >
              <Link className="w-3 h-3" /> URL
            </button>
          </div>

          {imageInputMode === "upload" ? (
            <label className={cn(
              "flex items-center justify-center gap-2 cursor-pointer bg-muted/30 border border-dashed rounded-md px-3 py-4 text-sm transition-all",
              isUploading ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/50"
            )}>
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
              <span className="font-medium">{isUploading ? "Optimizing..." : "Choose Image File"}</span>
              <input type="file" accept="image/*" onChange={onImageUpload} className="hidden" disabled={isUploading} />
            </label>
          ) : (
            <Input
              value={imageUrlInput}
              onChange={(e) => {
                setImageUrlInput(e.target.value);
                setItemForm({ ...itemForm, image_url: e.target.value });
              }}
              className="bg-muted/50 h-10"
              placeholder="Paste image link here (https://...)"
              disabled={isUploading}
            />
          )}
        </div>

        <div className="flex items-center justify-between py-2">
          <Label>Available</Label>
          <Switch
            checked={itemForm.available}
            onCheckedChange={(v) => setItemForm({ ...itemForm, available: v })}
          />
        </div>

        <Button 
          onClick={onSave} 
          className="w-full" 
          disabled={isUploading || !itemForm.name || !itemForm.price}
        >
          {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {editingItem ? "Update Item" : "Add Item"}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

export default ItemFormDialog;
