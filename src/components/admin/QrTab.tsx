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
    const svgData = new XMLSerializer().serializeToString(svgEl);

    // Using a more robust HTML structure for the print window
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Menu - ${restaurant.name}</title>
          <style>
            body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'Segoe UI', Roboto, sans-serif; background: #ffffff; }
            .card { 
              border: 2px solid #eeeeee; 
              padding: 50px; 
              border-radius: 40px; 
              text-align: center; 
              width: 400px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.05);
            }
            .logo { width: 90px; height: 90px; border-radius: 50%; object-fit: cover; margin-bottom: 20px; border: 3px solid ${primaryColor}; }
            h2 { margin: 0; font-size: 32px; color: #1a1a1a; font-weight: 700; }
            .tagline { color: #666; font-size: 16px; margin: 8px 0 30px; }
            .qr-wrap svg { width: 280px; height: 280px; }
            .scan-text { margin-top: 30px; font-weight: 700; color: ${primaryColor}; font-size: 22px; letter-spacing: 1px; }
            .url { font-size: 13px; color: #aaa; margin-top: 15px; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="card">
            ${restaurant.logo_url ? `<img src="${restaurant.logo_url}" class="logo" />` : ""}
            <h2>${restaurant.name}</h2>
            ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
            <div class="qr-wrap">${svgData}</div>
            <div class="scan-text">SCAN TO VIEW MENU</div>
            <div class="url">${menuUrl.replace("https://", "")}</div>
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                // We don't close immediately to prevent "error printing" in some browsers
              }, 1000);
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
    const size = 1080; // Standard social media size
    canvas.width = size;
    canvas.height = size;
    if (!ctx) return;

    const primaryColor = getThemeColor("--primary");

    // 1. Draw Modern Rounded Background (The "Card")
    ctx.fillStyle = "#f8fafc"; // Light grayish background
    ctx.fillRect(0, 0, size, size);

    // Main Card
    const margin = 60;
    const cardSize = size - margin * 2;
    ctx.shadowColor = "rgba(0,0,0,0.1)";
    ctx.shadowBlur = 50;
    ctx.fillStyle = "#ffffff";
    
    // Function for rounded rectangle
    const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      ctx.fill();
    };
    roundRect(margin, margin, cardSize, cardSize, 80);
    ctx.shadowBlur = 0; // Reset shadow

    // 2. Load Images
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgUrl = URL.createObjectURL(new Blob([svgData], { type: "image/svg+xml" }));
    
    const qrImg = new Image();
    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous"; 

    const drawContent = () => {
      // Draw Text Content
      ctx.textAlign = "center";
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 65px sans-serif";
      ctx.fillText(restaurant.name, size / 2, 230);

      if (restaurant.tagline) {
        ctx.font = "34px sans-serif";
        ctx.fillStyle = "#64748b";
        ctx.fillText(restaurant.tagline, size / 2, 290);
      }

      // Draw the QR Code image
      ctx.drawImage(qrImg, 290, 360, 500, 500);

      // Manual Logo Overlay (Compulsory Fix)
      if (restaurant.show_qr_logo !== false && restaurant.logo_url) {
        const logoSize = 130;
        const centerX = size / 2;
        const centerY = 360 + 500 / 2;

        // White background for logo
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(centerX, centerY, logoSize / 1.7, 0, Math.PI * 2);
        ctx.fill();

        // Clip and Draw Logo
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, logoSize / 2, 0, Math.PI * 2);
        ctx.clip();
        try {
          ctx.drawImage(logoImg, centerX - logoSize / 2, centerY - logoSize / 2, logoSize, logoSize);
        } catch (e) {
          console.error("Logo could not be drawn to canvas due to CORS", e);
        }
        ctx.restore();
      }

      // Footer
      ctx.fillStyle = primaryColor;
      ctx.font = "bold 45px sans-serif";
      ctx.fillText("SCAN TO VIEW MENU", size / 2, 930);

      // Final Process
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "menu.png", { type: "image/png" });
        if (navigator.share) {
          try {
            await navigator.share({
              files: [file],
              title: restaurant.name,
              text: `Check out our menu at ${restaurant.name}: ${menuUrl}`,
            });
          } catch (err) { console.error("Share failed", err); }
        } else {
          // Download fallback
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = `${restaurant.name}-QR.png`;
          link.click();
        }
        URL.revokeObjectURL(svgUrl);
      }, "image/png");
    };

    qrImg.onload = () => {
      if (restaurant.logo_url) {
        logoImg.onload = drawContent;
        logoImg.onerror = drawContent;
        logoImg.src = restaurant.logo_url;
      } else {
        drawContent();
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
