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

  // Helper to get theme colors from CSS variables
  const getThemeColor = (variable: string) => {
    return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;
    
    const svgData = new XMLSerializer().serializeToString(svgEl);
    
    // Get current theme colors (HSL or Hex depending on your config)
    const primaryColor = `hsl(${getThemeColor("--primary")})`;
    const borderRadius = getThemeColor("--radius") || "0.5rem";

    printWindow.document.write(`
      <html>
        <head>
          <title>Menu QR - ${restaurant.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              display: flex; align-items: center; justify-content: center; 
              min-height: 100vh; font-family: 'Inter', sans-serif;
              background-color: #f8fafc; /* Neutral light bg for printing */
            }
            .card { 
              background: white; 
              border: 2px solid ${primaryColor};
              border-radius: ${borderRadius}; 
              padding: 40px; 
              text-align: center; 
              max-width: 400px; width: 90%;
            }
            .logo { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 16px; border: 2px solid ${primaryColor}; }
            h2 { font-size: 24px; color: #0f172a; margin-bottom: 4px; }
            .tagline { color: #64748b; font-size: 14px; margin-bottom: 24px; }
            .qr-wrap { display: inline-block; padding: 12px; border: 1px solid #e2e8f0; border-radius: 12px; }
            .scan-text { margin-top: 20px; font-size: 16px; font-weight: 600; color: ${primaryColor}; }
            .url { font-size: 12px; color: #94a3b8; margin-top: 8px; word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="card">
            ${restaurant.logo_url ? `<img src="${restaurant.logo_url}" class="logo" />` : ""}
            <h2>${restaurant.name}</h2>
            ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
            <div class="qr-wrap">${svgData}</div>
            <p class="scan-text">Scan to view Menu</p>
            <p class="url">${menuUrl.replace("https://", "")}</p>
          </div>
          <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
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

    // Drawing a themed shareable card
    ctx.fillStyle = "#ffffff";
    ctx.roundRect ? ctx.roundRect(0, 0, size, size, 40) : ctx.fillRect(0, 0, size, size);
    ctx.fill();

    // Convert SVG to Image for Canvas
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    
    const img = new Image();
    img.onload = async () => {
      // Draw QR Code centered (with logo already inside from SVG)
      ctx.drawImage(img, size * 0.2, size * 0.2, size * 0.6, size * 0.6);
      URL.revokeObjectURL(url);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `qr-${restaurant.name}.png`, { type: "image/png" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: restaurant.name,
              text: `Check out the menu for ${restaurant.name}`,
            });
          } catch (e) { console.error(e); }
        } else {
          // Fallback: Download the themed image
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = `${restaurant.name}-menu-qr.png`;
          link.click();
        }
      }, "image/png");
    };
    img.src = url;
  };

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      {/* Visual QR Preview */}
      <div className="bg-white p-6 rounded-2xl border shadow-sm" ref={qrRef}>
        <QRCodeSVG
          value={menuUrl}
          size={180}
          level="H"
          bgColor="#ffffff"
          fgColor="#000000" // QR remains black
          imageSettings={
            restaurant.show_qr_logo !== false && restaurant.logo_url
              ? { src: restaurant.logo_url, height: 36, width: 36, excavate: true }
              : undefined
          }
        />
      </div>

      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground">
          {restaurant.name} QR Code
        </p>
        <p className="text-xs text-muted-foreground">
          Logo embedded & theme-ready
        </p>
      </div>

      <Button className="w-full" onClick={onViewFullscreen}>
        <Eye className="w-4 h-4 mr-2" />
        View QR Display
      </Button>

      <div className="flex gap-2 w-full">
        <Button variant="outline" className="flex-1" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
        <Button variant="outline" className="flex-1" onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-2" />
          Share Image
        </Button>
      </div>
    </div>
  );
};

export default QrTab;
