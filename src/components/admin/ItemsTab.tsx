import { Category, MenuItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit } from "lucide-react";
import VegBadge from "@/components/VegBadge";

interface Props {
  categories: Category[];
  items: MenuItem[];
  onAddNew: () => void;
  onEdit: (item: MenuItem) => void;
  onDeleteRequest: (item: MenuItem) => void;
  onToggleAvailability: (id: string) => void;
}

const ItemsTab = ({
  categories, items, onAddNew, onEdit, onDeleteRequest, onToggleAvailability,
}: Props) => (
  <div className="space-y-3 mt-3">
    <Button onClick={onAddNew} className="w-full">
      <Plus className="w-4 h-4 mr-2" />Add Item
    </Button>

    {categories.map((cat) => {
      const catItems = items.filter((i) => i.category_id === cat.id);
      if (catItems.length === 0) return null;
      return (
        <div key={cat.id}>
          <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider truncate" title={cat.name}>
            {cat.name}
          </p>
          {catItems.map((item) => (
            <div key={item.id} className="flex items-center gap-2 glass-surface rounded-lg p-2 mb-1 min-w-0">
              <VegBadge type={item.item_type || "veg"} />
              <div className="w-10 h-10 rounded-md overflow-hidden bg-muted shrink-0">
                {item.image_url && (
                  <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate font-sans" title={item.name}>
                  {item.name}
                </p>
                <p className="text-xs text-primary font-sans">${item.price.toFixed(2)}</p>
              </div>
              <Switch
                checked={item.available}
                onCheckedChange={() => onToggleAvailability(item.id)}
              />
              <Button size="sm" variant="ghost" className="shrink-0" onClick={() => onEdit(item)}>
                <Edit className="w-3 h-3" />
              </Button>
              <Button
                size="sm" variant="ghost" className="shrink-0 text-destructive hover:text-destructive"
                onClick={() => onDeleteRequest(item)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      );
    })}
  </div>
);

export default ItemsTab;
