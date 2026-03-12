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

  // --- PRINT HANDLER ---
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);

    const primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--primary')
      .trim() || "0 0% 0%";

    printWindow.document.write(`
      <html>
        <head>
          <title>${restaurant.name} - QR Menu</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap');
            
            @page { size: auto; margin: 0mm !important; }
            html, body {
              margin: 0 !important; padding: 0 !important;
              width: 100%; height: 100%;
              display: flex; align-items: center; justify-content: center;
              background: #fff; -webkit-print-color-adjust: exact;
            }
            .card { 
              background: white; border-radius: 32px; padding: 60px 40px;
              text-align: center; border: 8px solid hsl(${primaryColor});
              width: 450px; display: flex; flex-direction: column;
              align-items: center; justify-content: center; box-sizing: border-box;
            }
            .logo { width: 80px; height: 80px; border-radius: 16px; object-fit: cover; margin-bottom: 15px; border: 1px solid #eee; }
            h2 { font-family: 'Playfair Display', serif; font-size: 38px; color: #000; margin: 0 0 8px 0; }
            .tagline { color: #666; font-size: 18px; font-style: italic; margin-bottom: 30px; font-family: 'Inter', sans-serif; }
            .qr-wrap { padding: 20px; border-radius: 24px; background: white; border: 2px solid #f0f0f0; margin: 10px 0; }
            .qr-wrap svg { width: 250px !important; height: 250px !important; }
            .scan-text { margin-top: 30px; font-size: 20px; font-weight: 700; color: #000; font-family: 'Inter', sans-serif; }
          </style>
        </head>
        <body>
          <div class="card">
            ${restaurant.logo_url ? `<img src="${restaurant.logo_url}" class="logo" />` : ""}
            <h2>${restaurant.name}</h2>
            ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
            <div class="qr-wrap">${svgData}</div>
            <p class="scan-text">Scan to view our digital menu</p>
          </div>
          <script>
            window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // --- SHARE IMAGE HANDLER ---
  const handleShare = async () => {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--primary')
      .trim() || "0 0% 0%";

    // Setup Canvas (Match the 450x600ish aspect ratio of the Print Card)
    canvas.width = 900;
    canvas.height = 1200;
    
    // Background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Thick Primary Border (Matching Print Style)
    ctx.strokeStyle = `hsl(${primaryColor})`;
    ctx.lineWidth = 24;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    const finishAndShare = () => {
      // Bottom Text
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.font = "bold 42px sans-serif";
      ctx.fillText("Scan to view our digital menu", canvas.width / 2, 1100);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "restaurant-menu-qr.png", { type: "image/png" });
        try {
          if (navigator.share && navigator.canShare?.({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: restaurant.name,
              text: `Check out the menu for ${restaurant.name}!`,
            });
          } else {
            // Fallback for browsers that don't support file sharing
            const link = document.createElement('a');
            link.download = `${restaurant.name}-qr.png`;
            link.href = URL.createObjectURL(blob);
            link.click();
          }
        } catch (error) {
           if ((error as Error).name !== 'AbortError') {
             alert("Could not share the image. You can try downloading it instead.");
           }
        }
      }, "image/png");
    };

    // Draw Restaurant Name
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.font = "bold 64px serif"; // Mimicking Playfair Display
    ctx.fillText(restaurant.name, canvas.width / 2, 220);

    // Draw Tagline
    if (restaurant.tagline) {
      ctx.font = "italic 32px sans-serif";
      ctx.fillStyle = "#666666";
      ctx.fillText(restaurant.tagline, canvas.width / 2, 280);
    }

    // Prepare QR Code for drawing
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const qrUrl = URL.createObjectURL(svgBlob);
    const qrImg = new Image();

    qrImg.onload = () => {
      // Draw QR Box Shadow/Border
      const qrSize = 550;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = 380;
      
      ctx.strokeStyle = "#f0f0f0";
      ctx.lineWidth = 2;
      ctx.strokeRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40);

      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      URL.revokeObjectURL(qrUrl);

      // Add Logo Over QR (if applicable)
      if (restaurant.logo_url && restaurant.show_qr_logo !== false) {
        const logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        logoImg.src = restaurant.logo_url;
        
        logoImg.onload = () => {
          const lSize = 120;
          const lx = (canvas.width - lSize) / 2;
          const ly = qrY + (qrSize - lSize) / 2;
          
          // White background for logo badge
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(lx - 5, ly - 5, lSize + 10, lSize + 10);
          ctx.drawImage(logoImg, lx, ly, lSize, lSize);
          finishAndShare();
        };
        logoImg.onerror = () => finishAndShare();
      } else {
        finishAndShare();
      }
    };
    qrImg.src = qrUrl;
  };

  const hasEmbeddedLogo = restaurant.show_qr_logo !== false && !!restaurant.logo_url;

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      <div className="bg-white p-6 rounded-2xl border relative shadow-sm" ref={qrRef}>
        <QRCodeSVG
          value={menuUrl}
          size={160}
          level="H"
          imageSettings={
            hasEmbeddedLogo
              ? { 
                  src: restaurant.logo_url!, 
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
        {hasEmbeddedLogo && (
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
