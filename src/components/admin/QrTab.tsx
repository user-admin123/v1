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
    
    printWindow.document.write(`
      <html><head><title>Menu QR - ${restaurant.name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap');
        
        /* Prevents extra pages and browser headers/footers */
        @page { size: auto; margin: 0mm; }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          display: flex; flex-direction: column; align-items: center; justify-content: center; 
          height: 100vh; width: 100vw; font-family: 'Inter', sans-serif; background: #ffffff;
          overflow: hidden; /* Prevents overflow onto second page */
        }
        .card { 
          background: white; border-radius: 24px; padding: 40px; text-align: center; 
          max-width: 380px; width: 90%; border: 1px solid #eee;
        }
        .logo { width: 70px; height: 70px; border-radius: 50%; object-fit: cover; margin: 0 auto 16px; border: 1px solid #eee; }
        h2 { font-family: 'Playfair Display', serif; font-size: 28px; color: #000; margin-bottom: 6px; }
        .tagline { color: #666; font-size: 14px; font-style: italic; margin-bottom: 24px; }
        .qr-wrap { display: inline-block; padding: 12px; border-radius: 16px; background: #fff; border: 1px solid #f0f0f0; }
        .scan-text { margin-top: 24px; font-size: 16px; font-weight: 600; color: #000; }
        .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #eee; font-size: 10px; color: #bbb; text-transform: uppercase; letter-spacing: 1px; }
      </style></head>
      <body>
        <div class="card">
          ${restaurant.logo_url ? `<img src="${restaurant.logo_url}" class="logo" alt="logo"/>` : ""}
          <h2>${restaurant.name}</h2>
          ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
          <div class="qr-wrap">${svgData}</div>
          <p class="scan-text">Scan to view our menu</p>
          <p class="footer">Powered by QR Menu</p>
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

    // Higher resolution for sharing
    canvas.width = 1000;
    canvas.height = 1200;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const finishAndShare = () => {
      // Footer text instead of URL
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.font = "bold 32px sans-serif";
      ctx.fillText("Scan to view our menu", canvas.width / 2, 950);
      
      ctx.font = "20px sans-serif";
      ctx.fillStyle = "#CCCCCC";
      ctx.fillText("Powered by QR Menu", canvas.width / 2, 1020);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "menu-qr.png", { type: "image/png" });
        
        try {
          if (navigator.share && navigator.canShare?.({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: restaurant.name,
              text: `Check out the menu for ${restaurant.name}`,
            });
          } else {
            // Fallback for desktop or non-file supporting browsers
            const link = document.createElement('a');
            link.download = 'menu-qr.png';
            link.href = canvas.toDataURL();
            link.click();
          }
        } catch (err) {
          console.error("Share failed", err);
        }
      }, "image/png");
    };

    // 1. Draw Header Text
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.font = "bold 52px sans-serif";
    ctx.fillText(restaurant.name, canvas.width / 2, 120);

    if (restaurant.tagline) {
      ctx.font = "italic 26px sans-serif";
      ctx.fillStyle = "#666666";
      ctx.fillText(restaurant.tagline, canvas.width / 2, 170);
    }

    // 2. Draw QR Code
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const qrUrl = URL.createObjectURL(svgBlob);
    const qrImg = new Image();

    qrImg.onload = () => {
      ctx.drawImage(qrImg, 200, 250, 600, 600);
      URL.revokeObjectURL(qrUrl);

      // 3. Draw Logo with CORS handling
      if (restaurant.logo_url && restaurant.show_qr_logo !== false) {
        const logoImg = new Image();
        logoImg.crossOrigin = "anonymous"; // CRITICAL: Fixes blank logo/canvas errors
        logoImg.src = restaurant.logo_url;
        
        logoImg.onload = () => {
          const size = 120;
          const x = (canvas.width - size) / 2;
          const y = 250 + (600 - size) / 2;
          
          // Draw white background behind logo
          ctx.fillStyle = "#FFFFFF";
          ctx.beginPath();
          ctx.arc(x + size/2, y + size/2, (size/2) + 10, 0, Math.PI * 2);
          ctx.fill();
          
          // Clip to circle and draw logo
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
      <div className="bg-white p-6 rounded-2xl border" ref={qrRef}>
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
      
      <p className="text-sm text-muted-foreground text-center">
        Your menu QR code
        {restaurant.show_qr_logo !== false && restaurant.logo_url && (
          <>
            <br />
            <span className="text-xs text-primary">Logo embedded ✓</span>
          </>
        )}
      </p>

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
