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

  // Helper to get theme colors. 
  // If your CSS uses HSL (like Shadcn), we use a fallback hex for the Canvas.
  const getThemeColor = (varName: string, fallback: string) => {
    if (typeof window === "undefined") return fallback;
    const style = getComputedStyle(document.documentElement);
    const value = style.getPropertyValue(varName).trim();
    if (!value) return fallback;
    // If it's a raw HSL string (e.g. "221.2 83.2% 53.3%"), wrap it.
    return value.includes('%') ? `hsl(${value})` : value;
  };

  const generateImage = async (): Promise<{ blob: Blob; url: string } | null> => {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return null;

    try {
      const canvas = document.createElement("canvas");
      const scale = 3; 
      canvas.width = 400 * scale;
      canvas.height = 580 * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.scale(scale, scale);

      // 1. Theme Colors
      const primaryColor = getThemeColor("--primary", "#764ba2");
      const accentColor = getThemeColor("--accent", "#f093fb");

      // 2. Background
      const grad = ctx.createLinearGradient(0, 0, 400, 580);
      grad.addColorStop(0, primaryColor);
      grad.addColorStop(1, accentColor);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 400, 580);

      // 3. White Card
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(30, 30, 340, 520, 24);
      else ctx.rect(30, 30, 340, 520);
      ctx.fill();

      // 4. Text
      ctx.fillStyle = "#1a1a2e";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(restaurant.name || "Menu", 200, 85);

      // 5. Load QR SVG with a Timeout Safety
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();

      await new Promise((resolve) => {
        const timer = setTimeout(() => resolve(null), 2000); // 2s timeout
        img.onload = () => {
          clearTimeout(timer);
          ctx.drawImage(img, 85, 150, 230, 230);
          URL.revokeObjectURL(url);
          resolve(null);
        };
        img.onerror = () => {
          clearTimeout(timer);
          resolve(null);
        };
        img.src = url;
      });

      // 6. Label
      ctx.fillStyle = primaryColor;
      ctx.font = "bold 16px sans-serif";
      ctx.fillText("SCAN TO VIEW MENU", 200, 420);

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve({ blob, url: URL.createObjectURL(blob) });
          else resolve(null);
        }, "image/png");
      });
    } catch (err) {
      console.error("Canvas Error:", err);
      return null;
    }
  };

  const handlePrint = async () => {
    setIsGenerating(true);
    const data = await generateImage();
    setIsGenerating(false);

    if (!data) {
      toast({ title: "Printing failed", variant: "destructive" });
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html><head><title>Print QR</title></head>
      <body style="margin:0;display:flex;justify-content:center;align-items:center;background:#fafafa;height:100vh;">
        <img src="${data.url}" style="width:100%;max-width:400px;border-radius:12px;" onload="window.print();window.close();">
      </body></html>
    `);
    printWindow.document.close();
  };

  const handleShare = async () => {
    setIsGenerating(true);
    const data = await generateImage();
    setIsGenerating(false);

    if (!data) {
      toast({ title: "Share generation failed", variant: "destructive" });
      return;
    }

    try {
      if (navigator.share && navigator.canShare) {
        const file = new File([data.blob], "menu-qr.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: restaurant.name,
            text: "Scan to view our menu!",
          });
          return;
        }
      }
      // Fallback share URL
      await navigator.share({ title: restaurant.name, url: menuUrl });
    } catch (e) {
      console.log("Share closed");
    }
  };

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      {/* The QR code is the "Source" for our canvas generator */}
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
          <Eye className="w-4 h-4 mr-2" />View Fullscreen
        </Button>
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="flex-1" onClick={handlePrint} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
            Print
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleShare} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="w-4 h-4 mr-2" />}
            Share
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QrTab;
