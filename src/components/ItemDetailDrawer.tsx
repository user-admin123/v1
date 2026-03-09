import { MenuItem } from "@/lib/types";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import VegBadge from "@/components/VegBadge";
import { formatDescription } from "@/lib/formatDescription";

interface Props {
  item: MenuItem | null;
  onClose: () => void;
}

const ItemDetailDrawer = ({ item, onClose }: Props) => {
  if (!item) return null;

  return (
    <Drawer open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="glass-card border-t border-border/30 max-h-[85vh]">
        {item.image_url && (
          <div className="w-full h-56 md:h-72 overflow-hidden">
            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="overflow-y-auto max-h-[50vh] overscroll-contain">
          <DrawerHeader className="px-6 pt-5 pb-6 text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <VegBadge type={item.item_type || "veg"} size="md" />
                <DrawerTitle className="text-2xl text-foreground text-left">{item.name}</DrawerTitle>
              </div>
              {!item.available && (
                <Badge variant="secondary" className="bg-destructive/20 text-destructive border-none shrink-0">
                  Sold Out
                </Badge>
              )}
            </div>
            <p className="text-primary font-bold text-2xl font-sans mt-1 text-left">
              ${item.price.toFixed(2)}
            </p>
            {item.description && (
              <DrawerDescription asChild>
                <div className="mt-3 text-left">{formatDescription(item.description)}</div>
              </DrawerDescription>
            )}
          </DrawerHeader>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ItemDetailDrawer;
