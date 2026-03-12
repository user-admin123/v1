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

    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || "0 0% 0%";

    printWindow.document.write(`
      <html><head><title>${restaurant.name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap');
        
        /* Force single page and remove browser margins */
        @page { size: auto; margin: 0; }
        * { margin:0; padding:0; box-sizing:border-box; }
        
        body { 
          display:flex; align-items:center; justify-content:center; 
          width: 100vw; height: 100vh; 
          font-family:'Inter',sans-serif; background:#fff;
          overflow: hidden; /* Prevents 2nd blank page */
        }
        
        .card { 
          background:white; border-radius:24px; padding:48px; text-align:center; 
          border: 4px solid hsl(${primaryColor}); max-width: 400px; width: 90%;
          position: relative;
        }
        
        .logo { 
          width:70px; height:70px; border-radius:12px; object-fit:cover; 
          border: 1px solid #ddd; background: white; padding: 2px; margin-bottom: 12px;
        }
        
        h2 { font-family:'Playfair Display',serif; font-size:32px; color:#000; margin-bottom:4px; }
        .tagline { color:#666; font-size:16px; font-style:italic; margin-bottom:24px; }
        
        .qr-wrap {
          display:inline-block; padding:16px; border-radius:16px; 
          background:white; border: 1px solid #eee;
        }
        
        .scan-text { margin-top:24px; font-size:18px; font-weight:600; color:#000; }
      </style></head>
      <body>
        <div class="card">
          ${restaurant.logo_url ? `<img src="${restaurant.logo_url}" class="logo" alt="logo"/>` : ""}
          <h2>${restaurant.name}</h2>
          ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
          <div class="qr-wrap">${svgData}</div>
          <p class="scan-text">Scan to view our menu</p>
        </div>
        <script>
          window.onload = () => {
            setTimeout(() => { 
              window.print(); 
              window.close(); 
            }, 500);
          };
        </script>
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

    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || "0 0% 0%";

    canvas.width = 800;
    canvas.height = 1000;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = `hsl(${primaryColor})`;
    ctx.lineWidth = 20;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

    const finishAndShare = () => {
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.font = "bold 28px sans-serif";
      ctx.fillText("Scan to view our menu", canvas.width / 2, 880);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "menu-qr.png", { type: "image/png" });
        try {
          if (navigator.share && navigator.canShare?.({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: restaurant.name,
              text: `Check out our digital menu at ${restaurant.name}!\nView it here: ${menuUrl}`,
            });
          }
        } catch (err) { console.log("Share failed", err); }
      }, "image/png");
    };

    // Header Text
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.font = "bold 48px sans-serif";
    ctx.fillText(restaurant.name, canvas.width / 2, 140);

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const qrUrl = URL.createObjectURL(svgBlob);
    const qrImg = new Image();

    qrImg.onload = () => {
      ctx.drawImage(qrImg, 150, 250, 500, 500);
      URL.revokeObjectURL(qrUrl);

      if (restaurant.logo_url && restaurant.show_qr_logo !== false) {
        const logoImg = new Image();
        if (restaurant.logo_url.startsWith('http')) {
          logoImg.crossOrigin = "anonymous";
        }
        logoImg.src = restaurant.logo_url;
        
        logoImg.onload = () => {
          const size = 115;
          const x = (canvas.width - size) / 2;
          const y = 250 + (500 - size) / 2;
          
          // Clear QR pixels with white square
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(x - 4, y - 4, size + 8, size + 8);
          
          ctx.strokeStyle = `hsl(${primaryColor})`;
          ctx.lineWidth = 2;
          ctx.strokeRect(x - 4, y - 4, size + 8, size + 8);
          
          ctx.drawImage(logoImg, x, y, size, size);
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
      <div className="bg-white p-6 rounded-2xl border relative shadow-sm" ref={qrRef}>
        <QRCodeSVG
          value={menuUrl}
          size={160}
          level="H"
          imageSettings={
            restaurant.show_qr_logo !== false && restaurant.logo_url
              ? { 
                  src: restaurant.logo_url, 
                  height: 38, 
                  width: 38, 
                  excavate: true 
                }
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

      <Button className="w-full" onClick={onViewFullscreen}>
        <Eye className="w-4 h-4 mr-2" />View QR Display
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
