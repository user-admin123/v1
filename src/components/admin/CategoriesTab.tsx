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
    {/* New Category Input */}
    <div className="flex gap-2">
      <Input
        value={catName}
        onChange={(e) => onCatNameChange(e.target.value)}
        placeholder="New category name"
        className="bg-muted/50"
        onKeyDown={(e) => e.key === "Enter" && onAddCategory()}
      />
      <Button onClick={onAddCategory} size="icon">
        <Plus className="w-4 h-4" />
      </Button>
    </div>

    {/* Categories List */}
    {categories.map((cat, idx) => (
      <div
        key={cat.id}
        className="flex items-center gap-2 glass-surface rounded-lg p-2 cursor-grab active:cursor-grabbing"
        draggable
        onDragStart={() => onDragStart(idx)}
        onDragEnter={() => onDragEnter(idx)}
        onDragEnd={onDragEnd}
        onDragOver={(e) => e.preventDefault()}
      >
        {/* Drag Handle */}
        <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />

        {/* Editing Mode */}
        {editingCat?.id === cat.id ? (
          <>
            <Input
              value={editingCat.name}
              onChange={(e) =>
                onSetEditingCat({ ...editingCat, name: e.target.value })
              }
              className="flex-1 bg-muted/50 h-8 text-sm"
            />
            <Button size="sm" variant="ghost" onClick={onSaveEditCat}>
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSetEditingCat(null)}
            >
              <X className="w-3 h-3" />
            </Button>
          </>
        ) : (
          <>
            {/* Category Name with truncation and tooltip */}
            <span
              className="flex-1 text-sm text-foreground font-sans truncate"
              title={cat.name}
            >
              {cat.name}
            </span>

            {/* Edit Button */}
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0"
              onClick={() => onSetEditingCat(cat)}
            >
              <Edit className="w-3 h-3" />
            </Button>

            {/* Delete Button */}
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
