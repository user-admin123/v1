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
    return val ? `hsl(${val})` : "#7c3aed"; // Fallback to a purple if not found
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
          <title>Print Menu QR</title>
          <style>
            body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: sans-serif; background: #fff; }
            .card { border: 4px solid ${primaryColor}; padding: 40px; border-radius: 30px; text-align: center; width: 350px; }
            .logo { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 15px; border: 2px solid ${primaryColor}; }
            h2 { margin: 10px 0 5px; font-size: 28px; }
            .tagline { color: #666; font-size: 14px; margin-bottom: 20px; }
            .qr-wrap svg { width: 250px; height: 250px; }
            .scan-text { margin-top: 20px; font-weight: bold; color: ${primaryColor}; font-size: 20px; }
            .url { font-size: 12px; color: #888; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="card">
            ${restaurant.logo_url ? `<img src="${restaurant.logo_url}" class="logo" />` : ""}
            <h2>${restaurant.name}</h2>
            ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
            <div class="qr-wrap">${svgData}</div>
            <div class="scan-text">SCAN FOR MENU</div>
            <div class="url">${menuUrl}</div>
          </div>
          <script>
            // This ensures all images are loaded before triggering print
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 300);
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

    // 1. White Background & Theme Border
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 30;
    ctx.strokeRect(50, 50, size - 100, size - 100);

    // 2. Load Images (QR and Logo)
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgUrl = URL.createObjectURL(new Blob([svgData], { type: "image/svg+xml" }));
    
    const qrImg = new Image();
    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous"; // Prevents tainted canvas

    const drawAll = () => {
      // Draw Text
      ctx.textAlign = "center";
      ctx.fillStyle = "#000000";
      ctx.font = "bold 60px sans-serif";
      ctx.fillText(restaurant.name, size / 2, 200);

      if (restaurant.tagline) {
        ctx.font = "30px sans-serif";
        ctx.fillStyle = "#666666";
        ctx.fillText(restaurant.tagline, size / 2, 250);
      }

      // Draw QR Code
      ctx.drawImage(qrImg, 250, 300, 500, 500);

      // Draw Logo manually in center (Compulsory Fix)
      if (restaurant.show_qr_logo !== false && restaurant.logo_url) {
        const logoSize = 120;
        const x = (size - logoSize) / 2;
        const y = (size - logoSize) / 2 + 50; // Shifted slightly for QR alignment
        
        // Draw white circle behind logo
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(size/2, y + logoSize/2, logoSize/1.8, 0, Math.PI * 2);
        ctx.fill();

        // Draw the logo
        ctx.save();
        ctx.beginPath();
        ctx.arc(size/2, y + logoSize/2, logoSize/2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logoImg, x, y, logoSize, logoSize);
        ctx.restore();
      }

      ctx.fillStyle = primaryColor;
      ctx.font = "bold 40px sans-serif";
      ctx.fillText("SCAN TO VIEW MENU", size / 2, 880);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "menu-qr.png", { type: "image/png" });
        if (navigator.share) {
          await navigator.share({
            files: [file],
            title: restaurant.name,
            text: `View our menu here: ${menuUrl}`, // Added URL to message
          });
        }
        URL.revokeObjectURL(svgUrl);
      });
    };

    qrImg.onload = () => {
      if (restaurant.logo_url) {
        logoImg.onload = drawAll;
        logoImg.onerror = drawAll; // Draw anyway if logo fails
        logoImg.src = restaurant.logo_url;
      } else {
        drawAll();
      }
    };
    qrImg.src = svgUrl;
  };

  const showLogoInQr = restaurant.show_qr_logo !== false && restaurant.logo_url;

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      <div className="bg-white p-6 rounded-2xl border shadow-sm" ref={qrRef}>
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
          <span className="text-xs text-primary flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3 h-3" /> Logo embedded ✓
          </span>
        )}
      </div>

      <Button className="w-full" onClick={onViewFullscreen}>
        <Eye className="w-4 h-4 mr-2" /> View QR Display
      </Button>

      <div className="flex gap-2 w-full">
        <Button variant="outline" className="flex-1" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" /> Print
        </Button>
        <Button variant="outline" className="flex-1" onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-2" /> Share
        </Button>
      </div>
    </div>
  );
};

export default QrTab;
