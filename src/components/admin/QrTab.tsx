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

  const getPrimaryColor = () => 
    getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || "0 0% 0%";

  const handlePrint = () => {
    const svgEl = qrRef.current?.querySelector("svg");
    const printWindow = window.open("", "_blank");
    if (!printWindow || !svgEl) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const primaryColor = getPrimaryColor();

    printWindow.document.write(`
      <html>
        <head>
          <title>${restaurant.name} - Menu QR</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;700&display=swap');
            @page { size: auto; margin: 0mm; }
            body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: 'Inter', sans-serif; }
            .card { background: white; border-radius: 32px; padding: 60px 40px; text-align: center; border: 8px solid hsl(${primaryColor}); width: 450px; box-sizing: border-box; }
            .logo { width: 80px; height: 80px; border-radius: 16px; object-fit: cover; margin-bottom: 15px; }
            h2 { font-family: 'Playfair Display', serif; font-size: 38px; margin: 0 0 8px 0; }
            .tagline { color: #666; font-size: 18px; font-style: italic; margin-bottom: 30px; }
            .qr-wrap { display: inline-block; padding: 20px; border-radius: 24px; border: 2px solid #f0f0f0; }
            .qr-wrap svg { width: 250px !important; height: 250px !important; }
            .scan-text { margin-top: 30px; font-size: 20px; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="card">
            ${restaurant.logo_url ? `<img src="${restaurant.logo_url}" class="logo" crossorigin="anonymous" />` : ""}
            <h2>${restaurant.name}</h2>
            ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
            <div class="qr-wrap">${svgData}</div>
            <p class="scan-text">Scan to view our digital menu</p>
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.focus();
                window.print();
              }, 500);
            };
            window.onafterprint = () => window.close();
          </script>
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
    if (!ctx) return;

    canvas.width = 900;
    canvas.height = 1200;

    const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); 
      else ctx.rect(x, y, w, h);
      ctx.closePath();
    };

    const finishAndShare = () => {
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.font = "bold 44px sans-serif";
      // Moved Y from 1120 to 1080 to create better spacing from the bottom border
      ctx.fillText("Scan to view our digital menu", canvas.width / 2, 1080);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "menu-qr.png", { type: "image/png" });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: restaurant.name,
              text: `Check out our digital menu at ${restaurant.name}: ${menuUrl}`,
            });
          } catch { /* Fail Silently */ }
        }
      }, "image/png");
    };

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = `hsl(${getPrimaryColor()})`;
    ctx.lineWidth = 16;
    roundRect(40, 40, canvas.width - 80, canvas.height - 80, 60);
    ctx.stroke();

    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.font = "bold 72px serif";
    ctx.fillText(restaurant.name, canvas.width / 2, 220);
    
    if (restaurant.tagline) {
      ctx.font = "italic 36px sans-serif";
      ctx.fillStyle = "#666666";
      ctx.fillText(restaurant.tagline, canvas.width / 2, 290);
    }

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const qrImg = new Image();
    const qrUrl = URL.createObjectURL(new Blob([svgData], { type: "image/svg+xml" }));

    qrImg.onload = () => {
      const qrSize = 500;
      const x = (canvas.width - qrSize) / 2;
      const y = 380;
      
      ctx.fillStyle = "#FFFFFF";
      roundRect(x - 30, y - 30, qrSize + 60, qrSize + 60, 40);
      ctx.fill();
      ctx.strokeStyle = "#f0f0f0";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.drawImage(qrImg, x, y, qrSize, qrSize);
      URL.revokeObjectURL(qrUrl);

      if (restaurant.logo_url && restaurant.show_qr_logo !== false) {
        const logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        logoImg.src = restaurant.logo_url;
        logoImg.onload = () => {
          const lSize = 110;
          const lx = (canvas.width - lSize) / 2;
          const ly = y + (qrSize - lSize) / 2;
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(lx - 8, ly - 8, lSize + 16, lSize + 16);
          ctx.drawImage(logoImg, lx, ly, lSize, lSize);
          finishAndShare();
        };
        logoImg.onerror = finishAndShare;
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
          imageSettings={hasEmbeddedLogo ? { 
            src: restaurant.logo_url!, 
            height: 38, width: 38, excavate: true 
          } : undefined}
        />
      </div>
      
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Your menu QR code</p>
        {hasEmbeddedLogo && (
          <p className="text-xs text-primary font-medium mt-1">Logo embedded ✓</p>
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
