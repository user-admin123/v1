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

  // Helper to get actual HEX/RGB from Tailwind CSS variables
  const getThemeColor = (variable: string) => {
    if (typeof window === "undefined") return "#000000";
    const color = getComputedStyle(document.documentElement).getPropertyValue(variable);
    return color ? `hsl(${color.trim()})` : "#000000";
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;
    
    // Clone SVG to remove logo for a cleaner look if desired
    const svgClone = svgEl.cloneNode(true) as SVGElement;
    const svgData = new XMLSerializer().serializeToString(svgClone);

    const primary = getThemeColor("--primary");
    const foreground = getThemeColor("--foreground");
    const muted = getThemeColor("--muted-foreground");

    printWindow.document.write(`
      <html><head><title>${restaurant.name} - Menu QR</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:'Inter',sans-serif;background:#ffffff}
        .card{text-align:center;width:100%;max-width:450px;padding:40px;}
        h1{font-size:32px;font-weight:800;color:${foreground};margin-bottom:8px;letter-spacing:-0.5px}
        .tagline{color:${muted};font-size:16px;margin-bottom:32px;text-transform:uppercase;letter-spacing:1px}
        .qr-container{position:relative;display:inline-block;padding:24px;border:2px solid ${primary};border-radius:32px;margin-bottom:32px}
        .scan-cta{font-size:20px;font-weight:700;color:${primary};margin-bottom:8px}
        .url{font-size:12px;color:${muted};opacity:0.7}
      </style></head>
      <body>
        <div class="card">
          <h1>${restaurant.name}</h1>
          ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
          <div class="qr-container">${svgData}</div>
          <p class="scan-cta">SCAN TO VIEW LIVE MENU</p>
          <p class="url">${menuUrl}</p>
        </div>
        <script>setTimeout(()=>{window.print();window.close();},500);</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const handleShare = async () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // High resolution for modern look
    canvas.width = 800;
    canvas.height = 1000;
    const primary = getThemeColor("--primary");
    const foreground = getThemeColor("--foreground");

    // 1. Solid Clean Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Restaurant Name
    ctx.fillStyle = foreground;
    ctx.font = "bold 56px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(restaurant.name.toUpperCase(), canvas.width / 2, 180);

    // 3. Tagline
    if (restaurant.tagline) {
      ctx.fillStyle = "#6b7280";
      ctx.font = "500 24px sans-serif";
      ctx.fillText(restaurant.tagline, canvas.width / 2, 230);
    }

    // 4. QR Code Drawing
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;
    
    // Remove logo from the shared QR for maximum scan reliability
    const svgClone = svgEl.cloneNode(true) as SVGElement;
    const imgNode = svgClone.querySelector("image");
    if (imgNode) imgNode.remove();

    const svgData = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = async () => {
      // Modern QR Frame
      ctx.strokeStyle = primary;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(175, 300, 450, 450, 40);
      ctx.stroke();

      // Draw QR
      ctx.drawImage(img, 225, 350, 350, 350);

      // 5. Professional CTA
      ctx.fillStyle = primary;
      ctx.font = "bold 32px sans-serif";
      ctx.fillText("SCAN FOR THE LIVE MENU", canvas.width / 2, 830);

      ctx.fillStyle = "#9ca3af";
      ctx.font = "20px sans-serif";
      ctx.fillText(menuUrl, canvas.width / 2, 875);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "menu.png", { type: "image/png" });
        if (navigator.share) {
          try {
            await navigator.share({
              files: [file],
              title: `${restaurant.name} Menu`,
            });
          } catch (e) { /* silent fail */ }
        }
        URL.revokeObjectURL(url);
      });
    };
    img.src = url;
  };

  return (
    <div className="mt-3 flex flex-col items-center gap-6">
      {/* Modern UI Display */}
      <div 
        className="bg-white p-8 rounded-[2rem] shadow-xl border-2 border-primary/10 transition-transform hover:scale-[1.02]" 
        ref={qrRef}
      >
        <QRCodeSVG
          value={menuUrl}
          size={200}
          level="H"
          includeMargin={false}
          imageSettings={
            restaurant.show_qr_logo !== false && restaurant.logo_url
              ? { src: restaurant.logo_url, height: 40, width: 40, excavate: true }
              : undefined
          }
        />
      </div>
      
      <div className="text-center space-y-1">
        <h3 className="font-bold text-foreground">Digital Menu Access</h3>
        <p className="text-xs text-muted-foreground max-w-[200px]">
          Scan to view our latest offerings and seasonal specials.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 w-full">
        <Button size="lg" className="w-full rounded-xl font-bold" onClick={onViewFullscreen}>
          <Eye className="w-4 h-4 mr-2" />
          Preview Display
        </Button>
        
        <div className="flex gap-2">
          <Button variant="outline" size="lg" className="flex-1 rounded-xl" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="lg" className="flex-1 rounded-xl" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QrTab;
