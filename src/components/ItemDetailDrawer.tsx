import { useState } from "react"; // Added for image error handling
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
import { ImageOff } from "lucide-react"; // Added fallback icon

interface Props {
  item: MenuItem | null;
  onClose: () => void;
}

const ItemDetailDrawer = ({ item, onClose }: Props) => {
  const [imgError, setImgError] = useState(false); // Track broken links

  if (!item) return null;

  return (
    <Drawer open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="glass-card border-t border-border/30 max-h-[85vh]">
        {/* Image Section */}
        {item.image_url && !imgError ? (
          <div className="w-full h-56 md:h-72 overflow-hidden">
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)} // Handle broken link
            />
          </div>
        ) : item.image_url && imgError ? (
          /* Fallback UI for broken links */
          <div className="w-full h-40 flex flex-col items-center justify-center bg-muted/30 border-b border-border/50 text-muted-foreground">
            <ImageOff className="w-8 h-8 mb-2 opacity-20" />
            <span className="text-xs font-medium opacity-40">Image not available</span>
          </div>
        ) : null}

        {/* Content Section */}
        <div className="overflow-y-auto max-h-[50vh] overscroll-contain">
          <DrawerHeader className="px-6 pt-5 pb-6 text-left">
            {/* Accessibility Fix: Hidden description for Radix compliance */}
            {!item.description && (
              <DrawerDescription className="sr-only">
                Details and pricing for {item.name}
              </DrawerDescription>
            )}

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <VegBadge type={item.item_type || "veg"} size="md" />
                <DrawerTitle className="text-2xl text-foreground">
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

            {/* Visible Description (if it exists) */}
            {item.description && (
              <DrawerDescription asChild>
                <div className="mt-3">
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
