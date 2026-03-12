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

  // Robust image loader for Canvas/Share
  const loadSafeImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; 
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Image load failed"));
      // Add a cache-busting timestamp if it's an external URL to force a fresh CORS check
      const separator = url.includes('?') ? '&' : '?';
      img.src = url.startsWith('http') ? `${url}${separator}t=${Date.now()}` : url;
    });
  };

  const handlePrint = () => {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const primaryColor = getPrimaryColor();

    // We use a base64 or direct URL, but ensure the window stays open long enough
    printWindow.document.write(`
      <html>
        <head>
          <title>${restaurant.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;700&display=swap');
            @page { size: auto; margin: 0mm !important; }
            html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #fff; }
            .card { background: white; border-radius: 32px; padding: 60px 40px; text-align: center; border: 8px solid hsl(${primaryColor}); width: 450px; max-height: 96vh; display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; }
            .logo { width: 80px; height: 80px; border-radius: 16px; object-fit: cover; border: 1px solid #eee; margin-bottom: 15px; display: block; }
            h2 { font-family: 'Playfair Display', serif; font-size: 38px; color: #000; margin: 0 0 8px 0; }
            .tagline { color: #666; font-size: 18px; font-style: italic; margin-bottom: 30px; }
            .qr-wrap { display: inline-block; padding: 20px; border-radius: 24px; border: 2px solid #f0f0f0; margin: 10px 0; background: white; }
            .qr-wrap svg { width: 250px !important; height: 250px !important; }
            .scan-text { margin-top: 30px; font-size: 20px; font-weight: 700; color: #000; }
          </style>
        </head>
        <body>
          <div class="card">
            ${restaurant.logo_url ? `<img src="${restaurant.logo_url}" class="logo" crossorigin="anonymous" />` : ""}
            <h2>${restaurant.name}</h2>
            ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
            <div class="qr-wrap">${svgData}</div>
            <p class="scan-text">Scan to view our digital menu</p>
          </div>
          <script>
            // Improved loader for print window
            const img = document.querySelector('.logo');
            const doPrint = () => setTimeout(() => { window.print(); }, 1000);
            if (img && !img.complete) {
              img.onload = doPrint;
              img.onerror = doPrint;
            } else {
              doPrint();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleShare = async () => {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;
    
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 900;
    canvas.height = 1200;

    const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number, stroke = false) => {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
      stroke ? ctx.stroke() : ctx.fill();
    };

    const drawAutoText = (text: string, y: number, baseSize: number, minSize: number, font: string, color: string) => {
      let size = baseSize;
      ctx.font = `bold ${size}px ${font}`;
      if (font.includes('italic')) ctx.font = `italic ${size}px sans-serif`;
      
      while (ctx.measureText(text).width > 800 && size > minSize) {
        size -= 2;
        ctx.font = font.includes('italic') ? `italic ${size}px sans-serif` : `bold ${size}px ${font}`;
      }
      ctx.fillStyle = color;
      ctx.fillText(text, canvas.width / 2, y);
    };

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = `hsl(${getPrimaryColor()})`;
    ctx.lineWidth = 16;
    drawRoundedRect(40, 40, canvas.width - 80, canvas.height - 80, 60, true);

    ctx.textAlign = "center";
    drawAutoText(restaurant.name, 240, 72, 32, "serif", "#000000");
    if (restaurant.tagline) drawAutoText(restaurant.tagline, 310, 36, 22, "italic", "#666666");

    try {
      // 1. Draw QR Code
      const svgString = new XMLSerializer().serializeToString(svgEl);
      const qrUrl = URL.createObjectURL(new Blob([svgString], { type: "image/svg+xml;charset=utf-8" }));
      const qrImg = await loadSafeImage(qrUrl);
      
      const x = (canvas.width - 500) / 2, y = 400;
      ctx.fillStyle = "#FFFFFF";
      drawRoundedRect(x - 30, y - 30, 560, 560, 40);
      ctx.strokeStyle = "#f0f0f0";
      ctx.lineWidth = 4;
      drawRoundedRect(x - 30, y - 30, 560, 560, 40, true);
      ctx.drawImage(qrImg, x, y, 500, 500);
      URL.revokeObjectURL(qrUrl);

      // 2. Draw Top Logo and Center Logo
      if (restaurant.logo_url) {
        try {
          const logoImg = await loadSafeImage(restaurant.logo_url);
          
          // Draw Top Logo (above name)
          ctx.save();
          const topSize = 100;
          const tx = (canvas.width - topSize) / 2;
          const ty = 80;
          // Create rounded clip for top logo
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(tx, ty, topSize, topSize, 20);
          ctx.clip();
          ctx.drawImage(logoImg, tx, ty, topSize, topSize);
          ctx.restore();

          // Draw Center Logo (inside QR)
          if (restaurant.show_qr_logo !== false) {
            const s = 110, lx = (canvas.width - s) / 2, ly = y + (500 - s) / 2;
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(lx - 8, ly - 8, s + 16, s + 16);
            ctx.drawImage(logoImg, lx, ly, s, s);
          }
        } catch (e) {
          console.warn("Logo failed for share canvas.");
        }
      }

      ctx.fillStyle = "#000000";
      ctx.font = "bold 44px sans-serif";
      ctx.fillText("Scan to view our digital menu", canvas.width / 2, 1080);
      
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

    } catch (err) {
      console.error("Share process failed", err);
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
          imageSettings={hasEmbeddedLogo ? { 
            src: restaurant.logo_url!, 
            height: 38, width: 38, excavate: true,
          } : undefined}
        />
      </div>
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Your menu QR code</p>
        {hasEmbeddedLogo && <p className="text-xs text-primary font-medium mt-1">Logo embedded ✓</p>}
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
