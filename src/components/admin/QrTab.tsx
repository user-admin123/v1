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
    if (typeof window === "undefined") return "#7c3aed";
    const val = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    return val ? `hsl(${val})` : "#7c3aed";
  };

  // Helper to convert any image URL to a Base64 string to bypass CORS/Security
  const getBase64Image = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.setAttribute("crossOrigin", "anonymous");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = url + (url.includes("?") ? "&" : "?") + "no-cache=" + Date.now();
    });
  };

  const handlePrint = async () => {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;

    const primaryColor = getThemeColor("--primary");
    let logoBase64 = "";
    
    if (restaurant.logo_url) {
      try {
        logoBase64 = await getBase64Image(restaurant.logo_url);
      } catch (e) { console.error("Logo failed to load for print", e); }
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Use a clean SVG without the internal image tag for the printer
    const svgClone = svgEl.cloneNode(true) as SVGElement;
    svgClone.querySelector("image")?.remove();
    const svgData = new XMLSerializer().serializeToString(svgClone);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            @page { margin: 0; size: portrait; }
            body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: system-ui, sans-serif; }
            .card { 
              border: 4px solid ${primaryColor}; padding: 40px; border-radius: 40px; 
              text-align: center; width: 340px; box-sizing: border-box; background: white;
            }
            .main-logo { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 10px; border: 2px solid ${primaryColor}; }
            h2 { margin: 5px 0; font-size: 26px; font-weight: 800; }
            .tagline { color: #666; font-size: 14px; margin-bottom: 25px; }
            .qr-container { position: relative; display: inline-block; width: 240px; height: 240px; }
            .qr-container svg { width: 100%; height: 100%; }
            .qr-logo { 
              position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
              width: 48px; height: 48px; background: white; border-radius: 8px; padding: 3px; 
            }
            .scan-text { margin-top: 30px; font-weight: bold; color: ${primaryColor}; font-size: 20px; }
            .url { font-size: 11px; color: #999; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="card">
            ${logoBase64 ? `<img src="${logoBase64}" class="main-logo" />` : ""}
            <h2>${restaurant.name}</h2>
            ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
            <div class="qr-container">
              ${svgData}
              ${logoBase64 && restaurant.show_qr_logo !== false ? `<img src="${logoBase64}" class="qr-logo" />` : ""}
            </div>
            <div class="scan-text">SCAN FOR MENU</div>
            <div class="url">${menuUrl}</div>
          </div>
          <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };</script>
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

    // 1. Draw Professional Card
    ctx.fillStyle = "#ffffff";
    // Manual rounded rect for max compatibility
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

    // 2. Prepare QR and Logo
    let logoBase64 = "";
    if (restaurant.logo_url) {
      try { logoBase64 = await getBase64Image(restaurant.logo_url); } catch(e) {}
    }

    const svgClone = svgEl.cloneNode(true) as SVGElement;
    svgClone.querySelector("image")?.remove();
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const svgUrl = URL.createObjectURL(new Blob([svgData], { type: "image/svg+xml" }));

    const qrImg = new Image();
    qrImg.onload = () => {
      // Draw Text
      ctx.textAlign = "center";
      ctx.fillStyle = "#000000";
      ctx.font = "bold 60px sans-serif";
      ctx.fillText(restaurant.name, size / 2, 200);
      
      if (restaurant.tagline) {
        ctx.font = "34px sans-serif";
        ctx.fillStyle = "#666666";
        ctx.fillText(restaurant.tagline, size / 2, 260);
      }

      // Draw QR
      ctx.drawImage(qrImg, 250, 330, 500, 500);

      // Compulsory Center Logo
      if (logoBase64 && restaurant.show_qr_logo !== false) {
        const logoImg = new Image();
        logoImg.onload = () => {
          const lSize = 120;
          const cx = size / 2;
          const cy = 580;
          ctx.fillStyle = "white";
          ctx.beginPath();
          ctx.roundRect ? ctx.roundRect(cx - lSize/2 - 5, cy - lSize/2 - 5, lSize + 10, lSize + 10, 10) : ctx.rect(cx - lSize/2 - 5, cy - lSize/2 - 5, lSize + 10, lSize + 10);
          ctx.fill();
          ctx.drawImage(logoImg, cx - lSize / 2, cy - lSize / 2, lSize, lSize);
          finishShare();
        };
        logoImg.src = logoBase64;
      } else {
        finishShare();
      }
    };

    const finishShare = () => {
      ctx.fillStyle = primaryColor;
      ctx.font = "bold 45px sans-serif";
      ctx.fillText("SCAN TO VIEW MENU", size / 2, 900);

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
          } catch (e) {}
        }
        URL.revokeObjectURL(svgUrl);
      }, "image/png");
    };

    qrImg.src = svgUrl;
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
        <p className="text-sm text-muted-foreground">Your menu QR code</p>
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
