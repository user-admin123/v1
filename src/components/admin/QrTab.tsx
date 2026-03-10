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

  // --- REVERTED & FIXED PRINT FUNCTION ---
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;
    
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const primaryColor = getThemeColor("--primary");

    printWindow.document.write(`
      <html><head><title>Menu QR - ${restaurant.name}</title>
      <style>
        @page { margin: 0; size: auto; }
        body { 
          margin: 0; padding: 0; display: flex; flex-direction: column; align-items: center; 
          justify-content: center; min-height: 100vh; font-family: sans-serif;
          background: #ffffff;
        }
        .card { 
          background: white; border-radius: 40px; padding: 40px; text-align: center; 
          border: 4px solid ${primaryColor}; max-width: 350px; width: 90%;
          box-sizing: border-box;
        }
        .logo { width: 70px; height: 70px; border-radius: 50%; object-fit: cover; margin-bottom: 12px; border: 2px solid ${primaryColor}; }
        h2 { font-size: 26px; color: #1a1a2e; margin: 0 0 4px 0; }
        .tagline { color: #888; font-size: 14px; font-style: italic; margin-bottom: 20px; }
        .qr-wrap { display: inline-block; padding: 10px; border: 1px solid #eee; border-radius: 16px; background: white; }
        .qr-wrap svg { width: 230px; height: 230px; }
        .scan-text { margin-top: 20px; font-size: 18px; font-weight: bold; color: ${primaryColor}; }
        .url { font-size: 11px; color: #aaa; margin-top: 8px; word-break: break-all; }
      </style></head>
      <body>
        <div class="card">
          ${restaurant.logo_url ? `<img src="${restaurant.logo_url}" class="logo" />` : ""}
          <h2>${restaurant.name}</h2>
          ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
          <div class="qr-wrap">${svgData}</div>
          <p class="scan-text">📱 Scan to view menu!</p>
          <p class="url">${menuUrl}</p>
        </div>
        <script>setTimeout(()=>{window.print(); window.close();}, 500);</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  // --- MODERN SHARE FUNCTION WITH LOGO FIX ---
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

    // 1. White Background with Rounded Corners
    ctx.fillStyle = "#ffffff";
    const r = 80;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.lineTo(size-r, 0); ctx.quadraticCurveTo(size, 0, size, r);
    ctx.lineTo(size, size-r); ctx.quadraticCurveTo(size, size, size-r, size);
    ctx.lineTo(r, size); ctx.quadraticCurveTo(0, size, 0, size-r);
    ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.fill();
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 20;
    ctx.stroke();

    // 2. Prepare SVG and Logo
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    
    const qrImg = new Image();
    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";

    const drawAll = () => {
      // Draw Text
      ctx.textAlign = "center";
      ctx.fillStyle = "#000000";
      ctx.font = "bold 55px sans-serif";
      ctx.fillText(restaurant.name, size / 2, 180);
      
      if (restaurant.tagline) {
        ctx.font = "italic 32px sans-serif";
        ctx.fillStyle = "#666666";
        ctx.fillText(restaurant.tagline, size / 2, 230);
      }

      // Draw the QR Code (The SVG usually already has the logo embedded)
      ctx.drawImage(qrImg, 250, 300, 500, 500);

      // 3. FORCE CENTER LOGO (If missing from SVG draw)
      if (restaurant.show_qr_logo !== false && restaurant.logo_url) {
        const lSize = 110;
        const cx = size / 2;
        const cy = 550; // Middle of QR
        ctx.fillStyle = "white";
        ctx.fillRect(cx - lSize / 2 - 5, cy - lSize / 2 - 5, lSize + 10, lSize + 10);
        try {
          ctx.drawImage(logoImg, cx - lSize / 2, cy - lSize / 2, lSize, lSize);
        } catch (e) { console.error("CORS prevented drawing logo to share image"); }
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
              text: `View our live menu: ${menuUrl}`,
            });
          } catch (e) {}
        }
        URL.revokeObjectURL(url);
      }, "image/png");
    };

    qrImg.onload = () => {
      if (restaurant.logo_url) {
        logoImg.onload = drawAll;
        logoImg.onerror = drawAll;
        logoImg.src = restaurant.logo_url + "?not-cached"; // Bypass browser cache
      } else {
        drawAll();
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
