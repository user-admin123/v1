import { useRef } from "react";
import { RestaurantInfo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Eye, Printer, Share2, CheckCircle2 } from "lucide-react";

interface Props {
  restaurant: RestaurantInfo;
  menuUrl: string;
  onViewFullscreen: () => void;
}

const QrTab = ({ restaurant, menuUrl, onViewFullscreen }: Props) => {
  const qrRef = useRef<HTMLDivElement>(null);

  const getThemeColor = (variable: string) => {
    if (typeof window === "undefined") return "#000000";
    const val = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    // Handles both HSL and HEX formats
    return val.includes(",") ? `hsl(${val})` : val || "#000000";
  };

  const handlePrint = () => {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const primaryColor = getThemeColor("--primary");
    const svgData = new XMLSerializer().serializeToString(svgEl);

    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR - ${restaurant.name}</title>
          <style>
            /* Critical: Removes the blank second page and browser headers */
            @page { margin: 0; size: auto; }
            html, body { margin: 0; padding: 0; height: 100%; width: 100%; overflow: hidden; }
            body { 
              display: flex; align-items: center; justify-content: center; 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            .card { 
              border: 5px solid ${primaryColor}; 
              padding: 40px; 
              border-radius: 40px; 
              text-align: center; 
              width: 320px; 
              background: white;
            }
            .logo { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 12px; border: 2px solid ${primaryColor}; }
            h2 { margin: 0; font-size: 26px; color: #111; }
            .tagline { color: #666; font-size: 14px; margin-top: 4px; margin-bottom: 20px; font-style: italic; }
            .qr-wrap { display: inline-block; padding: 10px; background: white; border: 1px solid #eee; border-radius: 20px; }
            .qr-wrap svg { width: 220px; height: 220px; display: block; }
            .scan-text { margin-top: 24px; font-weight: bold; color: ${primaryColor}; font-size: 18px; }
            .url { font-size: 11px; color: #999; margin-top: 10px; word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="card">
            ${restaurant.logo_url ? `<img src="${restaurant.logo_url}" class="logo" />` : ""}
            <h2>${restaurant.name}</h2>
            ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
            <div class="qr-wrap">${svgData}</div>
            <p class="scan-text">SCAN FOR LIVE MENU</p>
            <p class="url">${menuUrl}</p>
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 400);
            };
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
    const size = 1000;
    canvas.width = size;
    canvas.height = size;
    if (!ctx) return;

    const primaryColor = getThemeColor("--primary");

    // 1. Draw Rounded Professional Card
    ctx.fillStyle = "#ffffff";
    const r = 100;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.lineTo(size-r, 0); ctx.quadraticCurveTo(size, 0, size, r);
    ctx.lineTo(size, size-r); ctx.quadraticCurveTo(size, size, size-r, size);
    ctx.lineTo(r, size); ctx.quadraticCurveTo(0, size, 0, size-r);
    ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.fill();
    
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 20;
    ctx.stroke();

    // 2. Load QR Image
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    
    const qrImg = new Image();
    const logoImg = new Image();

    const drawFinal = () => {
      // Draw Branding
      ctx.textAlign = "center";
      ctx.fillStyle = "#000000";
      ctx.font = "bold 55px sans-serif";
      ctx.fillText(restaurant.name, size / 2, 180);
      
      if (restaurant.tagline) {
        ctx.font = "32px sans-serif";
        ctx.fillStyle = "#666666";
        ctx.fillText(restaurant.tagline, size / 2, 230);
      }

      // Draw QR Code
      ctx.drawImage(qrImg, 250, 310, 500, 500);

      // 3. Draw Base64 Logo in Center (Crucial Step)
      if (restaurant.show_qr_logo !== false && restaurant.logo_url) {
        const lSize = 120;
        const cx = size / 2;
        const cy = 310 + (500 / 2);

        // White background for the logo center
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(cx - lSize/2 - 5, cy - lSize/2 - 5, lSize+10, lSize+10, 15) : ctx.rect(cx - lSize/2 - 5, cy - lSize/2 - 5, lSize+10, lSize+10);
        ctx.fill();

        ctx.drawImage(logoImg, cx - lSize / 2, cy - lSize / 2, lSize, lSize);
      }

      ctx.fillStyle = primaryColor;
      ctx.font = "bold 40px sans-serif";
      ctx.fillText("SCAN TO VIEW MENU", size / 2, 880);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "menu-qr.png", { type: "image/png" });
        if (navigator.share) {
          try {
            await navigator.share({
              files: [file],
              title: restaurant.name,
              text: `Check out our menu: ${menuUrl}`,
            });
          } catch (e) { /* ignore cancel */ }
        }
        URL.revokeObjectURL(url);
      }, "image/png");
    };

    qrImg.onload = () => {
      if (restaurant.logo_url) {
        logoImg.onload = drawFinal;
        logoImg.onerror = drawFinal;
        logoImg.src = restaurant.logo_url; // Works perfectly with Base64
      } else {
        drawFinal();
      }
    };
    qrImg.src = url;
  };

  const showLogoInQr = restaurant.show_qr_logo !== false && restaurant.logo_url;

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      <div className="bg-white p-6 rounded-3xl border shadow-sm" ref={qrRef}>
        <QRCodeSVG
          value={menuUrl}
          size={180}
          level="H"
          imageSettings={
            showLogoInQr
              ? { src: restaurant.logo_url!, height: 40, width: 40, excavate: true }
              : undefined
          }
        />
      </div>

      <div className="flex flex-col items-center gap-1">
        <p className="text-sm text-muted-foreground text-center">Your menu QR code</p>
        {showLogoInQr && (
          <span className="text-xs text-primary flex items-center gap-1 font-semibold">
            <CheckCircle2 className="w-3 h-3" /> Logo embedded ✓
          </span>
        )}
      </div>

      <Button className="w-full rounded-xl" onClick={onViewFullscreen}>
        <Eye className="w-4 h-4 mr-2" /> View QR Display
      </Button>

      <div className="flex gap-2 w-full">
        <Button variant="outline" className="flex-1 rounded-xl" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" /> Print
        </Button>
        <Button variant="outline" className="flex-1 rounded-xl" onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-2" /> Share
        </Button>
      </div>
    </div>
  );
};

export default QrTab;
