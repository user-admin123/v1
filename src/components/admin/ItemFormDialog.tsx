import { Category, MenuItem, ItemType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Upload, Link, X } from "lucide-react";
import VegBadge from "@/components/VegBadge";

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
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageUrlApply: () => void;
}

const ItemFormDialog = ({
  open, onOpenChange, editingItem, categories,
  itemForm, setItemForm, imageInputMode, setImageInputMode,
  imageUrlInput, setImageUrlInput, onSave, onImageUpload, onImageUrlApply,
}: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="glass-card border-border/30 sm:max-w-md max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-foreground">
          {editingItem ? "Edit Item" : "Add Item"}
        </DialogTitle>
        <DialogDescription>Fill in the item details below.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 mt-2">
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
          <div className="space-y-1">
            <Label>Category *</Label>
            <Select
              value={itemForm.category_id}
              onValueChange={(v) => setItemForm({ ...itemForm, category_id: v })}
            >
              <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
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
            <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
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

        {/* Image */}
        <div className="space-y-2">
          <Label>Image</Label>
          {itemForm.image_url && (
            <div className="relative w-full h-40 rounded-xl overflow-hidden bg-muted border border-border/30">
              <img src={itemForm.image_url} alt="Preview" className="w-full h-full object-cover" />
              <button
                onClick={() => { setItemForm({ ...itemForm, image_url: "" }); setImageUrlInput(""); }}
                className="absolute top-2 right-2 rounded-full bg-card/80 p-1.5 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
            <button
              onClick={() => setImageInputMode("upload")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                imageInputMode === "upload"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Upload className="w-3 h-3" /> Upload
            </button>
            <button
              onClick={() => setImageInputMode("url")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                imageInputMode === "url"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Link className="w-3 h-3" /> URL
            </button>
          </div>
          {imageInputMode === "upload" ? (
            <label className="flex items-center gap-2 cursor-pointer bg-muted/50 border border-input rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Upload className="w-4 h-4" />
              <span>{itemForm.image_url ? "Change image" : "Choose image file"}</span>
              <input type="file" accept="image/*" onChange={onImageUpload} className="hidden" />
            </label>
          ) : (
            <div className="flex gap-2">
              <Input
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                className="bg-muted/50 flex-1"
                placeholder="https://..."
              />
              <Button size="sm" onClick={onImageUrlApply} disabled={!imageUrlInput.trim()}>
                Preview
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Upload max 2MB or paste an image URL</p>
        </div>

        <div className="flex items-center justify-between">
          <Label>Available</Label>
          <Switch
            checked={itemForm.available}
            onCheckedChange={(v) => setItemForm({ ...itemForm, available: v })}
          />
        </div>
        <Button onClick={onSave} className="w-full">
          {editingItem ? "Update Item" : "Add Item"}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

export default ItemFormDialog;
