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
    
    // Using a more robust printing approach
    printWindow.document.write(`
      <html><head><title>${restaurant.name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap');
        @page { size: auto; margin: 0mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          display: flex; flex-direction: column; align-items: center; justify-content: center; 
          min-height: 100vh; width: 100vw; font-family: 'Inter', sans-serif; background: #ffffff;
        }
        .card { 
          background: white; border-radius: 24px; padding: 48px; text-align: center; 
          max-width: 400px; width: 90%; border: 1px solid #eee;
        }
        .logo { width: 70px; height: 70px; border-radius: 50%; object-fit: cover; margin: 0 auto 16px; border: 1px solid #eee; }
        h2 { font-family: 'Playfair Display', serif; font-size: 32px; color: #000; margin-bottom: 8px; }
        .tagline { color: #666; font-size: 16px; font-style: italic; margin-bottom: 24px; }
        .qr-wrap { display: inline-block; padding: 16px; border-radius: 16px; background: #fff; border: 1px solid #f0f0f0; }
        .qr-wrap svg { width: 200px; height: 200px; }
        .scan-text { margin-top: 24px; font-size: 18px; font-weight: 600; color: #000; }
      </style></head>
      <body>
        <div class="card">
          ${restaurant.logo_url ? `<img src="${restaurant.logo_url}" class="logo" alt="logo"/>` : ""}
          <h2>${restaurant.name}</h2>
          ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
          <div class="qr-wrap">${svgData}</div>
          <p class="scan-text">Scan to view our menu</p>
        </div>
      </body></html>
    `);

    printWindow.document.close();

    // Wait for images/styles to load before printing
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      // Only close after a delay to ensure print dialog opened successfully
      setTimeout(() => { printWindow.close(); }, 500);
    };
  };

  const handleShare = async () => {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 1000;
    canvas.height = 1100; // Adjusted height since URL is removed
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const finishAndShare = () => {
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.font = "bold 36px sans-serif";
      ctx.fillText("Scan to view our menu", canvas.width / 2, 980);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "menu-qr.png", { type: "image/png" });
        
        try {
          if (navigator.share && navigator.canShare?.({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: restaurant.name,
              text: `View the menu for ${restaurant.name}`,
            });
          } else {
            const link = document.createElement('a');
            link.download = `${restaurant.name}-QR.png`;
            link.href = canvas.toDataURL();
            link.click();
          }
        } catch (err) {
          console.error("Share failed", err);
        }
      }, "image/png");
    };

    // Draw Restaurant Name
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.font = "bold 56px sans-serif";
    ctx.fillText(restaurant.name, canvas.width / 2, 120);

    if (restaurant.tagline) {
      ctx.font = "italic 28px sans-serif";
      ctx.fillStyle = "#666666";
      ctx.fillText(restaurant.tagline, canvas.width / 2, 180);
    }

    // Process QR
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const qrUrl = URL.createObjectURL(svgBlob);
    const qrImg = new Image();

    qrImg.onload = () => {
      ctx.drawImage(qrImg, 200, 280, 600, 600);
      URL.revokeObjectURL(qrUrl);

      // Handle Logo with CORS for Supabase
      if (restaurant.logo_url && restaurant.show_qr_logo !== false) {
        const logoImg = new Image();
        // This is crucial for Supabase URLs to work on Canvas
        logoImg.crossOrigin = "anonymous"; 
        logoImg.src = restaurant.logo_url;
        
        logoImg.onload = () => {
          const size = 130;
          const x = (canvas.width - size) / 2;
          const y = 280 + (600 - size) / 2;
          
          // White background circle for logo
          ctx.fillStyle = "#FFFFFF";
          ctx.beginPath();
          ctx.arc(x + size/2, y + size/2, (size/2) + 10, 0, Math.PI * 2);
          ctx.fill();
          
          // Draw logo
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
              ? { src: restaurant.logo_url, height: 34, width: 34, excavate: true }
              : undefined
          }
        />
      </div>
      
      <p className="text-sm text-muted-foreground text-center">
        Scan to view menu
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
