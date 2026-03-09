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
  <div className="space-y-3 mt-3">
    
    {/* Add Category */}
    <div className="flex gap-2">
      <Input
        value={catName}
        onChange={(e) => onCatNameChange(e.target.value)}
        placeholder="New category name"
        className="bg-muted/50"
        onKeyDown={(e) => e.key === "Enter" && onAddCategory()}
      />

      <Button onClick={onAddCategory} size="icon" className="shrink-0">
        <Plus className="w-4 h-4" />
      </Button>
    </div>

    {/* Category List */}
    {categories?.map((cat, idx) => (
      <div
        key={cat.id}
        className="flex items-center gap-2 glass-surface rounded-lg p-2 cursor-grab active:cursor-grabbing min-w-0"
        draggable
        onDragStart={() => onDragStart(idx)}
        onDragEnter={() => onDragEnter(idx)}
        onDragEnd={onDragEnd}
        onDragOver={(e) => e.preventDefault()}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />

        {editingCat?.id === cat.id ? (
          <>
            <Input
              value={editingCat?.name || ""}
              onChange={(e) => {
                if (!editingCat) return;
                onSetEditingCat({
                  ...editingCat,
                  name: e.target.value,
                });
              }}
              className="flex-1 bg-muted/50 h-8 text-sm min-w-0"
            />

            <Button
              size="sm"
              variant="ghost"
              className="shrink-0"
              onClick={onSaveEditCat}
            >
              Save
            </Button>

            <Button
              size="sm"
              variant="ghost"
              className="shrink-0"
              onClick={() => onSetEditingCat(null)}
            >
              <X className="w-3 h-3" />
            </Button>
          </>
        ) : (
          <>
            <span
              className="flex-1 min-w-0 text-sm text-foreground font-sans truncate"
              title={cat.name}
            >
              {cat.name}
            </span>

            <Button
              size="sm"
              variant="ghost"
              className="shrink-0"
              onClick={() => onSetEditingCat(cat)}
            >
              <Edit className="w-3 h-3" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              className="shrink-0 text-destructive hover:text-destructive"
              onClick={() => onDeleteRequest(cat)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </>
        )}
      </div>
    ))}
  </div>
);

export default CategoriesTab;
