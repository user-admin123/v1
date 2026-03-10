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

  // --- PRINT FUNCTION (Restored & Themed) ---
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);

    printWindow.document.write(`
      <html><head><title>Print QR - ${restaurant.name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          display: flex; align-items: center; justify-content: center; 
          min-height: 100vh; font-family: 'Inter', sans-serif; 
          background: #f8fafc; /* Light Gray/Slate Theme */
        }
        .card { 
          background: white; border-radius: 16px; padding: 40px; 
          text-align: center; border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); width: 350px;
        }
        .logo { width: 60px; height: 60px; border-radius: 50%; margin-bottom: 12px; border: 2px solid #e2e8f0; }
        h2 { font-size: 24px; color: #0f172a; margin-bottom: 4px; }
        .tagline { color: #64748b; font-size: 14px; margin-bottom: 20px; }
        .qr-wrap { padding: 12px; background: white; display: inline-block; border: 1px solid #f1f5f9; border-radius: 12px; }
        .scan-text { margin-top: 16px; font-weight: 600; color: #0f172a; }
        .footer { margin-top: 20px; font-size: 11px; color: #94a3b8; }
      </style></head>
      <body>
        <div class="card">
          ${restaurant.logo_url ? `<img src="${restaurant.logo_url}" class="logo"/>` : ""}
          <h2>${restaurant.name}</h2>
          ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
          <div class="qr-wrap">${svgData}</div>
          <p class="scan-text">Scan to view menu</p>
          <p class="footer">Powered by QR Menu</p>
        </div>
        <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  // --- SHARE AS IMAGE FUNCTION ---
  const handleShare = async () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg || !navigator.share) {
      toast({ title: "Sharing not supported on this browser" });
      return;
    }

    try {
      // 1. Prepare Canvas
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 400;
      canvas.height = 500;
      if (!ctx) return;

      // 2. Draw Background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 3. Draw Text (Name & Tagline)
      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "center";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText(restaurant.name, 200, 80);
      
      ctx.font = "14px sans-serif";
      ctx.fillStyle = "#64748b";
      ctx.fillText(restaurant.tagline || "", 200, 105);

      // 4. Draw QR Code from SVG
      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new Image();
      img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;

      img.onload = async () => {
        ctx.drawImage(img, 100, 150, 200, 200); // Center the QR

        // 5. Convert to Blob and Share
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], "menu-qr.png", { type: "image/png" });
          
          await navigator.share({
            title: `${restaurant.name} Menu`,
            text: `Check out our menu here: ${menuUrl}`,
            files: [file],
          });
        });
      };
    } catch (error) {
      console.error("Share failed", error);
    }
  };

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      {/* Preview Area (Standard Black QR) */}
      <div className="bg-white p-6 rounded-2xl border border-border shadow-sm" ref={qrRef}>
        <QRCodeSVG
          value={menuUrl}
          size={160}
          level="H"
          fgColor="#000000" // Kept black as requested
          imageSettings={
            restaurant.show_qr_logo !== false && restaurant.logo_url
              ? { src: restaurant.logo_url, height: 32, width: 32, excavate: true }
              : undefined
          }
        />
      </div>

      <div className="text-center">
        <p className="text-sm font-medium">{restaurant.name}</p>
        <p className="text-xs text-muted-foreground">Scan to view menu</p>
      </div>

      <Button className="w-full" onClick={onViewFullscreen} variant="secondary">
        <Eye className="w-4 h-4 mr-2" />View Fullscreen
      </Button>

      <div className="flex gap-2 w-full">
        <Button variant="outline" className="flex-1" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />Print
        </Button>
        <Button variant="outline" className="flex-1" onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-2" />Share Image
        </Button>
      </div>
    </div>
  );
};

export default QrTab;
