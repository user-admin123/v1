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

  // THE FIX: Converts any URL (even restricted ones) into a safe local object URL
  const getSafeImage = async (url: string): Promise<string> => {
    if (url.startsWith('data:')) return url; // Already base64
    try {
      const response = await fetch(url, { mode: 'cors' });
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (e) {
      console.warn("CORS fetch failed, falling back to direct URL", e);
      return url; 
    }
  };

  const handlePrint = async () => {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;
    
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const primaryColor = getPrimaryColor();
    
    // Get a safe version of the logo for the print window
    const safeLogo = restaurant.logo_url ? await getSafeImage(restaurant.logo_url) : null;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Menu QR</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;700&display=swap');
            body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: 'Inter', sans-serif; }
            .card { border: 8px solid hsl(${primaryColor}); border-radius: 32px; padding: 40px; text-align: center; width: 400px; }
            .logo { width: 80px; height: 80px; border-radius: 12px; margin-bottom: 10px; object-fit: cover; }
            h2 { font-family: 'Playfair Display', serif; font-size: 32px; margin: 10px 0; }
            .qr-container { padding: 20px; background: #f9f9f9; border-radius: 20px; display: inline-block; margin: 20px 0; }
            .qr-container svg { width: 250px !important; height: 250px !important; }
          </style>
        </head>
        <body>
          <div class="card">
            ${safeLogo ? `<img src="${safeLogo}" class="logo" />` : ""}
            <h2>${restaurant.name}</h2>
            <div class="qr-container">${svgData}</div>
            <p><strong>Scan to view menu</strong></p>
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            };
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
    canvas.height = 1100;

    // 1. Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Draw Text
    ctx.textAlign = "center";
    ctx.fillStyle = "#000000";
    ctx.font = "bold 60px serif";
    ctx.fillText(restaurant.name, canvas.width / 2, 150);

    try {
      // 3. Draw QR Code
      const svgString = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const qrUrl = URL.createObjectURL(svgBlob);
      
      const qrImg = new Image();
      qrImg.src = qrUrl;
      await new Promise((res) => (qrImg.onload = res));
      ctx.drawImage(qrImg, 200, 250, 500, 500);
      URL.revokeObjectURL(qrUrl);

      // 4. Draw Logo (The trickiest part)
      if (restaurant.logo_url && restaurant.show_qr_logo !== false) {
        const safeUrl = await getSafeImage(restaurant.logo_url);
        const logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        logoImg.src = safeUrl;
        
        await new Promise((resolve) => {
          logoImg.onload = () => {
            const size = 120;
            const x = (canvas.width - size) / 2;
            const y = 250 + (500 - size) / 2; // Center of QR
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(x - 10, y - 10, size + 20, size + 20); // White backing
            ctx.drawImage(logoImg, x, y, size, size);
            resolve(null);
          };
          logoImg.onerror = () => resolve(null); // Continue if logo fails
        });
      }

      // 5. Finalize and Share
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "menu.png", { type: "image/png" });
        if (navigator.share) {
          await navigator.share({ files: [file], title: "Menu QR" });
        }
      });

    } catch (err) {
      console.error("Sharing failed", err);
    }
  };

  const hasEmbeddedLogo = restaurant.show_qr_logo !== false && !!restaurant.logo_url;

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      <div className="bg-white p-6 rounded-2xl border shadow-sm" ref={qrRef}>
        <QRCodeSVG
          value={menuUrl}
          size={160}
          level="H"
          imageSettings={hasEmbeddedLogo ? { src: restaurant.logo_url!, height: 38, width: 38, excavate: true } : undefined}
        />
      </div>
      <Button className="w-full" onClick={onViewFullscreen}><Eye className="w-4 h-4 mr-2" />View Fullscreen</Button>
      <div className="flex gap-2 w-full">
        <Button variant="outline" className="flex-1" onClick={handlePrint}><Printer className="w-4 h-4 mr-2" />Print</Button>
        <Button variant="outline" className="flex-1" onClick={handleShare}><Share2 className="w-4 h-4 mr-2" />Share</Button>
      </div>
    </div>
  );
};

export default QrTab;
