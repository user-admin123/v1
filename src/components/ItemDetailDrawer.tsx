import { useState, useEffect } from "react";
import { MenuItem } from "@/lib/types";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import VegBadge from "@/components/VegBadge";
import { formatDescription } from "@/lib/formatDescription";
import { cn } from "@/lib/utils";

interface Props {
  item: MenuItem | null;
  onClose: () => void;
}

const ItemDetailDrawer = ({ item, onClose }: Props) => {
  // 1. Logic Change: Start as false, set to true ONLY on successful load
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
  }, [item?.id]);

  if (!item) return null;

  return (
    <Drawer open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="glass-card border-t border-x border-border/30 max-h-[85vh] max-w-md mx-auto overflow-hidden">
        
        {/* 2. Container only shows if isLoaded is true. 
               This prevents the "empty box" flicker. */}
        {item.image_url && (
          <div className={cn(
            "w-full overflow-hidden bg-muted/20 transition-all duration-300",
            isLoaded ? "h-56 md:h-72 opacity-100" : "h-0 opacity-0"
          )}>
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full h-full object-cover"
              onLoad={() => setIsLoaded(true)} // Only show when verified
              onError={() => setIsLoaded(false)} // Hide if link is broken
            />
          </div>
        )}

        <div className="overflow-y-auto max-h-[50vh] overscroll-contain">
          <DrawerHeader className="px-6 pt-5 pb-6 text-left">
            {!item.description && (
              <DrawerDescription className="sr-only">
                Details and pricing for {item.name}
              </DrawerDescription>
            )}

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <VegBadge type={item.item_type || "veg"} size="md" />
                <DrawerTitle className="text-2xl text-foreground font-sans tracking-tight">
                  {item.name}
                </DrawerTitle>
              </div>

              {!item.available && (
                <Badge
                  variant="secondary"
                  className="bg-destructive/20 text-destructive border-none shrink-0"
                >
                  Sold Out
                </Badge>
              )}
            </div>

            <p className="text-primary font-bold text-2xl font-sans mt-1">
              ${item.price.toFixed(2)}
            </p>

            {item.description && (
              <DrawerDescription asChild>
                <div className="mt-3 text-muted-foreground leading-relaxed">
                  {formatDescription(item.description)}
                </div>
              </DrawerDescription>
            )}
          </DrawerHeader>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ItemDetailDrawer;
