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

  // Helper to convert URL to Base64 to prevent CORS issues in Canvas/Print
  const getBase64Image = async (url: string): Promise<string> => {
    const response = await fetch(url, { mode: 'cors' });
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const loadSafeImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = url;
    });
  };

  const handlePrint = async () => {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;

    let logoBase64 = "";
    if (restaurant.logo_url) {
      try {
        logoBase64 = await getBase64Image(restaurant.logo_url);
      } catch (e) {
        console.warn("Could not convert logo to base64 for printing", e);
      }
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const primaryColor = getPrimaryColor();

    printWindow.document.write(`
      <html>
        <head>
          <title>${restaurant.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;700&display=swap');
            @page { size: auto; margin: 0mm !important; }
            html, body { margin: 0; padding: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #fff; }
            .card { background: white; border-radius: 32px; padding: 60px 40px; text-align: center; border: 8px solid hsl(${primaryColor}); width: 450px; display: flex; flex-direction: column; align-items: center; box-sizing: border-box; }
            .logo { width: 80px; height: 80px; border-radius: 16px; object-fit: cover; margin-bottom: 15px; }
            h2 { font-family: 'Playfair Display', serif; font-size: 38px; color: #000; margin: 0 0 8px 0; }
            .tagline { color: #666; font-size: 18px; font-style: italic; margin-bottom: 30px; }
            .qr-wrap { padding: 20px; border-radius: 24px; border: 2px solid #f0f0f0; background: white; }
            .qr-wrap svg { width: 250px !important; height: 250px !important; }
            .scan-text { margin-top: 30px; font-size: 20px; font-weight: 700; color: #000; }
          </style>
        </head>
        <body>
          <div class="card">
            ${logoBase64 ? `<img src="${logoBase64}" class="logo" />` : ""}
            <h2>${restaurant.name}</h2>
            ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
            <div class="qr-wrap">${svgData}</div>
            <p class="scan-text">Scan to view our digital menu</p>
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
    canvas.height = 1200;

    // Background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = `hsl(${getPrimaryColor()})`;
    ctx.lineWidth = 16;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

    ctx.textAlign = "center";

    try {
      // 1. Handle Logo First (Convert to Base64 to ensure Canvas access)
      let logoImg: HTMLImageElement | null = null;
      if (restaurant.logo_url) {
        const base64 = await getBase64Image(restaurant.logo_url);
        logoImg = await loadSafeImage(base64);
      }

      // 2. Draw Top Logo
      if (logoImg) {
        const topSize = 120;
        const tx = (canvas.width - topSize) / 2;
        ctx.drawImage(logoImg, tx, 100, topSize, topSize);
      }

      // 3. Text
      ctx.fillStyle = "#000000";
      ctx.font = "bold 72px serif";
      ctx.fillText(restaurant.name, canvas.width / 2, 320);

      // 4. Draw QR Code
      const svgString = new XMLSerializer().serializeToString(svgEl);
      const qrUrl = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgString)));
      const qrImg = await loadSafeImage(qrUrl);
      
      const qSize = 500;
      const qx = (canvas.width - qSize) / 2;
      const qy = 450;
      ctx.drawImage(qrImg, qx, qy, qSize, qSize);

      // 5. Center Logo inside QR
      if (logoImg && restaurant.show_qr_logo !== false) {
        const s = 110;
        const lx = (canvas.width - s) / 2;
        const ly = qy + (qSize - s) / 2;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(lx - 10, ly - 10, s + 20, s + 20);
        ctx.drawImage(logoImg, lx, ly, s, s);
      }

      ctx.fillStyle = "#000000";
      ctx.font = "bold 44px sans-serif";
      ctx.fillText("Scan to view our digital menu", canvas.width / 2, 1080);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "menu-qr.png", { type: "image/png" });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: restaurant.name,
            text: `Check out our menu: ${menuUrl}`
          });
        }
      }, "image/png");

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
          imageSettings={hasEmbeddedLogo ? {
            src: restaurant.logo_url!,
            height: 38, width: 38, excavate: true,
          } : undefined}
        />
      </div>
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Your menu QR code</p>
        {hasEmbeddedLogo && <p className="text-xs text-primary font-medium mt-1">Logo embedded ✓</p>}
      </div>
      <Button className="w-full" onClick={onViewFullscreen}><Eye className="w-4 h-4 mr-2" />View QR Display</Button>
      <div className="flex gap-2 w-full">
        <Button variant="outline" className="flex-1" onClick={handlePrint}><Printer className="w-4 h-4 mr-2" />Print</Button>
        <Button variant="outline" className="flex-1" onClick={handleShare}><Share2 className="w-4 h-4 mr-2" />Share Image</Button>
      </div>
    </div>
  );
};

export default QrTab;
