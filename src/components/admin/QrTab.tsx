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

  // Helper to load images for Canvas
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  };

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

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const primary = getPrimaryColor();
      let logoData = null;
      let useFull = !restaurant.logo_url || restaurant.show_qr_logo === false;

      if (!useFull && restaurant.logo_url) {
        logoData = await getBase64(restaurant.logo_url);
        if (!logoData) {
          toast.error("Logo load failed. Generating full QR code...");
          useFull = true;
        }
      }

      const svgToUse = useFull ? hiddenFullQrRef.current : qrRef.current;
      const svgElement = svgToUse?.querySelector("svg");
      if (!svgElement) throw new Error("SVG not found");
      const svgData = new XMLSerializer().serializeToString(svgElement);

      const pw = window.open("", "_blank");
      if (!pw) return;

      pw.document.write(`
        <html>
          <head>
            <title>${restaurant.name}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;700&display=swap');
              @page { size: auto; margin: 0mm !important; }
              html, body { margin: 0; padding: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #fff; font-family: 'Inter', sans-serif; }
              .card { background: white; border-radius: 32px; padding: 60px 40px; text-align: center; border: 8px solid hsl(${primary}); width: 450px; box-sizing: border-box; }
              .logo { width: 80px; height: 80px; border-radius: 16px; object-fit: cover; border: 1px solid #eee; margin-bottom: 15px; }
              h2 { font-family: 'Playfair Display', serif; font-size: 38px; color: #000; margin: 0 0 8px 0; line-height: 1.2; }
              .tagline { color: #666; font-size: 18px; font-style: italic; margin-bottom: 30px; }
              .qr-wrap { display: inline-block; padding: 20px; border-radius: 24px; border: 2px solid #f0f0f0; background: white; }
              .qr-wrap svg { width: 250px !important; height: 250px !important; }
              .scan-text { margin-top: 30px; font-size: 20px; font-weight: 700; }
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
            <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };</script>
          </body>
        </html>
      `);
      pw.document.close();
    } catch (err) {
      toast.error("Print failed");
    } finally {
      setIsPrinting(false);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      await document.fonts.ready;
      const cvs = document.createElement("canvas");
      const ctx = cvs.getContext("2d", { alpha: false });
      if (!ctx) throw new Error("Canvas context failed");

      const primaryColor = getPrimaryColor();
      cvs.width = 900;
      cvs.height = 1200;

      // Background & Border
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 900, 1200);
      ctx.strokeStyle = `hsl(${primaryColor})`;
      ctx.lineWidth = 16;
      if (ctx.roundRect) ctx.roundRect(40, 40, 820, 1120, 60); else ctx.rect(40, 40, 820, 1120);
      ctx.stroke();

      ctx.textAlign = "center";
      let currentY = 180;
      const maxWidth = 780;

      // 1. Name
      let nameFontSize = 72;
      ctx.font = `bold ${nameFontSize}px sans-serif`;
      while (ctx.measureText(restaurant.name).width > maxWidth && nameFontSize > 32) {
        nameFontSize -= 2;
        ctx.font = `bold ${nameFontSize}px sans-serif`;
      }
      ctx.fillStyle = "#000000";
      ctx.fillText(restaurant.name, 450, currentY);

      currentY += 70;

      // 2. Tagline
      if (restaurant.tagline) {
        let taglineFontSize = 36;
        ctx.font = `italic ${taglineFontSize}px sans-serif`;
        while (ctx.measureText(restaurant.tagline).width > maxWidth && taglineFontSize > 20) {
          taglineFontSize -= 2;
          ctx.font = `italic ${taglineFontSize}px sans-serif`;
        }
        ctx.fillStyle = "#666666";
        ctx.fillText(restaurant.tagline, 450, currentY);
        currentY += 80;
      } else {
        currentY += 20;
      }

      // 3. QR Generation
      let useFull = !restaurant.logo_url || restaurant.show_qr_logo === false;
      const svgToUse = useFull ? hiddenFullQrRef.current : qrRef.current;
      const svgElement = svgToUse?.querySelector("svg");
      if (!svgElement) throw new Error("SVG reference missing");
      
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const qrUrl = URL.createObjectURL(svgBlob);

      const qrImg = await loadImage(qrUrl);
      const qrY = currentY + 30;
      ctx.drawImage(qrImg, 200, qrY, 500, 500);
      URL.revokeObjectURL(qrUrl);

      // 4. Logo Overlay (Canvas logic)
      if (!useFull && restaurant.logo_url) {
        try {
          const logoImg = await loadImage(restaurant.logo_url);
          const size = 120;
          const x = 450 - size / 2;
          const y = qrY + 250 - size / 2;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(x - 8, y - 8, size + 16, size + 16);
          ctx.drawImage(logoImg, x, y, size, size);
        } catch (e) {
          console.warn("Logo overlay failed on canvas", e);
        }
      }

      // 5. Footer Text
      ctx.fillStyle = "#000000";
      ctx.font = "bold 44px sans-serif";
      ctx.fillText("Scan to view our digital menu", 450, 1060);

      // 6. Share / Download
      cvs.toBlob(async (blob) => {
        if (!blob) return;
        const f = new File([blob], `${restaurant.name.replace(/\s+/g, '-').toLowerCase()}-menu.png`, { type: "image/png" });
        
        try {
          if (navigator.share && navigator.canShare?.({ files: [f] })) {
            await navigator.share({
              files: [f],
              title: restaurant.name,
              text: `Check out our menu at ${restaurant.name}!`
            });
          } else {
            const a = document.createElement('a');
            a.href = cvs.toDataURL("image/png");
            a.download = f.name;
            a.click();
          }
        } catch (err: any) {
          if (err.name !== 'AbortError') toast.error("Sharing failed");
        }
        setIsSharing(false);
      }, "image/png");

    } catch (e) {
      console.error(e);
      toast.error("Process failed");
      setIsSharing(false);
    }
  };

  const hasEmbeddedLogo = restaurant.show_qr_logo !== false && !!restaurant.logo_url;

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      <div className="bg-white p-6 rounded-2xl border shadow-sm" ref={qrRef}>
        <QRCodeSVG 
          value={menuUrl} 
          size={200} 
          level="H"
          imageSettings={hasEmbeddedLogo ? { 
            src: restaurant.logo_url!, 
            height: 40, 
            width: 40, 
            excavate: true 
          } : undefined}
        />
      </div>
      
      {/* Hidden high-quality QR without logo for fallback */}
      <div className="hidden" ref={hiddenFullQrRef}>
        <QRCodeSVG value={menuUrl} size={500} level="H" />
      </div>
      
      <div className="text-center">
        <p className="text-sm text-muted-foreground font-medium">{restaurant.name}</p>
        {hasEmbeddedLogo && <p className="text-[10px] text-green-600 font-bold mt-1 uppercase tracking-wider">Logo Verified ✓</p>}
      </div>

      <Button className="w-full" onClick={onViewFullscreen} variant="secondary">
        <Eye className="w-4 h-4 mr-2" />
        Preview Display
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
