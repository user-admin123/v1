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

  // --- Print Function (Strictly White Background) ---
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
          background:#ffffff}
        .card{background:white;border-radius:24px;padding:48px 40px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.1);max-width:400px;width:90%;border:1px solid #eee}
        .logo{width:64px;height:64px;border-radius:50%;object-fit:cover;margin:0 auto 12px;border:1px solid #ddd}
        h2{font-family:'Playfair Display',serif;font-size:28px;color:#000000;margin-bottom:4px}
        .tagline{color:#666;font-size:14px;font-style:italic;margin-bottom:20px}
        .qr-wrap{display:inline-block;padding:16px;border-radius:16px;background:#f9f9f9;margin:16px 0;border:1px solid #eee}
        .scan-text{margin-top:20px;font-size:16px;font-weight:600;color:#000;display:flex;align-items:center;justify-content:center;gap:8px}
        .url{font-size:11px;color:#888;margin-top:8px}
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
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 1000;

    // 1. Background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Text Content
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.font = "bold 48px Arial";
    ctx.fillText(restaurant.name, canvas.width / 2, 120);

    if (restaurant.tagline) {
      ctx.font = "italic 24px Arial";
      ctx.fillStyle = "#666666";
      ctx.fillText(restaurant.tagline, canvas.width / 2, 170);
    }

    // 3. Load Images (QR and Logo)
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const qrUrl = URL.createObjectURL(svgBlob);

    const loadImg = (src: string): Promise<HTMLImageElement> => 
      new Promise((res, rej) => {
        const img = new Image();
        img.crossOrigin = "anonymous"; // Try to handle CORS
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = src;
      });

    try {
      const qrImg = await loadImg(qrUrl);
      
      // Draw QR Code
      ctx.drawImage(qrImg, 150, 250, 500, 500);

      // 4. Manually draw the logo in the center if it exists and setting is on
      if (restaurant.logo_url && restaurant.show_qr_logo !== false) {
        const logoImg = await loadImg(restaurant.logo_url);
        
        const logoSize = 100; // Size of logo in center
        const x = (canvas.width - logoSize) / 2;
        const y = 250 + (500 - logoSize) / 2;

        // Draw a white square behind the logo to mimic "excavate"
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(x - 5, y - 5, logoSize + 10, logoSize + 10);
        
        // Draw the logo image
        ctx.drawImage(logoImg, x, y, logoSize, logoSize);
      }

      // 5. Footer Text
      ctx.fillStyle = "#000000";
      ctx.font = "bold 32px Arial";
      ctx.fillText("Scan to view our menu", canvas.width / 2, 850);
      
      ctx.font = "20px Arial";
      ctx.fillStyle = "#999999";
      ctx.fillText(menuUrl, canvas.width / 2, 900);

      URL.revokeObjectURL(qrUrl);

      // Share
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "menu-qr.png", { type: "image/png" });
        if (navigator.share) {
          await navigator.share({
            files: [file],
            title: restaurant.name,
            text: `Menu for ${restaurant.name}`,
          });
        }
      }, "image/png");

    } catch (err) {
      console.error("Error generating share image", err);
    }
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
