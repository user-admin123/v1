import { useRef } from "react";
import { RestaurantInfo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Eye, Printer, Share2, CheckCircle2 } from "lucide-react";

interface Props {
  restaurant: RestaurantInfo;
  menuUrl: string;
  onViewFullscreen: () => void;
}

const QrTab = ({ restaurant, menuUrl, onViewFullscreen }: Props) => {
  const qrRef = useRef<HTMLDivElement>(null);

  const getThemeColor = (variable: string) => {
    if (typeof window === "undefined") return "#7c3aed";
    const val = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    return val ? `hsl(${val})` : "#7c3aed";
  };

  const handlePrint = () => {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const primaryColor = getThemeColor("--primary");
    const svgData = new XMLSerializer().serializeToString(svgEl);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Menu - ${restaurant.name}</title>
          <style>
            @page { margin: 0; size: auto; }
            body { 
              margin: 0; padding: 0; display: flex; justify-content: center; 
              align-items: center; height: 100vh; overflow: hidden;
              font-family: sans-serif; background: #fff;
            }
            .card { 
              border: 3px solid ${primaryColor}; 
              padding: 40px; 
              border-radius: 40px; 
              text-align: center; 
              width: 350px;
              box-sizing: border-box;
            }
            .logo { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 15px; border: 2px solid ${primaryColor}; }
            h2 { margin: 0; font-size: 28px; color: #000; }
            .tagline { color: #555; font-size: 14px; margin: 5px 0 25px; }
            .qr-wrap svg { width: 240px; height: 240px; }
            .scan-text { margin-top: 25px; font-weight: bold; color: ${primaryColor}; font-size: 20px; }
            .url { font-size: 11px; color: #999; margin-top: 10px; word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="card">
            ${restaurant.logo_url ? `<img src="${restaurant.logo_url}" class="logo" />` : ""}
            <h2>${restaurant.name}</h2>
            ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
            <div class="qr-wrap">${svgData}</div>
            <div class="scan-text">SCAN TO VIEW MENU</div>
            <div class="url">${menuUrl}</div>
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => { window.print(); window.close(); }, 800);
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
    const size = 1000;
    canvas.width = size;
    canvas.height = size;
    if (!ctx) return;

    const primaryColor = getThemeColor("--primary");

    // 1. Draw Modern Card with Rounded Corners
    ctx.fillStyle = "#ffffff";
    const r = 80; // Corner radius
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(size - r, 0);
    ctx.quadraticCurveTo(size, 0, size, r);
    ctx.lineTo(size, size - r);
    ctx.quadraticCurveTo(size, size, size - r, size);
    ctx.lineTo(r, size);
    ctx.quadraticCurveTo(0, size, 0, size - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.fill();

    // Subtle Border
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 15;
    ctx.stroke();

    // 2. Prepare Images with CORS and Cache-Busting
    const qrImg = new Image();
    const logoImg = new Image();
    
    // Add a timestamp to the URL to bypass browser cache issues
    const logoSrc = restaurant.logo_url ? `${restaurant.logo_url}${restaurant.logo_url.includes('?') ? '&' : '?'}t=${Date.now()}` : "";
    logoImg.crossOrigin = "anonymous";

    const drawFinalImage = () => {
      // Draw Text
      ctx.textAlign = "center";
      ctx.fillStyle = "#000000";
      ctx.font = "bold 55px sans-serif";
      ctx.fillText(restaurant.name, size / 2, 180);

      if (restaurant.tagline) {
        ctx.font = "30px sans-serif";
        ctx.fillStyle = "#666666";
        ctx.fillText(restaurant.tagline, size / 2, 230);
      }

      // Draw QR Code
      ctx.drawImage(qrImg, 250, 300, 500, 500);

      // Compulsory Center Logo
      if (restaurant.show_qr_logo !== false && restaurant.logo_url) {
        const lSize = 120;
        const cx = size / 2;
        const cy = 550; // Center of the QR area

        // White circular background for logo
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(cx, cy, lSize / 1.7, 0, Math.PI * 2);
        ctx.fill();

        // Draw the logo clipped to circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, lSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logoImg, cx - lSize / 2, cy - lSize / 2, lSize, lSize);
        ctx.restore();
      }

      ctx.fillStyle = primaryColor;
      ctx.font = "bold 40px sans-serif";
      ctx.fillText("SCAN TO VIEW MENU", size / 2, 880);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "menu-qr.png", { type: "image/png" });
        if (navigator.share) {
          try {
            await navigator.share({
              files: [file],
              title: restaurant.name,
              text: `View our menu here: ${menuUrl}`,
            });
          } catch (e) { console.error("Share failed", e); }
        }
      }, "image/png");
    };

    // Load QR first, then Logo
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    qrImg.src = URL.createObjectURL(svgBlob);
    
    qrImg.onload = () => {
      if (logoSrc) {
        logoImg.src = logoSrc;
        logoImg.onload = drawFinalImage;
        logoImg.onerror = drawFinalImage; // Draw QR even if logo fails
      } else {
        drawFinalImage();
      }
    };
  };

  const showLogoInQr = restaurant.show_qr_logo !== false && restaurant.logo_url;

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      <div className="bg-white p-6 rounded-3xl border shadow-sm" ref={qrRef}>
        <QRCodeSVG
          value={menuUrl}
          size={180}
          level="H"
          imageSettings={
            showLogoInQr
              ? { src: restaurant.logo_url!, height: 40, width: 40, excavate: true }
              : undefined
          }
        />
      </div>

      <div className="flex flex-col items-center gap-1">
        <p className="text-sm text-muted-foreground">Your menu QR code</p>
        {showLogoInQr && (
          <span className="text-xs text-primary flex items-center gap-1 font-semibold">
            <CheckCircle2 className="w-3 h-3" /> Logo embedded ✓
          </span>
        )}
      </div>

      <Button className="w-full rounded-xl" onClick={onViewFullscreen}>
        <Eye className="w-4 h-4 mr-2" /> View QR Display
      </Button>

      <div className="flex gap-2 w-full">
        <Button variant="outline" className="flex-1 rounded-xl" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" /> Print
        </Button>
        <Button variant="outline" className="flex-1 rounded-xl" onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-2" /> Share
        </Button>
      </div>
    </div>
  );
};

export default QrTab;
