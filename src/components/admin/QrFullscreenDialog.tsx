import { useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { RestaurantInfo } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  restaurant: RestaurantInfo;
  menuUrl: string;
}

const QrFullscreenDialog = ({ open, onClose, restaurant, menuUrl }: Props) => {
  const lastClick = useRef(0);

  const handleClick = useCallback(() => {
    const now = Date.now();
    if (now - lastClick.current < 400) {
      onClose();
      lastClick.current = 0;
    } else {
      lastClick.current = now;
    }
  }, [onClose]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-full h-full sm:max-w-full sm:h-full sm:rounded-none border-none bg-background p-0 flex items-center justify-center [&>button]:hidden"
        onClick={handleClick}
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">QR Code Fullscreen</DialogTitle>
        <div className="flex flex-col items-center justify-center gap-6 p-8 text-center">
          {restaurant.logo_url && (
            <img
              src={restaurant.logo_url}
              alt={restaurant.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-primary/30"
            />
          )}
          <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            {restaurant.name}
          </h2>
          {restaurant.tagline && (
            <p className="text-muted-foreground text-base italic -mt-4">
              {restaurant.tagline}
            </p>
          )}
          <div className="bg-white p-8 rounded-3xl shadow-2xl">
            <QRCodeSVG
              value={menuUrl}
              size={260}
              level="H"
              imageSettings={
                restaurant.show_qr_logo !== false && restaurant.logo_url
                  ? { src: restaurant.logo_url, height: 48, width: 48, excavate: true }
                  : undefined
              }
            />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold text-primary">
              📱 Scan me to get the live menu!
            </p>
            <p className="text-xs text-muted-foreground">{menuUrl}</p>
          </div>
          <p className="text-xs text-muted-foreground/60 mt-4">
            Double-click anywhere to close
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QrFullscreenDialog;
