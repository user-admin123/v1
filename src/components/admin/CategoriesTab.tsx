import { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Edit, X, GripVertical } from "lucide-react";

interface Props {
  categories: Category[];
  catName: string;
  onCatNameChange: (v: string) => void;
  onAddCategory: () => void;
  editingCat: Category | null;
  onSetEditingCat: (cat: Category | null) => void;
  onSaveEditCat: () => void;
  onDeleteRequest: (cat: Category) => void;
  onDragStart: (index: number) => void;
  onDragEnter: (index: number) => void;
  onDragEnd: () => void;
}

const CategoriesTab = ({
  categories,
  catName,
  onCatNameChange,
  onAddCategory,
  editingCat,
  onSetEditingCat,
  onSaveEditCat,
  onDeleteRequest,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: Props) => (
  /* Removed 'overflow-hidden' as it clips the focus ring.
     Added 'p-0.5' to provide a tiny buffer so the top highlight is visible.
  */
  <div className="space-y-3 mt-3 w-full p-0.5">
    <div className="flex gap-2">
      <Input
        value={catName}
        onChange={(e) => onCatNameChange(e.target.value)}
        placeholder="New category name"
        className="bg-muted/50 flex-1 min-w-0"
        onKeyDown={(e) => e.key === "Enter" && onAddCategory()}
      />
      <Button onClick={onAddCategory} size="icon" className="shrink-0">
        <Plus className="w-4 h-4" />
      </Button>
    </div>

    <div className="space-y-2 max-w-full">
      {categories.map((cat, idx) => (
        <div
          key={cat.id}
          /* min-w-0 is mandatory here to allow the child span to clamp */
          className="flex items-center gap-2 glass-surface rounded-lg p-2 cursor-grab active:cursor-grabbing min-w-0 w-full"
          draggable
          onDragStart={() => onDragStart(idx)}
          onDragEnter={() => onDragEnter(idx)}
          onDragEnd={onDragEnd}
          onDragOver={(e) => e.preventDefault()}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
          
          {editingCat?.id === cat.id ? (
            <div className="flex items-center gap-1 flex-1 min-w-0 py-0.5">
              <Input
                value={editingCat.name}
                onChange={(e) => onSetEditingCat({ ...editingCat, name: e.target.value })}
                className="flex-1 bg-muted/50 h-8 text-sm min-w-0"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSaveEditCat();
                  if (e.key === "Escape") onSetEditingCat(null);
                }}
              />
              <Button size="sm" variant="ghost" onClick={onSaveEditCat} className="shrink-0 h-8 text-xs px-2">
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onSetEditingCat(null)} className="shrink-0 h-8 px-2">
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <>
              {/* LINE CLAMPING APPLIED HERE */}
              <span 
                className="flex-1 text-sm text-foreground font-sans line-clamp-1 break-all min-w-0" 
                title={cat.name}
              >
                {cat.name}
              </span>
              
              <div className="flex items-center shrink-0">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 px-2" 
                  onClick={() => onSetEditingCat(cat)}
                >
                  <Edit className="w-3 h-3" />
                </Button>
                
                <Button
                  size="sm" 
                  variant="ghost" 
                  className="h-8 px-2 text-destructive hover:text-destructive"
                  onClick={() => onDeleteRequest(cat)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  </div>
);

export default CategoriesTab;
