import { MenuItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import VegBadge from "@/components/VegBadge";
import { Minus, Plus } from "lucide-react";

interface Props {
  item: MenuItem;
  onSelect: (item: MenuItem) => void;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
}

const MenuItemCard = ({ item, onSelect, quantity, onAdd, onRemove }: Props) => {
  return (
    <motion.div
      id={`menu-item-${item.id}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35 }}
      className={cn(
        "glass-card rounded-2xl overflow-hidden w-full transition-all cursor-pointer",
        !item.available && "opacity-50 grayscale"
      )}
      onClick={() => onSelect(item)}
    >
      <div className="flex gap-4 p-3">
        {/* Image */}
        <div className="w-24 h-24 md:w-28 md:h-28 flex-shrink-0 rounded-xl overflow-hidden bg-muted">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No image</div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col justify-between flex-1 min-w-0 py-1">
          <div>
            <div className="flex items-start justify-between gap-2 w-full text-left">
              <div className="flex items-center gap-1.5 min-w-0">
                <VegBadge type={item.item_type || "veg"} />
                <h3 className="font-semibold text-foreground text-base leading-tight font-sans line-clamp-2">{item.name}</h3>
              </div>
              {!item.available && (
                <Badge variant="secondary" className="text-[10px] shrink-0 bg-destructive/20 text-destructive border-none">Sold Out</Badge>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-2">
            <p className="text-primary font-bold text-lg font-sans">${item.price.toFixed(2)}</p>

            {item.available && (
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                {quantity > 0 ? (
                  <>
                    <button
                      onClick={onRemove}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-muted hover:bg-destructive/20 hover:text-destructive transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-bold w-6 text-center text-foreground">{quantity}</span>
                  </>
                ) : null}
                <button
                  onClick={onAdd}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MenuItemCard;
