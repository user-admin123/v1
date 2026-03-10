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
    const svgData = new XMLSerializer().serializeToString(svgEl);
    
    // Using CSS variables to match your web project theme in the print window
    printWindow.document.write(`
      <html><head><title>Menu QR - ${restaurant.name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:'Inter',sans-serif;
          background: hsl(var(--background));}
        .card{background:white;border-radius:24px;padding:48px 40px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.1);max-width:400px;width:90%; border: 1px solid hsl(var(--border))}
        .logo{width:64px;height:64px;border-radius:50%;object-fit:cover;margin:0 auto 12px;border:3px solid hsl(var(--primary))}
        h2{font-family:'Playfair Display',serif;font-size:28px;color:hsl(var(--foreground));margin-bottom:4px}
        .tagline{color:hsl(var(--muted-foreground));font-size:14px;font-style:italic;margin-bottom:20px}
        .qr-wrap{display:inline-block;padding:16px;border-radius:16px;background:hsl(var(--secondary));margin:16px 0}
        .scan-text{margin-top:20px;font-size:16px;font-weight:600;color:hsl(var(--primary));display:flex;align-items:center;justify-content:center;gap:8px}
        .url{font-size:11px;color:hsl(var(--muted-foreground));margin-top:8px}
        .footer{margin-top:16px;padding-top:12px;border-top:1px solid hsl(var(--border));font-size:10px;color:hsl(var(--muted-foreground))}
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
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set Canvas Dimensions
    canvas.width = 500;
    canvas.height = 700;

    // 1. Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Restaurant Name
    ctx.fillStyle = "#1a1a2e";
    ctx.font = "bold 32px serif";
    ctx.textAlign = "center";
    ctx.fillText(restaurant.name, canvas.width / 2, 100);

    // 3. Tagline
    if (restaurant.tagline) {
      ctx.fillStyle = "#666666";
      ctx.font = "italic 18px sans-serif";
      ctx.fillText(restaurant.tagline, canvas.width / 2, 135);
    }

    // 4. Draw QR Code from SVG to Canvas
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = async () => {
      // Draw QR background box
      ctx.fillStyle = "#f3f4f6";
      ctx.roundRect(100, 180, 300, 300, 20);
      ctx.fill();
      
      // Draw QR Code
      ctx.drawImage(img, 125, 205, 250, 250);

      // 5. Footer Text
      ctx.fillStyle = "#764ba2"; // Matches your primary theme
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("📱 Scan for Menu", canvas.width / 2, 530);

      ctx.fillStyle = "#999999";
      ctx.font = "12px sans-serif";
      ctx.fillText(menuUrl, canvas.width / 2, 560);

      // Convert to file and Share
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "menu-qr.png", { type: "image/png" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `${restaurant.name} QR Menu`,
              text: `Check out the menu for ${restaurant.name}`,
            });
          } catch (error) {
            toast({ title: "Sharing failed", variant: "destructive" });
          }
        } else {
          toast({ title: "Your browser doesn't support image sharing", variant: "destructive" });
        }
        URL.revokeObjectURL(url);
      });
    };
    img.src = url;
  };

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      {/* Container with theme colors */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-border" ref={qrRef}>
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
      
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Your menu QR code
        </p>
        {restaurant.show_qr_logo !== false && restaurant.logo_url && (
          <span className="text-xs text-primary font-medium">Logo embedded ✓</span>
        )}
      </div>

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
