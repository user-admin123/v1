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
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:'Inter',sans-serif;
          background: hsl(var(--background));}
        .card{background:white;border-radius:24px;padding:48px 40px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.1);max-width:400px;width:90%; border: 1px solid hsl(var(--border))}
        .logo{width:64px;height:64px;border-radius:50%;object-fit:cover;margin:0 auto 12px;border:3px solid hsl(var(--primary))}
        h2{font-family:'Playfair Display',serif;font-size:28px;color:hsl(var(--foreground));margin-bottom:4px}
        .tagline{color:hsl(var(--muted-foreground));font-size:14px;font-style:italic;margin-bottom:20px}
        .qr-wrap{display:inline-block;padding:16px;border-radius:16px;background:hsl(var(--secondary));margin:16px 0}
        .scan-text{margin-top:20px;font-size:16px;font-weight:600;color:hsl(var(--primary));display:flex;align-items:center;justify-content:center;gap:8px}
        .url{font-size:11px;color:hsl(var(--muted-foreground));margin-top:8px}
        .footer{margin-top:16px;padding-top:12px;border-top:1px solid hsl(var(--border));font-size:10px;color:hsl(var(--muted-foreground))}
      </style></head>
      <body><div class="card">
        ${restaurant.logo_url ? `<img src="${restaurant.logo_url}" class="logo" alt="logo"/>` : ""}
        <h2>${restaurant.name}</h2>
        ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
        <div class="qr-wrap">${svgData}</div>
        <p class="scan-text">📱 Scan me to get the live menu!</p>
        <p class="url">${menuUrl}</p>
        <p class="footer">Powered by QR Menu</p>
      </div>
      <script>setTimeout(()=>{window.print();},500);</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const handleShare = async () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 500;
    canvas.height = 750;

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };

    try {
      let currentY = 60;

      // 1. Draw Logo at the Top (Circular)
      if (restaurant.logo_url) {
        const logo = await loadImage(restaurant.logo_url);
        const size = 80;
        const x = canvas.width / 2 - size / 2;
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(canvas.width / 2, currentY + size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(logo, x, currentY, size, size);
        ctx.restore();
        
        // Logo Border
        ctx.strokeStyle = "#764ba2"; // Primary Color
        ctx.lineWidth = 3;
        ctx.stroke();
        
        currentY += size + 20;
      }

      // 2. Restaurant Name
      ctx.fillStyle = "#1a1a2e";
      ctx.font = "bold 34px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(restaurant.name, canvas.width / 2, currentY);
      currentY += 35;

      // 3. Tagline
      if (restaurant.tagline) {
        ctx.fillStyle = "#666666";
        ctx.font = "italic 20px sans-serif";
        ctx.fillText(restaurant.tagline, canvas.width / 2, currentY);
        currentY += 40;
      }

      // 4. QR Code Section
      const svgEl = qrRef.current?.querySelector("svg");
      if (!svgEl) return;
      
      // Clone SVG and remove the logo from the center for the share image
      const svgClone = svgEl.cloneNode(true) as SVGElement;
      const embeddedImage = svgClone.querySelector("image");
      if (embeddedImage) embeddedImage.remove();

      const svgData = new XMLSerializer().serializeToString(svgClone);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const qrImg = await loadImage(url);

      // QR Wrapper Box
      ctx.fillStyle = "#f8f9fa";
      const qrBoxSize = 320;
      const qrBoxX = (canvas.width - qrBoxSize) / 2;
      ctx.beginPath();
      ctx.roundRect(qrBoxX, currentY, qrBoxSize, qrBoxSize, 20);
      ctx.fill();

      // Draw QR (Now without the center logo)
      ctx.drawImage(qrImg, qrBoxX + 35, currentY + 35, 250, 250);
      currentY += qrBoxSize + 40;

      // 5. Bottom Text
      ctx.fillStyle = "#764ba2"; 
      ctx.font = "bold 22px sans-serif";
      ctx.fillText("📱 Scan to View Menu", canvas.width / 2, currentY);
      
      ctx.fillStyle = "#999999";
      ctx.font = "14px sans-serif";
      ctx.fillText(menuUrl, canvas.width / 2, currentY + 30);

      // Convert to File and Share
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "menu-qr.png", { type: "image/png" });

        if (navigator.share) {
          await navigator.share({
            files: [file],
            title: `${restaurant.name} Menu`,
          });
        }
        URL.revokeObjectURL(url);
      }, "image/png");

    } catch (err) {
      toast({ title: "Error generating share image", variant: "destructive" });
    }
  };

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      {/* Visual QR in UI (Matches your request) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-border" ref={qrRef}>
        <QRCodeSVG
          value={menuUrl}
          size={160}
          level="H"
          imageSettings={
            restaurant.show_qr_logo !== false && restaurant.logo_url
              ? { src: restaurant.logo_url, height: 32, width: 32, excavate: true }
              : undefined
          }
        />
      </div>
      
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Your menu QR code</p>
        {restaurant.show_qr_logo !== false && restaurant.logo_url && (
          <span className="text-xs text-primary font-medium">Logo embedded ✓</span>
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
          <Share2 className="w-4 h-4 mr-2" />Share
        </Button>
      </div>
    </div>
  );
};

export default QrTab;
