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
  const [isGenerating, setIsGenerating] = useState(false);

  // Helper to get theme colors from your CSS variables
  const getThemeColor = (varName: string, fallback: string) => {
    if (typeof window === "undefined") return fallback;
    const style = getComputedStyle(document.documentElement);
    const value = style.getPropertyValue(varName).trim();
    if (!value) return fallback;
    // Handle HSL format (common in shadcn/ui) vs Hex/RGB
    return value.includes('%') || value.split(' ').length === 3 ? `hsl(${value})` : value;
  };

  const handlePrint = () => {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Get your current theme colors
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
        .qr-wrap{display:inline-block;padding:16px;border-radius:16px;background:#f8fafc;margin:16px 0;border: 1px solid #e2e8f0}
        .scan-text{margin-top:20px;font-size:16px;font-weight:600;color:${primary};}
        .url{font-size:11px;color:#aaa;margin-top:8px;word-break:break-all}
      </style></head>
      <body><div class="card">
        ${restaurant.logo_url ? `<img src="${restaurant.logo_url}" class="logo" alt="logo"/>` : ""}
        <h2>${restaurant.name}</h2>
        ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
        <div class="qr-wrap">${svgData}</div>
        <p class="scan-text">Scan to view our menu!</p>
        <p class="url">${menuUrl}</p>
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
    if (!svgEl) return;

    setIsGenerating(true);
    
    try {
      if (navigator.canShare && navigator.share) {
        const canvas = document.createElement("canvas");
        const scale = 3; // High res for sharing
        canvas.width = 400 * scale;
        canvas.height = 560 * scale;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          ctx.scale(scale, scale);
          const primary = getThemeColor("--primary", "#764ba2");
          const accent = getThemeColor("--accent", "#f093fb");

          // 1. Theme Gradient Background
          const grad = ctx.createLinearGradient(0, 0, 400, 560);
          grad.addColorStop(0, primary);
          grad.addColorStop(1, accent);
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 400, 560);

          // 2. White Card
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(30, 30, 340, 500, 24);
          else ctx.rect(30, 30, 340, 500);
          ctx.fill();

          // 3. Restaurant Name
          ctx.fillStyle = "#1a1a2e";
          ctx.font = "bold 24px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(restaurant.name, 200, 90);

          // 4. Draw QR Code
          const svgData = new XMLSerializer().serializeToString(svgEl);
          const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
          const url = URL.createObjectURL(svgBlob);
          const img = new Image();

          await new Promise((resolve) => {
            const timer = setTimeout(resolve, 2000); // Safety timeout
            img.onload = () => {
              clearTimeout(timer);
              ctx.drawImage(img, 100, 160, 200, 200);
              URL.revokeObjectURL(url);
              resolve(null);
            };
            img.src = url;
          });

          // 5. Theme Label
          ctx.fillStyle = primary;
          ctx.font = "bold 16px sans-serif";
          ctx.fillText("Scan for Menu", 200, 400);

          // 6. Share File
          const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
          if (blob) {
            const file = new File([blob], `${restaurant.name}-Menu.png`, { type: "image/png" });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: `${restaurant.name} Menu`,
                text: "View our live menu!",
              });
              setIsGenerating(false);
              return;
            }
          }
        }
      }
    } catch (err) {
      console.error("Image share failed", err);
    }

    // Fallback: Share Link
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${restaurant.name} Menu`,
          url: menuUrl,
        });
      } else {
        navigator.clipboard.writeText(menuUrl);
        toast({ title: "Menu URL copied to clipboard!" });
      }
    } catch (e) {}
    setIsGenerating(false);
  };

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      <div className="bg-white p-6 rounded-2xl shadow-sm border" ref={qrRef}>
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

      <div className="flex flex-col gap-2 w-full">
        <Button className="w-full" onClick={onViewFullscreen} disabled={isGenerating}>
          <Eye className="w-4 h-4 mr-2" />View QR Display
        </Button>
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="flex-1" onClick={handlePrint} disabled={isGenerating}>
            <Printer className="w-4 h-4 mr-2" />Print
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleShare} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Share2 className="w-4 h-4 mr-2" />
            )}
            Share
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QrTab;
