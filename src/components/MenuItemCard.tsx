import { useState, useEffect } from "react";
import { MenuItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import VegBadge from "@/components/VegBadge";
import { Minus, Plus, ImageOff } from "lucide-react";

interface Props {
  item: MenuItem;
  onSelect: (item: MenuItem) => void;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
}

const MenuItemCard = ({ item, onSelect, quantity, onAdd, onRemove }: Props) => {
  // NEW: Track if the image is actually loaded and ready to show
  const [isLoaded, setIsLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Reset states if the item changes
  useEffect(() => {
    setIsLoaded(false);
    setImgError(false);
  }, [item.id]);

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
        {/* Image Container: Stays fixed size to prevent jumping */}
        <div className="relative w-24 h-24 md:w-28 md:h-28 flex-shrink-0 rounded-xl overflow-hidden bg-muted border border-border/10">
          
          {/* BASE LAYER: The "No Image" placeholder (Always there until logo covers it) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-muted/50">
            <ImageOff className="w-5 h-5 mb-1 opacity-20" />
            <span className="text-[9px] font-medium opacity-40 uppercase tracking-tighter">
              {imgError ? "Not Found" : "Loading..."}
            </span>
          </div>

          {/* TOP LAYER: The Actual Image */}
          {item.image_url && !imgError && (
            <img
              src={item.image_url}
              alt={item.name}
              loading="lazy"
              onLoad={() => setIsLoaded(true)}
              onError={() => setImgError(true)}
              className={cn(
                "absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out",
                isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-110"
              )}
            />
          )}
        </div>

        <div className="flex flex-col justify-between flex-1 min-w-0 py-1">
          <div>
            <div className="flex items-start justify-between gap-2 w-full text-left">
              <div className="flex items-center gap-1.5 min-w-0">
                <VegBadge type={item.item_type || "veg"} />
                <h3 className="font-semibold text-foreground text-base leading-tight font-sans line-clamp-2 tracking-tight">
                  {item.name}
                </h3>
              </div>
              {!item.available && (
                <Badge
                  variant="secondary"
                  className="text-[10px] shrink-0 bg-destructive/20 text-destructive border-none"
                >
                  Sold Out
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-2 gap-2">
            <p className="text-primary font-bold text-lg font-sans truncate min-w-0">
              ${item.price.toFixed(2)}
            </p>

            {item.available && (
              <div
                className="flex items-center gap-1.5 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                {quantity > 0 && (
                  <>
                    <button
                      onClick={onRemove}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-muted hover:bg-destructive/20 hover:text-destructive transition-all active:scale-90"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-bold w-6 text-center text-foreground tabular-nums">
                      {quantity}
                    </span>
                  </>
                )}
                <button
                  onClick={onAdd}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/80 transition-all active:scale-90"
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
