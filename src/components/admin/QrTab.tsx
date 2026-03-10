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

  const handlePrint = () => {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const primaryColor = getThemeColor("--primary");
    // Clone SVG but remove the embedded image tag to prevent print errors
    const svgClone = svgEl.cloneNode(true) as SVGElement;
    const embeddedImg = svgClone.querySelector("image");
    if (embeddedImg) embeddedImg.remove();
    
    const svgData = new XMLSerializer().serializeToString(svgClone);

    printWindow.document.write(`
      <html>
        <head>
          <title>${restaurant.name}</title>
          <style>
            @page { margin: 0; size: auto; }
            body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; }
            .card { border: 3px solid ${primaryColor}; padding: 40px; border-radius: 40px; text-align: center; width: 320px; position: relative; }
            .logo { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 10px; border: 2px solid ${primaryColor}; }
            h2 { margin: 5px 0; font-size: 24px; }
            .tagline { color: #666; font-size: 14px; margin-bottom: 20px; }
            .qr-wrap { position: relative; display: inline-block; }
            .qr-wrap svg { width: 220px; height: 220px; }
            .inner-logo { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 45px; height: 45px; border-radius: 4px; background: white; padding: 2px; }
            .scan-text { margin-top: 20px; font-weight: bold; color: ${primaryColor}; font-size: 18px; }
            .url { font-size: 10px; color: #999; margin-top: 8px; }
          </style>
        </head>
        <body>
          <div class="card">
            ${restaurant.logo_url ? `<img src="${restaurant.logo_url}" class="logo" />` : ""}
            <h2>${restaurant.name}</h2>
            ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
            <div class="qr-wrap">
              ${svgData}
              ${restaurant.logo_url && restaurant.show_qr_logo !== false ? `<img src="${restaurant.logo_url}" class="inner-logo" />` : ""}
            </div>
            <div class="scan-text">SCAN FOR MENU</div>
            <div class="url">${menuUrl}</div>
          </div>
          <script>
            window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };
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
    const size = 1024;
    canvas.width = size;
    canvas.height = size;
    if (!ctx) return;

    const primaryColor = getThemeColor("--primary");

    // 1. Draw Modern Rounded Card
    ctx.fillStyle = "#ffffff";
    const r = 100;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(0, 0, size, size, r) : ctx.rect(0, 0, size, size);
    ctx.fill();
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 20;
    ctx.stroke();

    // 2. Load QR (without logo) and Logo separately to bypass Tainted Canvas
    const svgClone = svgEl.cloneNode(true) as SVGElement;
    const embeddedImg = svgClone.querySelector("image");
    if (embeddedImg) embeddedImg.remove();
    
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const svgUrl = URL.createObjectURL(new Blob([svgData], { type: "image/svg+xml" }));

    const qrImg = new Image();
    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";

    const finalize = () => {
      // Draw Text
      ctx.textAlign = "center";
      ctx.fillStyle = "#000000";
      ctx.font = "bold 60px sans-serif";
      ctx.fillText(restaurant.name, size / 2, 200);
      
      if (restaurant.tagline) {
        ctx.font = "35px sans-serif";
        ctx.fillStyle = "#666666";
        ctx.fillText(restaurant.tagline, size / 2, 260);
      }

      // Draw QR
      ctx.drawImage(qrImg, 262, 330, 500, 500);

      // Draw Logo manually in center (Compulsory)
      if (restaurant.show_qr_logo !== false && restaurant.logo_url) {
        const lSize = 110;
        const cx = size / 2;
        const cy = 330 + 500 / 2;
        
        ctx.fillStyle = "white";
        ctx.fillRect(cx - lSize / 2 - 5, cy - lSize / 2 - 5, lSize + 10, lSize + 10);
        try {
          ctx.drawImage(logoImg, cx - lSize / 2, cy - lSize / 2, lSize, lSize);
        } catch (e) { console.error("CORS Blocked Logo drawing"); }
      }

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
              text: `View our menu here: ${menuUrl}`,
            });
          } catch (e) { /* ignore cancel */ }
        }
      }, "image/png");
    };

    qrImg.onload = () => {
      if (restaurant.logo_url) {
        logoImg.src = restaurant.logo_url + "?t=" + Date.now();
        logoImg.onload = finalize;
        logoImg.onerror = finalize;
      } else {
        finalize();
      }
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
