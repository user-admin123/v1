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
  /* w-full and overflow-hidden prevent the entire tab from pushing the sidebar */
  <div className="space-y-3 mt-3 w-full overflow-hidden">
    <Button onClick={onAddNew} className="w-full shrink-0">
      <Plus className="w-4 h-4 mr-2" />Add Item
    </Button>

    <div className="space-y-4">
      {categories.map((cat) => {
        const catItems = items.filter((i) => i.category_id === cat.id);
        if (catItems.length === 0) return null;
        return (
          <div key={cat.id} className="w-full min-w-0">
            {/* Category Header with Clamping */}
            <p 
              className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider line-clamp-1 break-all px-1" 
              title={cat.name}
            >
              {cat.name}
            </p>

            <div className="space-y-1 w-full">
              {catItems.map((item) => (
                <div 
                  key={item.id} 
                  /* min-w-0 is the key to stopping the container from expanding */
                  className="flex items-center gap-2 glass-surface rounded-lg p-2 min-w-0 w-full overflow-hidden"
                >
                  <div className="shrink-0">
                    <VegBadge type={item.item_type || "veg"} />
                  </div>

                  <div className="w-10 h-10 rounded-md overflow-hidden bg-muted shrink-0">
                    {item.image_url && (
                      <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Item Name with Clamping */}
                    <p 
                      className="text-sm font-medium text-foreground line-clamp-1 break-all font-sans leading-tight" 
                      title={item.name}
                    >
                      {item.name}
                    </p>
                    <p className="text-xs text-primary font-sans">${item.price.toFixed(2)}</p>
                  </div>

                  {/* Actions wrapper to keep them grouped and non-shrinking */}
                  <div className="flex items-center gap-1 shrink-0 ml-auto">
                    <Switch
                      checked={item.available}
                      onCheckedChange={() => onToggleAvailability(item.id)}
                      className="scale-75 sm:scale-90"
                    />
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 px-2 shrink-0" 
                      onClick={() => onEdit(item)}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm" 
                      variant="ghost" 
                      className="h-8 px-2 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => onDeleteRequest(item)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export default ItemsTab;
