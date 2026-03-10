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

  // Helper to load Base64 image for Canvas
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const handleShare = async () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1. Setup Canvas Size (optimized for social sharing)
    canvas.width = 600;
    canvas.height = 800;

    // 2. Get Theme Colors (Accessing CSS Variables)
    const style = getComputedStyle(document.documentElement);
    const primaryColor = style.getPropertyValue("--primary").trim() || "#764ba2";
    const bgColor = "#ffffff";

    // 3. Draw Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    try {
      let currentY = 80;

      // 4. Draw Logo (Base64)
      if (restaurant.logo_url) {
        const logo = await loadImage(restaurant.logo_url);
        const logoSize = 100;
        ctx.save();
        ctx.beginPath();
        ctx.arc(canvas.width / 2, currentY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logo, canvas.width / 2 - logoSize / 2, currentY, logoSize, logoSize);
        ctx.restore();
        currentY += logoSize + 30;
      }

      // 5. Draw Restaurant Name
      ctx.fillStyle = "#1a1a2e";
      ctx.font = "bold 42px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(restaurant.name, canvas.width / 2, currentY);
      currentY += 40;

      // 6. Draw Tagline
      if (restaurant.tagline) {
        ctx.fillStyle = "#666666";
        ctx.font = "italic 24px sans-serif";
        ctx.fillText(restaurant.tagline, canvas.width / 2, currentY);
        currentY += 60;
      }

      // 7. Draw QR Code (Clean - No Center Logo)
      const svgEl = qrRef.current?.querySelector("svg");
      if (svgEl) {
        const svgData = new XMLSerializer().serializeToString(svgEl);
        // Remove embedded image from SVG string for the shared image
        const cleanSvgData = svgData.replace(/<image.*?\/>/, ""); 
        const svgBlob = new Blob([cleanSvgData], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);
        const qrImg = await loadImage(url);
        
        const qrSize = 300;
        ctx.drawImage(qrImg, canvas.width / 2 - qrSize / 2, currentY, qrSize, qrSize);
        URL.revokeObjectURL(url);
        currentY += qrSize + 50;
      }

      // 8. Draw Footer/Call to Action
      ctx.fillStyle = `hsl(${primaryColor})`;
      ctx.font = "bold 24px sans-serif";
      ctx.fillText("Scan to view menu", canvas.width / 2, currentY);

      // 9. Convert to File and Share
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "restaurant-qr.png", { type: "image/png" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${restaurant.name} Menu`,
            text: `Check out the menu for ${restaurant.name}!`,
          });
        }
      }, "image/png");

    } catch (error) {
      console.error("Error sharing image:", error);
    }
  };

  const handlePrint = () => {
    // ... Keeping your existing print function as requested
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
      
      {/* UI Elements */}
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
