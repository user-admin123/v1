import { useRef } from "react";
import { RestaurantInfo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Eye, Printer, Share2 } from "lucide-react";

interface Props {
  restaurant: RestaurantInfo;
  menuUrl: string;
  onViewFullscreen: () => void;
}

const QrTab = ({ restaurant, menuUrl, onViewFullscreen }: Props) => {
  const qrRef = useRef<HTMLDivElement>(null);

  const getPrimaryColor = () => 
    getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || "0 0% 0%";

  // Helper to load any image (URL or Base64) safely for Canvas
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; // Crucial for external URLs
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      // Add a timestamp to bypass cached versions that might not have CORS headers
      img.src = src.startsWith('data:') ? src : `${src}${src.includes('?') ? '&' : '?'}not-cache=${Date.now()}`;
    });
  };

  const handlePrint = () => {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const primaryColor = getPrimaryColor();
    const logoUrl = restaurant.logo_url ? `${restaurant.logo_url}${restaurant.logo_url.includes('?') ? '&' : '?'}t=${Date.now()}` : "";

    printWindow.document.write(`
      <html>
        <head>
          <title>${restaurant.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;700&display=swap');
            @page { size: auto; margin: 0mm !important; }
            html, body { margin: 0; padding: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #fff; }
            .card { background: white; border-radius: 32px; padding: 60px 40px; text-align: center; border: 8px solid hsl(${primaryColor}); width: 450px; display: flex; flex-direction: column; align-items: center; box-sizing: border-box; }
            .logo { width: 80px; height: 80px; border-radius: 16px; object-fit: cover; margin-bottom: 15px; }
            h2 { font-family: 'Playfair Display', serif; font-size: 38px; margin: 0 0 8px 0; }
            .qr-wrap { padding: 20px; border-radius: 24px; border: 2px solid #f0f0f0; margin: 10px 0; }
            .qr-wrap svg { width: 250px !important; height: 250px !important; }
          </style>
        </head>
        <body>
          <div class="card">
            ${logoUrl ? `<img src="${logoUrl}" class="logo" crossorigin="anonymous" />` : ""}
            <h2>${restaurant.name}</h2>
            <div class="qr-wrap">${svgData}</div>
            <p style="font-weight:bold; font-size:20px;">Scan to view our digital menu</p>
          </div>
          <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleShare = async () => {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl || !qrRef.current) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 900;
    canvas.height = 1200;

    // Background & Border
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = `hsl(${getPrimaryColor()})`;
    ctx.lineWidth = 16;
    
    // Rounded Rect Helper
    const r = 60;
    ctx.beginPath();
    ctx.roundRect(40, 40, canvas.width - 80, canvas.height - 80, r);
    ctx.stroke();

    // Text Drawing Helper
    const drawText = (text: string, y: number, font: string, color: string) => {
      ctx.textAlign = "center";
      ctx.fillStyle = color;
      ctx.font = font;
      ctx.fillText(text, canvas.width / 2, y);
    };

    drawText(restaurant.name, 220, "bold 72px serif", "#000000");
    if (restaurant.tagline) drawText(restaurant.tagline, 290, "italic 36px sans-serif", "#666666");

    try {
      // 1. Prepare QR Code Image
      const qrData = new XMLSerializer().serializeToString(svgEl);
      const qrBlob = new Blob([qrData], { type: "image/svg+xml;charset=utf-8" });
      const qrUrl = URL.createObjectURL(qrBlob);
      const qrImg = await loadImage(qrUrl);

      // Draw QR Wrap
      const x = (canvas.width - 500) / 2, y = 380;
      ctx.strokeStyle = "#f0f0f0";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(x - 30, y - 30, 560, 560, 40);
      ctx.stroke();
      ctx.drawImage(qrImg, x, y, 500, 500);
      URL.revokeObjectURL(qrUrl);

      // 2. Load and Draw Logo if exists
      if (restaurant.logo_url && restaurant.show_qr_logo !== false) {
        try {
          const logoImg = await loadImage(restaurant.logo_url);
          const s = 110, lx = (canvas.width - s) / 2, ly = y + (500 - s) / 2;
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(lx - 8, ly - 8, s + 16, s + 16);
          ctx.drawImage(logoImg, lx, ly, s, s);
        } catch (err) {
          console.error("Logo failed to load for canvas:", err);
        }
      }

      drawText("Scan to view our digital menu", 1040, "bold 44px sans-serif", "#000000");

      // 3. Export and Share
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "menu-qr.png", { type: "image/png" });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ 
            files: [file], 
            title: restaurant.name, 
            text: `Check out our menu: ${menuUrl}` 
          });
        }
      }, "image/png");

    } catch (error) {
      console.error("Error generating share image:", error);
    }
  };

  const hasEmbeddedLogo = restaurant.show_qr_logo !== false && !!restaurant.logo_url;

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      <div className="bg-white p-6 rounded-2xl border shadow-sm" ref={qrRef}>
        <QRCodeSVG
          value={menuUrl}
          size={160}
          level="H"
          imageSettings={hasEmbeddedLogo ? { src: restaurant.logo_url!, height: 38, width: 38, excavate: true } : undefined}
        />
      </div>
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Your menu QR code</p>
        {hasEmbeddedLogo && <p className="text-xs text-primary font-medium mt-1">Logo active ✓</p>}
      </div>
      <Button className="w-full" onClick={onViewFullscreen}><Eye className="w-4 h-4 mr-2" />View QR Display</Button>
      <div className="flex gap-2 w-full">
        <Button variant="outline" className="flex-1" onClick={handlePrint}><Printer className="w-4 h-4 mr-2" />Print</Button>
        <Button variant="outline" className="flex-1" onClick={handleShare}><Share2 className="w-4 h-4 mr-2" />Share Image</Button>
      </div>
    </div>
  );
};

export default QrTab;
