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

  // --- KEEPING ORIGINAL PRINT FUNCTION UNCHANGED ---
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

    // 1. Setup Canvas Context
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 500;
    canvas.height = 700;

    // 2. Background Layer
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 3. Header Styling
    ctx.textAlign = "center";
    ctx.fillStyle = "#1a1a2e"; // Dark color for name
    ctx.font = "bold 34px sans-serif";
    ctx.fillText(restaurant.name, canvas.width / 2, 80);
    
    if (restaurant.tagline) {
      ctx.font = "italic 18px sans-serif";
      ctx.fillStyle = "#6b7280"; // Gray color for tagline
      ctx.fillText(restaurant.tagline, canvas.width / 2, 115);
    }

    // 4. Convert QR SVG to Image
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    
    const qrImg = new Image();
    const logoImg = new Image();

    qrImg.onload = () => {
      // Draw QR Code onto Canvas
      const qrSize = 320;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = 160;
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // 5. Draw Logo at Center of QR (Manually layering)
      if (restaurant.logo_url && restaurant.show_qr_logo !== false) {
        logoImg.onload = () => {
          const logoSize = qrSize * 0.22; // 22% of QR code size
          const lx = qrX + (qrSize - logoSize) / 2;
          const ly = qrY + (qrSize - logoSize) / 2;
          
          // Draw white square background behind logo (mimics 'excavate')
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(lx - 4, ly - 4, logoSize + 8, logoSize + 8);

          // Draw actual logo image
          ctx.drawImage(logoImg, lx, ly, logoSize, logoSize);
          generateFinalFile();
        };
        logoImg.src = restaurant.logo_url;
      } else {
        generateFinalFile();
      }
    };

    const generateFinalFile = () => {
      // 6. Footer Decoration
      ctx.fillStyle = "#7c3aed"; // Your primary theme color
      ctx.font = "600 22px sans-serif";
      ctx.fillText("📱 Scan to view our menu", canvas.width / 2, 540);
      
      ctx.font = "12px monospace";
      ctx.fillStyle = "#9ca3af";
      ctx.fillText(menuUrl, canvas.width / 2, 580);

      // 7. Share Process
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "restaurant-menu.png", { type: "image/png" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `${restaurant.name} Menu`,
              text: `Check out our digital menu at ${restaurant.name}!`,
            });
          } catch (e) {
            console.log("Share cancelled");
          }
        } else {
          toast({ title: "Sharing not supported on this browser" });
        }
        URL.revokeObjectURL(url);
      }, "image/png");
    };

    qrImg.src = url;
  };

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      {/* UI PREVIEW */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border" ref={qrRef}>
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
            <span className="text-xs text-primary font-medium">Logo embedded ✓</span>
          </>
        )}
      </p>

      {/* ACTION BUTTONS */}
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
