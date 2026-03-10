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

    // Clone the SVG so we can modify it without affecting the UI
    const clonedSvg = svgEl.cloneNode(true) as SVGElement;
    
    // REMOVE the logo and the white background "mask" from the share version
    const logoImg = clonedSvg.querySelector("image");
    const logoRect = clonedSvg.querySelector("rect:not([fill='white']):not([fill='black'])"); // Usually the logo mask
    
    // We target the image and path/rect used for excavation and remove them
    const images = clonedSvg.getElementsByTagName("image");
    while(images.length > 0) images[0].parentNode?.removeChild(images[0]);
    
    // Remove the white "excavation" square if it exists
    const paths = clonedSvg.getElementsByTagName("path");
    for (let i = 0; i < paths.length; i++) {
        if (paths[i].getAttribute("fill") === "white" && paths[i].getAttribute("d")?.includes("M")) {
            // This is a logic to detect the center "hole" path in qrcode.react
            // But a simpler way is just to ensure the QR code is generated 
            // without the imageSettings for the canvas.
        }
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 500;
    canvas.height = 700;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header Text
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.font = "bold 36px Arial";
    ctx.fillText(restaurant.name, canvas.width / 2, 100);

    if (restaurant.tagline) {
      ctx.font = "italic 20px Arial";
      ctx.fillStyle = "#555555";
      ctx.fillText(restaurant.tagline, canvas.width / 2, 140);
    }

    // Convert modified SVG (no logo) to Image
    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = async () => {
      ctx.drawImage(img, 100, 180, 300, 300);
      
      ctx.fillStyle = "#000000";
      ctx.font = "bold 22px Arial";
      ctx.fillText("Scan to view our live menu", canvas.width / 2, 540);
      
      ctx.font = "16px Arial";
      ctx.fillStyle = "#777777";
      ctx.fillText(menuUrl, canvas.width / 2, 580);

      URL.revokeObjectURL(url);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "menu-qr.png", { type: "image/png" });
        if (navigator.share) {
          try {
            await navigator.share({
              files: [file],
              title: restaurant.name,
              text: `View our menu: ${menuUrl}`,
            });
          } catch (e) { /* user cancelled */ }
        }
      }, "image/png");
    };
    img.src = url;
  };

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      {/* UI and Print version: Logo and Excavation (cutout) remain active */}
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
