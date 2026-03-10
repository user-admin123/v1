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

  // Helper to get theme colors
  const getThemeColor = (variable: string) => {
    if (typeof window === "undefined") return "#000000";
    const val = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    return val ? `hsl(${val})` : "#000000";
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;

    // Serialize SVG carefully
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const primaryColor = getThemeColor("--primary");

    printWindow.document.write(`
      <html>
        <head>
          <title>${restaurant.name} - QR Menu</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            body { 
              margin: 0; display: flex; align-items: center; justify-content: center; 
              min-height: 100vh; font-family: 'Inter', sans-serif; background: #fdfdfd; 
            }
            .card { 
              border: 3px solid ${primaryColor}; padding: 40px; border-radius: 24px;
              text-align: center; background: white; max-width: 380px; width: 90%;
              box-shadow: 0 10px 30px rgba(0,0,0,0.05);
            }
            .logo { width: 70px; height: 70px; border-radius: 50%; object-fit: cover; margin-bottom: 12px; border: 2px solid ${primaryColor}; }
            h2 { margin: 0; font-size: 26px; color: #111; }
            .tagline { color: #666; font-size: 14px; margin: 4px 0 20px 0; font-style: italic; }
            .qr-wrap { display: inline-block; padding: 15px; background: #fff; border: 1px solid #eee; border-radius: 16px; }
            .scan-text { margin-top: 20px; font-weight: 700; color: ${primaryColor}; font-size: 18px; }
            .url { font-size: 11px; color: #999; margin-top: 10px; }
            svg { width: 220px; height: 220px; }
          </style>
        </head>
        <body>
          <div class="card">
            ${restaurant.logo_url ? `<img src="${restaurant.logo_url}" class="logo" />` : ""}
            <h2>${restaurant.name}</h2>
            ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
            <div class="qr-wrap">${svgData}</div>
            <p class="scan-text">📱 Scan to View Menu</p>
            <p class="url">${menuUrl}</p>
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
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

    // 1. Background & Border
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 20;
    ctx.strokeRect(40, 40, size - 80, size - 80);

    // 2. Prepare SVG Image
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const qrImg = new Image();

    qrImg.onload = () => {
      // 3. Draw Text Elements
      ctx.textAlign = "center";
      ctx.fillStyle = "#111111";
      
      // Restaurant Name
      ctx.font = "bold 50px Inter, sans-serif";
      ctx.fillText(restaurant.name, size / 2, 220);

      // Tagline
      if (restaurant.tagline) {
        ctx.font = "italic 30px Inter, sans-serif";
        ctx.fillStyle = "#666666";
        ctx.fillText(restaurant.tagline, size / 2, 270);
      }

      // 4. Draw the QR Code (which already has the logo inside)
      ctx.drawImage(qrImg, 250, 320, 500, 500);

      // 5. Footer Text
      ctx.fillStyle = primaryColor;
      ctx.font = "bold 35px Inter, sans-serif";
      ctx.fillText("📱 SCAN TO VIEW MENU", size / 2, 880);
      
      ctx.fillStyle = "#999999";
      ctx.font = "20px Inter, sans-serif";
      ctx.fillText(menuUrl.replace("https://", ""), size / 2, 930);

      // 6. Finalize and Share
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `menu-${restaurant.name}.png`, { type: "image/png" });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `${restaurant.name} Menu`,
            });
          } catch (e) { console.log("Share cancelled"); }
        } else {
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = `${restaurant.name}-QR.png`;
          link.click();
        }
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    qrImg.src = url;
  };

  const showLogoInQr = restaurant.show_qr_logo !== false && restaurant.logo_url;

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      <div className="bg-white p-6 rounded-2xl border shadow-sm relative" ref={qrRef}>
        <QRCodeSVG
          value={menuUrl}
          size={180}
          level="H"
          imageSettings={
            showLogoInQr
              ? { src: restaurant.logo_url!, height: 38, width: 38, excavate: true }
              : undefined
          }
        />
      </div>

      <div className="flex flex-col items-center gap-1">
        <p className="text-sm text-muted-foreground text-center">
          Your menu QR code
        </p>
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
