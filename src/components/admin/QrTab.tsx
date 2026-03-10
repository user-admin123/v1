import { useRef, useState } from "react";
import { RestaurantInfo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Eye, Printer, Share2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  restaurant: RestaurantInfo;
  menuUrl: string;
  onViewFullscreen: () => void;
}

const QrTab = ({ restaurant, menuUrl, onViewFullscreen }: Props) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);

  // Function to pull HSL values from your theme CSS variables
  const getThemeColor = (varName: string, fallback: string) => {
    if (typeof window === "undefined") return fallback;
    const style = getComputedStyle(document.documentElement);
    const value = style.getPropertyValue(varName).trim();
    if (!value) return fallback;
    return value.includes('%') || value.split(' ').length === 3 ? `hsl(${value})` : value;
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;

    const primary = getThemeColor("--primary", "#764ba2");
    const accent = getThemeColor("--accent", "#f093fb");
    const svgData = new XMLSerializer().serializeToString(svgEl);

    printWindow.document.write(`
      <html><head><title>Menu QR - ${restaurant.name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:'Inter',sans-serif;
          background:linear-gradient(135deg, ${primary} 0%, ${accent} 100%)}
        .card{background:white;border-radius:24px;padding:48px 40px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-width:400px;width:90%}
        .logo{width:64px;height:64px;border-radius:50%;object-fit:cover;margin:0 auto 12px;border:3px solid ${primary}}
        h2{font-family:'Playfair Display',serif;font-size:28px;color:#1a1a2e;margin-bottom:4px}
        .tagline{color:#888;font-size:14px;font-style:italic;margin-bottom:20px}
        .qr-wrap{display:inline-block;padding:16px;border-radius:16px;background:#f8fafc;margin:16px 0; border: 1px solid #eee;}
        .scan-text{margin-top:20px;font-size:16px;font-weight:600;color:${primary};display:flex;align-items:center;justify-content:center;gap:8px}
        .url{font-size:11px;color:#aaa;margin-top:8px;word-break:break-all}
        .footer{margin-top:16px;padding-top:12px;border-top:1px solid #eee;font-size:10px;color:#bbb}
      </style></head>
      <body><div class="card">
        ${restaurant.logo_url ? `<img src="${restaurant.logo_url}" class="logo" alt="logo"/>` : ""}
        <h2>${restaurant.name}</h2>
        ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
        <div class="qr-wrap">${svgData}</div>
        <p class="scan-text">📱 Scan me to get the live menu!</p>
        <p class="url">${menuUrl}</p>
        <p class="footer">Powered by ${restaurant.name}</p>
      </div>
      <script>
        window.onload = () => {
          setTimeout(() => { window.print(); window.close(); }, 500);
        };
      </script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const handleShare = async () => {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl || !navigator.share) {
      toast({ title: "Sharing not supported on this browser", variant: "destructive" });
      return;
    }

    setIsSharing(true);
    try {
      const canvas = document.createElement("canvas");
      const scale = 3; 
      canvas.width = 400 * scale;
      canvas.height = 560 * scale;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.scale(scale, scale);
        const primary = getThemeColor("--primary", "#764ba2");
        const accent = getThemeColor("--accent", "#f093fb");

        // Background Theme Gradient
        const grad = ctx.createLinearGradient(0, 0, 400, 560);
        grad.addColorStop(0, primary);
        grad.addColorStop(1, accent);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 400, 560);

        // White Card
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(30, 30, 340, 500, 24);
        else ctx.rect(30, 30, 340, 500);
        ctx.fill();

        // Restaurant Name
        ctx.fillStyle = "#1a1a2e";
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(restaurant.name, 200, 90);

        // Convert SVG to Canvas Image
        const svgData = new XMLSerializer().serializeToString(svgEl);
        const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();

        await new Promise((resolve) => {
          img.onload = () => {
            ctx.drawImage(img, 100, 160, 200, 200);
            URL.revokeObjectURL(url);
            resolve(null);
          };
          img.src = url;
        });

        // Scan Text
        ctx.fillStyle = primary;
        ctx.font = "bold 16px sans-serif";
        ctx.fillText("Scan for Menu", 200, 400);

        // Export and Share File
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], "menu-qr.png", { type: "image/png" });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: `${restaurant.name} Menu`,
              });
            } else {
              // Fallback to URL only if file share is restricted
              await navigator.share({ title: restaurant.name, url: menuUrl });
            }
          }
          setIsSharing(false);
        }, "image/png");
      }
    } catch (err) {
      console.error("Share failed", err);
      setIsSharing(false);
    }
  };

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      <div className="bg-white p-6 rounded-2xl border shadow-sm" ref={qrRef}>
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
            <span className="text-xs text-primary font-medium">Logo embedded ✓</span>
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
        <Button 
          variant="outline" 
          className="flex-1" 
          onClick={handleShare}
          disabled={isSharing}
        >
          {isSharing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Share2 className="w-4 h-4 mr-2" />}
          Share
        </Button>
      </div>
    </div>
  );
};

export default QrTab;
