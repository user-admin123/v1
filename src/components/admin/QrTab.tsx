import { useRef } from "react";
import { RestaurantInfo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Eye, Printer, Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  restaurant: RestaurantInfo;
  menuUrl: string;
  onViewFullscreen: () => void;
}

const QrTab = ({ restaurant, menuUrl, onViewFullscreen }: Props) => {
  const qrRef = useRef<HTMLDivElement>(null);

  // Helper to extract clean color values for external windows/canvas
  const getThemeColor = (variable: string, fallback: string) => {
    if (typeof window === "undefined") return fallback;
    const root = document.documentElement;
    const color = getComputedStyle(root).getPropertyValue(variable).trim();
    if (!color) return fallback;
    // If it's HSL (common in shadcn), we wrap it. If not, return as is.
    return color.includes(" ") ? `hsl(${color})` : color;
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;

    // Clone and strip logo from the QR for the printed version
    const svgClone = svgEl.cloneNode(true) as SVGElement;
    const logoInQr = svgClone.querySelector("image");
    if (logoInQr) logoInQr.remove();
    const svgData = new XMLSerializer().serializeToString(svgClone);

    const primaryColor = getThemeColor("--primary", "#000000");
    const textColor = getThemeColor("--foreground", "#000000");

    printWindow.document.write(`
      <html><head><title>Print Menu QR</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        body { font-family: 'Inter', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .card { text-align: center; padding: 40px; width: 100%; max-width: 400px; }
        h1 { margin: 0; font-size: 32px; font-weight: 900; color: ${textColor}; text-transform: uppercase; }
        .tagline { margin: 8px 0 30px; color: #666; font-size: 16px; font-weight: 500; }
        .qr-box { border: 3px solid ${primaryColor}; border-radius: 24px; padding: 20px; display: inline-block; margin-bottom: 20px; }
        .cta { font-size: 20px; font-weight: 700; color: ${primaryColor}; margin: 10px 0; }
        .url { font-size: 12px; color: #999; word-break: break-all; }
      </style></head>
      <body>
        <div class="card">
          <h1>${restaurant.name}</h1>
          ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
          <div class="qr-box">${svgData}</div>
          <p class="cta">SCAN TO VIEW MENU</p>
          <p class="url">${menuUrl}</p>
        </div>
        <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const handleShare = async () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 1000;
    const primary = getThemeColor("--primary", "#7c3aed");

    // 1. Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Restaurant Info (No Logos)
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.font = "bold 60px sans-serif";
    ctx.fillText(restaurant.name.toUpperCase(), canvas.width / 2, 200);

    if (restaurant.tagline) {
      ctx.fillStyle = "#666666";
      ctx.font = "500 28px sans-serif";
      ctx.fillText(restaurant.tagline, canvas.width / 2, 250);
    }

    // 3. Clean QR (Stripping center logo)
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;
    const svgClone = svgEl.cloneNode(true) as SVGElement;
    const logoInQr = svgClone.querySelector("image");
    if (logoInQr) logoInQr.remove();

    const svgData = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = async () => {
      // Draw QR Frame
      ctx.strokeStyle = primary;
      ctx.lineWidth = 6;
      ctx.strokeRect(175, 330, 450, 450);

      // Draw QR Code
      ctx.drawImage(img, 210, 365, 380, 380);

      // 4. Modern CTA
      ctx.fillStyle = primary;
      ctx.font = "bold 36px sans-serif";
      ctx.fillText("SCAN FOR LIVE MENU", canvas.width / 2, 860);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "menu-qr.png", { type: "image/png" });

        if (navigator.share) {
          try {
            await navigator.share({
              title: `${restaurant.name} Menu`,
              text: `Check out our live menu here: ${menuUrl}`, // Message + URL
              files: [file], // Image
            });
          } catch (e) {
            toast({ title: "Sharing cancelled" });
          }
        }
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    img.src = url;
  };

  return (
    <div className="mt-3 flex flex-col items-center gap-6">
      {/* UI Visual QR */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-border" ref={qrRef}>
        <QRCodeSVG
          value={menuUrl}
          size={180}
          level="H"
          imageSettings={
            restaurant.show_qr_logo !== false && restaurant.logo_url
              ? { src: restaurant.logo_url, height: 34, width: 34, excavate: true }
              : undefined
          }
        />
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">Your menu QR code</p>
        {restaurant.show_qr_logo !== false && restaurant.logo_url && (
          <span className="text-xs text-primary font-medium flex items-center justify-center gap-1 mt-1">
            Logo embedded ✓
          </span>
        )}
      </div>

      <Button className="w-full h-12 text-base font-semibold rounded-xl" onClick={onViewFullscreen}>
        <Eye className="w-5 h-5 mr-2" /> View QR Display
      </Button>

      <div className="flex gap-3 w-full">
        <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" /> Print
        </Button>
        <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-2" /> Share
        </Button>
      </div>
    </div>
  );
};

export default QrTab;
