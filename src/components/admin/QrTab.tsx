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
          background:linear-gradient(135deg,#667eea 0%,#764ba2 50%,#f093fb 100%)}
        .card{background:white;border-radius:24px;padding:48px 40px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-width:400px;width:90%}
        .logo{width:64px;height:64px;border-radius:50%;object-fit:cover;margin:0 auto 12px;border:3px solid #764ba2}
        h2{font-family:'Playfair Display',serif;font-size:28px;color:#1a1a2e;margin-bottom:4px}
        .tagline{color:#888;font-size:14px;font-style:italic;margin-bottom:20px}
        .qr-wrap{display:inline-block;padding:16px;border-radius:16px;background:linear-gradient(135deg,#f5f7fa,#c3cfe2);margin:16px 0}
        .scan-text{margin-top:20px;font-size:16px;font-weight:600;color:#764ba2;display:flex;align-items:center;justify-content:center;gap:8px}
        .url{font-size:11px;color:#aaa;margin-top:8px}
        .footer{margin-top:16px;padding-top:12px;border-top:1px solid #eee;font-size:10px;color:#bbb}
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
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Set Canvas size (standard social sharing size)
      canvas.width = 800;
      canvas.height = 1000;

      // 1. Draw Gradient Background
      const gradient = ctx.createLinearGradient(0, 0, 800, 1000);
      gradient.addColorStop(0, "#667eea");
      gradient.addColorStop(0.5, "#764ba2");
      gradient.addColorStop(1, "#f093fb");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 1000);

      // 2. Draw White Card
      ctx.fillStyle = "white";
      const cardPadding = 50;
      const cardWidth = 700;
      const cardHeight = 850;
      const cardX = (800 - cardWidth) / 2;
      const cardY = (1000 - cardHeight) / 2;
      
      // Rounded Rectangle for Card
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 40);
      ctx.fill();

      // 3. Convert SVG to Image to draw on Canvas
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);
      const qrImg = new Image();

      qrImg.onload = async () => {
        // Draw Restaurant Name
        ctx.fillStyle = "#1a1a2e";
        ctx.font = "bold 48px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(restaurant.name, 400, cardY + 120);

        // Draw Tagline
        if (restaurant.tagline) {
          ctx.fillStyle = "#888";
          ctx.font = "italic 28px Inter, sans-serif";
          ctx.fillText(restaurant.tagline, 400, cardY + 170);
        }

        // Draw QR Code Image
        const qrSize = 400;
        ctx.drawImage(qrImg, 400 - qrSize / 2, cardY + 220, qrSize, qrSize);

        // Draw Footer Text
        ctx.fillStyle = "#764ba2";
        ctx.font = "600 32px Inter, sans-serif";
        ctx.fillText("📱 Scan to view menu", 400, cardY + 700);
        
        ctx.fillStyle = "#aaa";
        ctx.font = "20px Inter, sans-serif";
        ctx.fillText(menuUrl, 400, cardY + 750);

        // Finalize and Share
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], `${restaurant.name}-menu.png`, { type: "image/png" });

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `${restaurant.name} Menu`,
              text: `Check out our live menu!`,
              files: [file],
            });
          }
          URL.revokeObjectURL(svgUrl);
        }, "image/png");
      };
      qrImg.src = svgUrl;

    } catch (error) {
      console.error("Share failed", error);
      toast({ title: "Could not share the menu card.", variant: "destructive" });
    }
  };

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      <div className="bg-white p-6 rounded-2xl" ref={qrRef}>
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
          <Share2 className="w-4 h-4 mr-2" />Share
        </Button>
      </div>
    </div>
  );
};

export default QrTab;
