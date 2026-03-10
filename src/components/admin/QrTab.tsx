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

  // Helper to generate the HTML template used for both Printing and Sharing
  const getBrandedTemplate = (svgData: string) => `
    <html><head><title>${restaurant.name}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
      *{margin:0;padding:0;box-sizing:border-box}
      body{display:flex;align-items:center;justify-content:center;min-height:100vh;
        font-family:'Inter',sans-serif;background:#f8fafc;}
      .card{background:white;border-radius:24px;padding:40px;text-align:center;
        box-shadow:0 10px 30px rgba(0,0,0,0.08);max-width:350px;width:100%;border:1px solid #e2e8f0}
      .logo{width:70px;height:70px;border-radius:50%;object-fit:cover;margin:0 auto 16px;border:3px solid var(--primary, #000)}
      h2{font-size:24px;color:#0f172a;margin-bottom:4px;font-weight:700}
      .tagline{color:#64748b;font-size:14px;margin-bottom:24px}
      .qr-wrap{display:inline-block;padding:12px;border-radius:16px;background:#f1f5f9;margin-bottom:16px}
      .scan-text{font-size:16px;font-weight:600;color:#0f172a;margin-bottom:4px}
      .url{font-size:11px;color:#94a3b8;word-break:break-all}
    </style></head>
    <body>
      <div class="card" id="qr-card">
        ${restaurant.logo_url ? `<img src="${restaurant.logo_url}" class="logo"/>` : ""}
        <h2>${restaurant.name}</h2>
        ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
        <div class="qr-wrap">${svgData}</div>
        <p class="scan-text">Scan to View Menu</p>
        <p class="url">${menuUrl}</p>
      </div>
    </body></html>
  `;

  const handlePrint = () => {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;
    
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(getBrandedTemplate(svgData));
    printWindow.document.write(`<script>setTimeout(()=>{window.print();window.close();},500);</script>`);
    printWindow.document.close();
  };

  const handleShare = async () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg || !navigator.share) return;

    try {
      // 1. Create a canvas to draw the "Card"
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Set canvas size (Card style)
      canvas.width = 400;
      canvas.height = 550;

      // 2. Draw Background & Card
      ctx.fillStyle = "#f8fafc"; // Page bg
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = "#ffffff"; // Card bg
      ctx.roundRect?.(25, 25, 350, 500, 24); 
      ctx.fill();
      ctx.strokeStyle = "#e2e8f0";
      ctx.stroke();

      // 3. Draw Text (Name & Tagline)
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 24px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(restaurant.name, 200, 140);

      ctx.fillStyle = "#64748b";
      ctx.font = "14px Inter, sans-serif";
      ctx.fillText(restaurant.tagline || "", 200, 165);

      // 4. Draw QR Code
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();

      img.onload = async () => {
        // Draw a light grey box behind QR
        ctx.fillStyle = "#f1f5f9";
        ctx.roundRect?.(110, 200, 180, 180, 12);
        ctx.fill();
        
        // Draw the QR
        ctx.drawImage(img, 120, 210, 160, 160);
        URL.revokeObjectURL(url);

        // 5. Convert to File and Share
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], "menu-qr.png", { type: "image/png" });
          
          await navigator.share({
            title: `${restaurant.name} Menu`,
            text: `View our menu online at: ${menuUrl}`,
            files: [file],
          });
        }, "image/png");
      };
      img.src = url;

    } catch (error) {
      console.error("Sharing failed", error);
    }
  };

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      {/* Visual Preview - QR stays Black */}
      <div className="bg-white p-6 rounded-2xl border border-border shadow-sm" ref={qrRef}>
        <QRCodeSVG
          value={menuUrl}
          size={160}
          level="H"
          fgColor="#000000" 
          imageSettings={
            restaurant.show_qr_logo !== false && restaurant.logo_url
              ? { src: restaurant.logo_url, height: 32, width: 32, excavate: true }
              : undefined
          }
        />
      </div>

      <div className="text-center">
        <p className="text-sm font-medium text-foreground">Your menu QR code</p>
        <p className="text-xs text-muted-foreground">{restaurant.name}</p>
      </div>

      <Button className="w-full" onClick={onViewFullscreen}>
        <Eye className="w-4 h-4 mr-2" />View QR Display
      </Button>

      <div className="grid grid-cols-2 gap-3 w-full">
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />Print
        </Button>
        <Button variant="outline" onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-2" />Share
        </Button>
      </div>
    </div>
  );
};

export default QrTab;
