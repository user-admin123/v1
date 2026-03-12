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

  // Helper to convert any URL/Base64 to a Canvas-safe Image object
  const getCanvasImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Image load failed"));
      // Add cache buster for URL types to force CORS re-evaluation
      img.src = src.startsWith('data:') ? src : `${src}${src.includes('?') ? '&' : '?'}t=${Date.now()}`;
    });
  };

  const handlePrint = async () => {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const primaryColor = getPrimaryColor();
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Use a safe version of the logo for printing
    const logoHtml = restaurant.logo_url 
      ? `<img src="${restaurant.logo_url}" class="logo" crossorigin="anonymous" />` 
      : "";

    printWindow.document.write(`
      <html>
        <head>
          <title>${restaurant.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;700&display=swap');
            body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #fff; font-family: 'Inter', sans-serif; }
            .card { border: 8px solid hsl(${primaryColor}); border-radius: 32px; padding: 50px; text-align: center; width: 450px; box-sizing: border-box; }
            .logo { width: 80px; height: 80px; border-radius: 16px; object-fit: cover; margin-bottom: 20px; border: 1px solid #eee; }
            h2 { font-family: 'Playfair Display', serif; font-size: 38px; margin: 0 0 10px 0; }
            .qr-wrap { display: inline-block; padding: 25px; border-radius: 24px; border: 2px solid #f0f0f0; margin: 20px 0; background: #fff; }
            .qr-wrap svg { width: 250px !important; height: 250px !important; }
            .footer-text { font-size: 20px; font-weight: 700; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="card">
            ${logoHtml}
            <h2>${restaurant.name}</h2>
            <div class="qr-wrap">${svgData}</div>
            <p class="footer-text">Scan to view our digital menu</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();

    // FIX: Wait for all images in the print window to load before triggering print
    const images = printWindow.document.querySelectorAll('img');
    const promises = Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
    });

    await Promise.all(promises);
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      // Optional: printWindow.close(); // Remove if it causes "Error on Printing"
    }, 500);
  };

  const handleShare = async () => {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 900;
    canvas.height = 1200;

    try {
      // 1. Fill Background
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Draw Main Border
      ctx.strokeStyle = `hsl(${getPrimaryColor()})`;
      ctx.lineWidth = 20;
      ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

      // 3. Draw Text
      ctx.textAlign = "center";
      ctx.fillStyle = "#000000";
      ctx.font = "bold 72px serif";
      ctx.fillText(restaurant.name, canvas.width / 2, 220);

      // 4. Draw QR Code
      const svgString = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const qrUrl = URL.createObjectURL(svgBlob);
      const qrImg = await getCanvasImage(qrUrl);
      
      const qrSize = 550;
      const qx = (canvas.width - qrSize) / 2;
      const qy = 350;

      // QR White Background
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(qx - 20, qy - 20, qrSize + 40, qrSize + 40);
      ctx.drawImage(qrImg, qx, qy, qrSize, qrSize);
      URL.revokeObjectURL(qrUrl);

      // 5. Draw Center Logo (The fix for missing logo)
      if (restaurant.logo_url && restaurant.show_qr_logo !== false) {
        try {
          const logoImg = await getCanvasImage(restaurant.logo_url);
          const lSize = 120;
          const lx = (canvas.width - lSize) / 2;
          const ly = qy + (qrSize - lSize) / 2;
          
          // White square behind logo
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(lx - 10, ly - 10, lSize + 20, lSize + 20);
          ctx.drawImage(logoImg, lx, ly, lSize, lSize);
        } catch (e) {
          console.log("Logo skip: ", e);
        }
      }

      ctx.fillStyle = "#000000";
      ctx.font = "bold 44px sans-serif";
      ctx.fillText("Scan to view our digital menu", canvas.width / 2, 1050);

      // 6. Export to Blob and Share
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "menu-qr.png", { type: "image/png" });
        if (navigator.share) {
          await navigator.share({ 
            files: [file], 
            title: restaurant.name,
            text: `Check out our menu at ${restaurant.name}`
          });
        }
      }, "image/png", 1.0);

    } catch (error) {
      console.error("Design generation failed:", error);
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
