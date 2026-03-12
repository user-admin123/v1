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

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);

    // Using your original fast-print method but with CSS to force 1 page
    printWindow.document.write(`
      <html><head><title>${restaurant.name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        @page { size: auto; margin: 0; } 
        body { 
          display:flex; flex-direction:column; align-items:center; justify-content:center; 
          height:100vh; font-family:'Inter',sans-serif; background:#fff; overflow: hidden;
        }
        .card { 
          background:white; border-radius:24px; padding:40px; text-align:center; 
          border: 1px solid #eee; max-width: 400px;
        }
        .logo { width:64px; height:64px; border-radius:50%; object-fit:cover; margin:0 auto 12px; border:1px solid #ddd; }
        h2 { font-family:'Playfair Display',serif; font-size:28px; color:#000; margin-bottom:4px; }
        .tagline { color:#666; font-size:14px; font-style:italic; margin-bottom:20px; }
        .qr-wrap { display:inline-block; padding:16px; border-radius:16px; background:#f9f9f9; border:1px solid #eee; }
        .scan-text { margin-top:20px; font-size:16px; font-weight:600; color:#000; }
      </style></head>
      <body>
        <div class="card">
          ${restaurant.logo_url ? `<img src="${restaurant.logo_url}" class="logo" alt="logo"/>` : ""}
          <h2>${restaurant.name}</h2>
          ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
          <div class="qr-wrap">${svgData}</div>
          <p class="scan-text">📱 Scan me to get the live menu!</p>
        </div>
        <script>setTimeout(()=>{window.print();window.close();},300);</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const handleShare = async () => {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 1000;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const finishAndShare = () => {
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.font = "bold 26px sans-serif";
      ctx.fillText("Scan to view our menu", canvas.width / 2, 850);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "menu-qr.png", { type: "image/png" });
        try {
          if (navigator.share && navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title: restaurant.name });
          }
        } catch (err) { console.log("Share failed", err); }
      }, "image/png");
    };

    // Draw Header
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.font = "bold 42px sans-serif";
    ctx.fillText(restaurant.name, canvas.width / 2, 100);

    // Draw QR
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const qrUrl = URL.createObjectURL(svgBlob);
    const qrImg = new Image();

    qrImg.onload = () => {
      ctx.drawImage(qrImg, 150, 200, 500, 500);
      URL.revokeObjectURL(qrUrl);

      if (restaurant.logo_url && restaurant.show_qr_logo !== false) {
        const logoImg = new Image();
        if (restaurant.logo_url.startsWith('http')) {
          logoImg.crossOrigin = "anonymous";
        }
        logoImg.src = restaurant.logo_url;
        
        logoImg.onload = () => {
          const size = 110;
          const x = (canvas.width - size) / 2;
          const y = 200 + (500 - size) / 2;
          
          // CRITICAL: Draw white circle to clear the QR pixels behind the logo
          ctx.fillStyle = "#FFFFFF";
          ctx.beginPath();
          ctx.arc(x + size/2, y + size/2, (size/2) + 5, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.save();
          ctx.beginPath();
          ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(logoImg, x, y, size, size);
          ctx.restore();
          finishAndShare();
        };
        logoImg.onerror = () => finishAndShare();
      } else {
        finishAndShare();
      }
    };
    qrImg.src = qrUrl;
  };

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      {/* UI Preview using primary theme colors */}
      <div className="bg-white p-6 rounded-2xl border-2 border-primary/20 shadow-sm" ref={qrRef}>
        <QRCodeSVG
          value={menuUrl}
          size={160}
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
          <p className="text-xs text-primary font-medium mt-1">
            Logo embedded ✓
          </p>
        )}
      </div>

      <Button className="w-full bg-primary hover:bg-primary/90" onClick={onViewFullscreen}>
        <Eye className="w-4 h-4 mr-2" />View QR Display
      </Button>

      <div className="flex gap-2 w-full">
        <Button variant="outline" className="flex-1 border-primary/20 text-primary hover:bg-primary/5" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />Print
        </Button>
        <Button variant="outline" className="flex-1 border-primary/20 text-primary hover:bg-primary/5" onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-2" />Share Image
        </Button>
      </div>
    </div>
  );
};

export default QrTab;
