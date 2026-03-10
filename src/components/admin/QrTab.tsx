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

    // Clone and remove logo from the center for the printed version
    const svgClone = svgEl.cloneNode(true) as SVGElement;
    const logoInQr = svgClone.querySelector("image");
    if (logoInQr) logoInQr.remove();
    const svgData = new XMLSerializer().serializeToString(svgClone);

    printWindow.document.write(`
      <html><head><title>${restaurant.name} - QR Menu</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        body { font-family: 'Inter', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #ffffff; }
        .card { text-align: center; padding: 40px; border: 1px solid #e5e7eb; border-radius: 24px; width: 100%; max-width: 380px; }
        h1 { margin: 0; font-size: 28px; font-weight: 900; color: #000000; letter-spacing: -0.5px; }
        .tagline { margin: 4px 0 24px; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
        .qr-wrap { background: #000000; padding: 16px; border-radius: 20px; display: inline-block; }
        /* Making the QR white on black for a premium look */
        svg { width: 220px; height: 220px; fill: white; }
        .cta { font-size: 18px; font-weight: 700; color: #000000; margin-top: 24px; margin-bottom: 4px; }
        .url { font-size: 11px; color: #9ca3af; word-break: break-all; }
      </style></head>
      <body>
        <div class="card">
          <h1>${restaurant.name}</h1>
          ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
          <div class="qr-wrap">${svgData}</div>
          <p class="cta">SCAN FOR LIVE MENU</p>
          <p class="url">${menuUrl}</p>
        </div>
        <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const handleShare = async () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // High resolution canvas
    canvas.width = 800;
    canvas.height = 1000;

    // 1. Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Restaurant Name
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.font = "bold 52px sans-serif";
    ctx.fillText(restaurant.name.toUpperCase(), canvas.width / 2, 200);

    // 3. Tagline
    if (restaurant.tagline) {
      ctx.fillStyle = "#666666";
      ctx.font = "500 24px sans-serif";
      ctx.fillText(restaurant.tagline, canvas.width / 2, 250);
    }

    // 4. QR Code Processing
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;
    
    const svgClone = svgEl.cloneNode(true) as SVGElement;
    const logoInQr = svgClone.querySelector("image");
    if (logoInQr) logoInQr.remove(); // Remove center logo for share image

    const svgData = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      // Draw a sleek black frame for the QR
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.roundRect(175, 320, 450, 450, 30);
      ctx.fill();

      // Draw QR (The SVG is black by default, so we'll draw it on white first or use the blob)
      // Since SVG is black, let's put a white box inside the black frame
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(200, 345, 400, 400, 15);
      ctx.fill();
      
      ctx.drawImage(img, 225, 370, 350, 350);

      // 5. CTA text
      ctx.fillStyle = "#000000";
      ctx.font = "bold 32px sans-serif";
      ctx.fillText("SCAN FOR LIVE MENU", canvas.width / 2, 850);

      // Convert to file and share
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "menu.png", { type: "image/png" });
        if (navigator.share) {
          try {
            await navigator.share({
              title: `${restaurant.name} Menu`,
              text: `View our menu online: ${menuUrl}`,
              files: [file],
            });
          } catch (e) { /* user cancelled */ }
        }
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    img.src = url;
  };

  return (
    <div className="mt-3 flex flex-col items-center gap-6">
      {/* UI QR Display - Uses Project Theme */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-border" ref={qrRef}>
        <QRCodeSVG
          value={menuUrl}
          size={180}
          level="H"
          imageSettings={
            restaurant.show_qr_logo !== false && restaurant.logo_url
              ? { src: restaurant.logo_url, height: 34, width: 34, excavate: true }
              : undefined
          }
        />
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">Your menu QR code</p>
        {restaurant.show_qr_logo !== false && restaurant.logo_url && (
          <span className="text-xs text-primary font-medium flex items-center justify-center gap-1 mt-1">
            Logo embedded ✓
          </span>
        )}
      </div>

      <Button className="w-full h-12 text-base font-semibold rounded-xl" onClick={onViewFullscreen}>
        <Eye className="w-5 h-5 mr-2" /> View QR Display
      </Button>

      <div className="flex gap-3 w-full">
        <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" /> Print
        </Button>
        <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-2" /> Share
        </Button>
      </div>
    </div>
  );
};

export default QrTab;
