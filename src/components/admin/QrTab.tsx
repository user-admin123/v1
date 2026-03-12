import { useRef, useState } from "react";
import { RestaurantInfo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Eye, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  restaurant: RestaurantInfo;
  menuUrl: string;
  onViewFullscreen: () => void;
}

const QrTab = ({ restaurant, menuUrl, onViewFullscreen }: Props) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const hiddenFullQrRef = useRef<HTMLDivElement>(null);

  const getPrimaryColor = () => 
    getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || "0 0% 0%";

  const handlePrint = async () => {
    // 1. Check if logo exists and try to "pre-fetch" it to check CORS/Existence
    let logoValid = false;
    if (restaurant.logo_url) {
      try {
        const resp = await fetch(restaurant.logo_url, { mode: 'no-cors' });
        logoValid = resp.type !== 'error';
      } catch (e) {
        logoValid = false;
      }
    }

    if (restaurant.logo_url && !logoValid) {
      toast.error("Logo failed to load. Printing menu with text and full QR only.", { position: "top-center" });
    }

    const primaryColor = getPrimaryColor();
    // Use the "Full QR" (no hole) if the logo is invalid or missing
    const svgEl = (!logoValid || !restaurant.show_qr_logo) 
      ? hiddenFullQrRef.current?.querySelector("svg") 
      : qrRef.current?.querySelector("svg");

    if (!svgEl) return;
    
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${restaurant.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;700&display=swap');
            @page { size: auto; margin: 0mm !important; }
            html, body { margin: 0; padding: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #fff; font-family: 'Inter', sans-serif; }
            .card { background: white; border-radius: 32px; padding: 60px 40px; text-align: center; border: 8px solid hsl(${primaryColor}); width: 450px; display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; }
            .logo { width: 80px; height: 80px; border-radius: 16px; object-fit: cover; border: 1px solid #eee; margin-bottom: 15px; }
            h2 { font-family: 'Playfair Display', serif; font-size: 38px; color: #000; margin: 0 0 8px 0; }
            .tagline { color: #666; font-size: 18px; font-style: italic; margin-bottom: 30px; }
            .qr-wrap { display: inline-block; padding: 20px; border-radius: 24px; border: 2px solid #f0f0f0; margin: 10px 0; }
            .qr-wrap svg { width: 250px !important; height: 250px !important; }
            .scan-text { margin-top: 30px; font-size: 20px; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="card">
            ${logoValid ? `<img src="${restaurant.logo_url}" class="logo" crossorigin="anonymous" />` : ""}
            <h2>${restaurant.name}</h2>
            ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
            <div class="qr-wrap">${svgData}</div>
            <p class="scan-text">Scan to view our digital menu</p>
          </div>
          <script>
            window.onload = () => { setTimeout(() => { window.print(); }, 500); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleShare = async () => {
    toast.info("Generating shareable image...", { position: "top-center" });

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

    // UI Drawing
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = `hsl(${getPrimaryColor()})`;
    ctx.lineWidth = 16;
    drawRoundedRect(40, 40, canvas.width - 80, canvas.height - 80, 60, true);
    ctx.textAlign = "center";
    ctx.fillStyle = "#000000";
    ctx.font = "bold 72px serif";
    ctx.fillText(restaurant.name, 450, 220);
    if (restaurant.tagline) {
      ctx.fillStyle = "#666666";
      ctx.font = "italic 36px sans-serif";
      ctx.fillText(restaurant.tagline, 450, 290);
    }

    // Logic to choose between Full QR (hidden) or Logo QR (visible)
    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";
    let useFullQr = true;

    if (restaurant.logo_url && restaurant.show_qr_logo !== false) {
      const isLoaded = await new Promise((resolve) => {
        logoImg.onload = () => resolve(true);
        logoImg.onerror = () => resolve(false);
        logoImg.src = restaurant.logo_url!;
      });
      useFullQr = !isLoaded;
    }

    if (useFullQr && restaurant.logo_url) {
      toast.error("Logo could not be loaded. Generating full QR code.", { position: "top-center" });
    }

    const svgEl = useFullQr 
      ? hiddenFullQrRef.current?.querySelector("svg") 
      : qrRef.current?.querySelector("svg");
    
    if (!svgEl) return;

    const qrUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svgEl)], { type: "image/svg+xml" }));
    const qrImg = new Image();

    qrImg.onload = () => {
      const x = 200, y = 380, s = 500;
      ctx.fillStyle = "#FFFFFF";
      drawRoundedRect(x - 30, y - 30, 560, 560, 40);
      ctx.strokeStyle = "#f0f0f0";
      ctx.lineWidth = 4;
      drawRoundedRect(x - 30, y - 30, 560, 560, 40, true);
      ctx.drawImage(qrImg, x, y, s, s);

      if (!useFullQr) {
        const ls = 110, lx = 450 - ls/2, ly = y + (s - ls)/2;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(lx - 8, ly - 8, ls + 16, ls + 16);
        ctx.drawImage(logoImg, lx, ly, ls, ls);
      }

      ctx.fillStyle = "#000000";
      ctx.font = "bold 44px sans-serif";
      ctx.fillText("Scan to view our digital menu", 450, 1040);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "menu-qr.png", { type: "image/png" });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          try { await navigator.share({ files: [file], title: restaurant.name }); } catch {}
        } else {
          const link = document.createElement('a');
          link.href = canvas.toDataURL();
          link.download = `${restaurant.name}-menu.png`;
          link.click();
        }
      });
      URL.revokeObjectURL(qrUrl);
    };
    qrImg.src = qrUrl;
  };

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      {/* 1. Visible QR (with excavation for the logo) */}
      <div className="bg-white p-6 rounded-2xl border shadow-sm" ref={qrRef}>
        <QRCodeSVG
          value={menuUrl}
          size={160}
          level="H"
          imageSettings={restaurant.logo_url && restaurant.show_qr_logo !== false ? { 
            src: restaurant.logo_url, 
            height: 38, width: 38, 
            excavate: true 
          } : undefined}
        />
      </div>

      {/* 2. Hidden QR (Full version with NO excavation) - Used for fallback */}
      <div className="hidden" ref={hiddenFullQrRef}>
        <QRCodeSVG value={menuUrl} size={160} level="H" />
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">Your menu QR code</p>
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
