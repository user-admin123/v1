import { useRef, useState } from "react";
import { RestaurantInfo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Eye, Printer, Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  restaurant: RestaurantInfo;
  menuUrl: string;
  onViewFullscreen: () => void;
}

const QrTab = ({ restaurant, menuUrl, onViewFullscreen }: Props) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const hiddenFullQrRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const getPrimaryColor = () =>
    getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || "0 0% 0%";

  const getBase64 = async (url: string): Promise<string | null> => {
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) return null;
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch { return null; }
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = src;
    });
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const primary = getPrimaryColor();
      let logoData = null;
      let useFull = !restaurant.logo_url || restaurant.show_qr_logo === false;

      if (!useFull && restaurant.logo_url) {
        logoData = await getBase64(restaurant.logo_url);
        if (!logoData) {
          toast.error("Logo failed to load. Using standard QR.");
          useFull = true;
        }
      }

      const svgToUse = useFull ? hiddenFullQrRef.current : qrRef.current;
      const svgElement = svgToUse?.querySelector("svg");
      if (!svgElement) throw new Error("SVG not found");
      const svgData = new XMLSerializer().serializeToString(svgElement);

      // Create hidden iframe for printing
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) return;

      doc.write(`
        <html>
          <head>
            <title>${restaurant.name} - Menu QR</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;700&display=swap');
              @page { size: auto; margin: 0mm; }
              body { margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: 'Inter', sans-serif; background: #fff; }
              .card { border: 12px solid hsl(${primary}); border-radius: 40px; padding: 60px; text-align: center; width: 450px; }
              .logo { width: 90px; height: 90px; border-radius: 20px; object-fit: cover; margin-bottom: 20px; border: 1px solid #eaeaea; }
              h2 { font-family: 'Playfair Display', serif; font-size: 32px; margin: 0 0 10px 0; color: #000; }
              .tagline { color: #666; font-size: 18px; font-style: italic; margin-bottom: 40px; }
              .qr-wrap svg { width: 280px !important; height: 280px !important; }
              .scan-text { margin-top: 40px; font-size: 22px; font-weight: 700; color: #000; }
            </style>
          </head>
          <body>
            <div class="card">
              ${logoData ? `<img src="${logoData}" class="logo" />` : ""}
              <h2>${restaurant.name}</h2>
              ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
              <div class="qr-wrap">${svgData}</div>
              <p class="scan-text">Scan to view our digital menu</p>
            </div>
          </body>
        </html>
      `);

      doc.close();
      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        document.body.removeChild(iframe);
      }, 500);

    } catch (err) {
      toast.error("Print failed");
      console.error(err);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    let qrUrl = "";
    try {
      await document.fonts.ready;
      const cvs = document.createElement("canvas");
      const ctx = cvs.getContext("2d", { alpha: false });
      if (!ctx) throw new Error("Canvas failure");

      cvs.width = 900;
      cvs.height = 1200;

      // Background & Border
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 900, 1200);
      ctx.strokeStyle = `hsl(${getPrimaryColor()})`;
      ctx.lineWidth = 20;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(40, 40, 820, 1120, 60);
        ctx.stroke();
      } else {
        ctx.strokeRect(40, 40, 820, 1120);
      }

      // Preparation for assets
      let useFull = !restaurant.logo_url || restaurant.show_qr_logo === false;
      const svgToUse = useFull ? hiddenFullQrRef.current : qrRef.current;
      const svgData = new XMLSerializer().serializeToString(svgToUse?.querySelector("svg")!);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      qrUrl = URL.createObjectURL(svgBlob);

      // Load all images in parallel
      const [qrImg, logoImg] = await Promise.all([
        loadImage(qrUrl),
        restaurant.logo_url && !useFull ? loadImage(restaurant.logo_url) : Promise.resolve(null)
      ]);

      // Dynamic Text Placement
      ctx.textAlign = "center";
      let currentY = 180;

      // Draw Name
      ctx.fillStyle = "#000";
      ctx.font = "bold 72px sans-serif";
      ctx.fillText(restaurant.name, 450, currentY);

      // Draw Tagline
      if (restaurant.tagline) {
        currentY += 70;
        ctx.fillStyle = "#666";
        ctx.font = "italic 36px sans-serif";
        ctx.fillText(restaurant.tagline, 450, currentY);
      }

      // Draw QR Code
      const qrY = currentY + 80;
      ctx.drawImage(qrImg, 200, qrY, 500, 500);

      // Draw Center Logo on Canvas
      if (logoImg) {
        const size = 120;
        const x = 450 - size / 2;
        const y = qrY + 250 - size / 2;
        ctx.fillStyle = "#fff";
        ctx.fillRect(x - 5, y - 5, size + 10, size + 10);
        ctx.drawImage(logoImg, x, y, size, size);
      }

      // Footer Text
      ctx.fillStyle = "#000";
      ctx.font = "bold 44px sans-serif";
      ctx.fillText("Scan to view our digital menu", 450, 1080);

      // Native Share or Download
      cvs.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `${restaurant.name}-menu.png`, { type: "image/png" });
        
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: restaurant.name,
            text: `Check out our menu: ${menuUrl}`
          });
        } else {
          const a = document.createElement('a');
          a.href = cvs.toDataURL("image/png");
          a.download = `${restaurant.name}-qr-menu.png`;
          a.click();
        }
      }, "image/png");

    } catch (err: any) {
      if (err.name !== 'AbortError') toast.error("Sharing failed");
      console.error(err);
    } finally {
      if (qrUrl) URL.revokeObjectURL(qrUrl);
      setIsSharing(false);
    }
  };

  const hasEmbeddedLogo = restaurant.show_qr_logo !== false && !!restaurant.logo_url;

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      <div className="bg-white p-6 rounded-2xl border shadow-sm" ref={qrRef}>
        <QRCodeSVG value={menuUrl} size={160} level="H"
          imageSettings={hasEmbeddedLogo ? { src: restaurant.logo_url!, height: 38, width: 38, excavate: true } : undefined}
        />
      </div>
      
      <div className="hidden" ref={hiddenFullQrRef}>
        <QRCodeSVG value={menuUrl} size={160} level="H" />
      </div>
      
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Your menu QR code</p>
        {hasEmbeddedLogo && <p className="text-xs text-primary font-medium mt-1">Logo embedded ✓</p>}
      </div>

      <Button className="w-full" onClick={onViewFullscreen}>
        <Eye className="w-4 h-4 mr-2" />View QR Display
      </Button>
      
      <div className="flex gap-2 w-full">
        <Button variant="outline" className="flex-1" onClick={handlePrint} disabled={isPrinting}>
          {isPrinting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
          Print
        </Button>
        <Button variant="outline" className="flex-1" onClick={handleShare} disabled={isSharing}>
          {isSharing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Share2 className="w-4 h-4 mr-2" />}
          Share
        </Button>
      </div>
    </div>
  );
};

export default QrTab;
