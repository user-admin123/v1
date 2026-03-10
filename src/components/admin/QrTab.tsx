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

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    printWindow.document.write(`
      <html><head><title>Menu QR - ${restaurant.name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:'Inter',sans-serif;background:#f9fafb}
        .card{background:white;border-radius:24px;padding:48px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.1);max-width:400px;width:90%;border:1px solid #eee}
        .logo{width:64px;height:64px;border-radius:50%;object-fit:cover;margin:0 auto 12px;border:2px solid #eee}
        h2{font-size:24px;color:#111;margin-bottom:4px;font-weight:700}
        .tagline{color:#666;font-size:14px;margin-bottom:20px}
        .qr-wrap{display:inline-block;padding:16px;border-radius:12px;background:#fff;border:1px solid #f0f0f0;margin:16px 0}
        .scan-text{margin-top:20px;font-size:16px;font-weight:600;color:#111}
        .url{font-size:11px;color:#999;margin-top:8px}
      </style></head>
      <body><div class="card">
        ${restaurant.logo_url ? `<img src="${restaurant.logo_url}" class="logo" alt="logo"/>` : ""}
        <h2>${restaurant.name}</h2>
        ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
        <div class="qr-wrap">${svgData}</div>
        <p class="scan-text">Scan to view menu</p>
        <p class="url">${menuUrl}</p>
      </div>
      <script>setTimeout(()=>{window.print();},500);</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const handleShare = async () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Card Dimensions
      canvas.width = 800;
      canvas.height = 1000;

      // 1. Clean White Background
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, 800, 1000);
      
      // Optional: Light gray border for the "card" look
      ctx.strokeStyle = "#F3F4F6";
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 40, 720, 920);

      // 2. Prepare QR Image
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);
      const qrImg = new Image();

      qrImg.onload = async () => {
        // Draw Restaurant Name (Centered)
        ctx.fillStyle = "#111827";
        ctx.font = "bold 52px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(restaurant.name, 400, 150);

        // Draw Tagline
        if (restaurant.tagline) {
          ctx.fillStyle = "#6B7280";
          ctx.font = "30px Inter, sans-serif";
          ctx.fillText(restaurant.tagline, 400, 210);
        }

        // Draw QR Code (Larger)
        const qrSize = 500;
        ctx.drawImage(qrImg, 150, 280, qrSize, qrSize);

        // Footer Text
        ctx.fillStyle = "#111827";
        ctx.font = "bold 36px Inter, sans-serif";
        ctx.fillText("Scan to View Menu", 400, 850);
        
        ctx.fillStyle = "#9CA3AF";
        ctx.font = "24px Inter, sans-serif";
        ctx.fillText(menuUrl, 400, 900);

        // Share logic
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], `menu-qr.png`, { type: "image/png" });

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: restaurant.name,
              text: `Check out our menu at ${restaurant.name}`,
              files: [file],
            });
          }
          URL.revokeObjectURL(svgUrl);
        }, "image/png");
      };

      // Crucial: This helps with loading if the SVG has images inside
      qrImg.src = svgUrl;

    } catch (error) {
      console.error("Share failed", error);
      toast({ title: "Sharing failed", variant: "destructive" });
    }
  };

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      {/* The visible QR code in the UI */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm" ref={qrRef}>
        <QRCodeSVG
          value={menuUrl}
          size={180}
          level="H"
          includeMargin={false}
          imageSettings={
            restaurant.show_qr_logo !== false && restaurant.logo_url
              ? { 
                  src: restaurant.logo_url, 
                  height: 40, 
                  width: 40, 
                  excavate: true,
                  // Cross-origin for the logo if it's from a different domain
                  crossOrigin: "anonymous" 
                }
              : undefined
          }
        />
      </div>
      
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-gray-900">Your Menu QR Code</p>
        <p className="text-xs text-gray-500">Minimalist White Design</p>
      </div>

      <Button className="w-full bg-gray-900 hover:bg-black text-white" onClick={onViewFullscreen}>
        <Eye className="w-4 h-4 mr-2" />Full QR Display
      </Button>
      
      <div className="flex gap-2 w-full">
        <Button variant="outline" className="flex-1 border-gray-200" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />Print
        </Button>
        <Button variant="outline" className="flex-1 border-gray-200" onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-2" />Share Image
        </Button>
      </div>
    </div>
  );
};

export default QrTab;
