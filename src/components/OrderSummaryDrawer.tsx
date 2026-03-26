import { CartItem } from "@/hooks/useCart";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  totalPrice: number;
  onAdd: (item: CartItem) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

const OrderSummaryDrawer = ({ open, onClose, cartItems, totalPrice, onAdd, onRemove, onClear }: Props) => {
  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b border-border/40 pb-3">
          <DrawerTitle className="text-lg font-bold">Summary</DrawerTitle>
        </DrawerHeader>

        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">
          {cartItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-10 text-sm">Your summary is empty.</p>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 py-2 border-b border-border/20 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} each</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onRemove(item.id)}
                    className="w-7 h-7 rounded-full flex items-center justify-center bg-muted hover:bg-destructive/20 hover:text-destructive transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                  <button
                    onClick={() => onAdd(item)}
                    className="w-7 h-7 rounded-full flex items-center justify-center bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-sm font-bold text-foreground w-16 text-right">
                  ${(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))
          )}
        </div>

        {cartItems.length > 0 && (
          <DrawerFooter className="border-t border-border/40 pt-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-base font-bold text-foreground">Total</span>
              <span className="text-lg font-bold text-primary">${totalPrice.toFixed(2)}</span>
            </div>
            <Button variant="secondary" size="sm" className="w-auto px-4" onClick={onClear}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear
            </Button>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
};

export default OrderSummaryDrawer;
