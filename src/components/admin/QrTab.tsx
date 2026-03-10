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

  // Helper to grab theme colors directly from your CSS variables
  const getThemeColor = (varName: string, fallback: string) => {
    if (typeof window === "undefined") return fallback;
    // This pulls from :root (e.g., --primary, --accent, etc.)
    const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return value ? `hsl(${value})` : fallback; 
    // Note: shadcn/ui uses HSL numbers. If you use hex, remove the `hsl()` wrapper.
  };

  const generateImage = async (): Promise<{ blob: Blob; url: string } | null> => {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return null;

    const canvas = document.createElement("canvas");
    const scale = 3; // Higher scale for crisp printing
    canvas.width = 400 * scale;
    canvas.height = 580 * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.scale(scale, scale);

    // 1. Get Theme Colors
    const primaryColor = getThemeColor("--primary", "#764ba2");
    const secondaryColor = getThemeColor("--accent", "#f093fb");

    // 2. Draw Background Gradient using Theme
    const grad = ctx.createLinearGradient(0, 0, 400, 580);
    grad.addColorStop(0, primaryColor);
    grad.addColorStop(1, secondaryColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 400, 580);

    // 3. Draw Card
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(30, 30, 340, 520, 24);
    else ctx.rect(30, 30, 340, 520);
    ctx.fill();

    // 4. Restaurant Name
    ctx.fillStyle = "#1a1a2e";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(restaurant.name, 200, 85);

    if (restaurant.tagline) {
      ctx.font = "italic 14px sans-serif";
      ctx.fillStyle = "#666";
      ctx.fillText(restaurant.tagline, 200, 110);
    }

    // 5. Draw QR Code
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();

    await new Promise((resolve, reject) => {
      img.onload = () => {
        ctx.drawImage(img, 85, 150, 230, 230);
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.onerror = reject;
      img.src = url;
    });

    // 6. Footer Text
    ctx.fillStyle = primaryColor;
    ctx.font = "bold 18px sans-serif";
    ctx.fillText("SCAN FOR LIVE MENU", 200, 420);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve({ blob, url: URL.createObjectURL(blob) });
        else resolve(null);
      }, "image/png");
    });
  };

  const handlePrint = async () => {
    setIsGenerating(true);
    const data = await generateImage();
    setIsGenerating(false);

    if (!data) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html><head><title>Print QR - ${restaurant.name}</title></head>
      <body style="margin:0; display:flex; justify-content:center; align-items:center; height:100vh; background:#f4f4f4;">
        <img src="${data.url}" style="width:100%; max-width:450px; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.1);" onload="window.print(); window.close();">
      </body></html>
    `);
    printWindow.document.close();
  };

  const handleShare = async () => {
    setIsGenerating(true);
    try {
      const data = await generateImage();
      if (data && navigator.share) {
        const file = new File([data.blob], `${restaurant.name}-Menu.png`, { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${restaurant.name} Menu`,
            text: `Scan to see the menu of ${restaurant.name}`,
          });
          return;
        }
      }
      
      // Fallback
      await navigator.share({ title: restaurant.name, url: menuUrl });
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
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
              ? { src: restaurant.logo_url, height: 34, width: 34, excavate: true }
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
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Printer className="w-4 h-4 mr-2" />}
            Print
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleShare} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Share2 className="w-4 h-4 mr-2" />}
            Share
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QrTab;
