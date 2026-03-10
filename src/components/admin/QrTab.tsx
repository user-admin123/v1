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

  // Helper to safely get CSS variables for the theme
  const getThemeColor = (varName: string, fallback: string) => {
    if (typeof window === "undefined") return fallback;
    const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return val || fallback;
  };

  const generateQrImage = async (): Promise<{ blob: Blob; url: string } | null> => {
    try {
      const svgEl = qrRef.current?.querySelector("svg");
      if (!svgEl) throw new Error("QR SVG not found");

      const canvas = document.createElement("canvas");
      const scale = 3; 
      canvas.width = 400 * scale;
      canvas.height = 560 * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context failed");

      ctx.scale(scale, scale);

      // 1. Theme Colors (Matching your App)
      const primary = getThemeColor('--primary', '#764ba2');
      const accent = getThemeColor('--accent', '#f093fb');

      // Draw Background
      const grad = ctx.createLinearGradient(0, 0, 400, 560);
      grad.addColorStop(0, primary);
      grad.addColorStop(1, accent);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 400, 560);

      // 2. White Card
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      // Using standard rect if roundRect isn't supported in old browsers
      if (ctx.roundRect) {
        ctx.roundRect(30, 30, 340, 500, 24);
      } else {
        ctx.rect(30, 30, 340, 500);
      }
      ctx.fill();

      // 3. Header Text
      ctx.fillStyle = "#1a1a2e";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(restaurant.name || "Our Menu", 200, 90);

      // 4. Draw the QR code SVG onto Canvas
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject("QR Load Timeout"), 4000);
        img.onload = () => {
          clearTimeout(timeout);
          ctx.drawImage(img, 80, 140, 240, 240);
          URL.revokeObjectURL(url);
          resolve(true);
        };
        img.onerror = () => reject("QR Image Load Error");
        img.src = url;
      });

      // 5. Scan Label
      ctx.fillStyle = primary;
      ctx.font = "bold 16px sans-serif";
      ctx.fillText("SCAN TO VIEW MENU", 200, 410);

      // 6. Final Blob Generation
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve({ blob, url: URL.createObjectURL(blob) });
          else resolve(null);
        }, "image/png");
      });
    } catch (error) {
      console.error("Image generation error:", error);
      return null;
    }
  };

  const handlePrint = async () => {
    setIsGenerating(true);
    const data = await generateQrImage();
    setIsGenerating(false);

    if (!data) {
      toast({ title: "Could not prepare print", variant: "destructive" });
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head><title>Print Menu QR</title></head>
        <body style="margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#eee;">
          <img id="p" src="${data.url}" style="width:100%; max-width:450px; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.1)">
          <script>
            document.getElementById('p').onload = () => {
              window.focus();
              setTimeout(() => { window.print(); }, 200);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleShare = async () => {
    setIsGenerating(true);
    const data = await generateQrImage();
    setIsGenerating(false);

    if (!data) {
      toast({ title: "Failed to generate share image", variant: "destructive" });
      return;
    }

    if (navigator.share) {
      try {
        const file = new File([data.blob], "menu-qr.png", { type: "image/png" });
        
        // Check if browser allows file sharing
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: restaurant.name,
            text: `Check out our digital menu at ${restaurant.name}!`
          });
        } else {
          // Fallback to just URL share
          await navigator.share({
            title: restaurant.name,
            url: menuUrl
          });
        }
      } catch (err) {
        console.log("Sharing failed or cancelled");
      }
    } else {
      toast({ title: "Sharing not supported on this device" });
    }
  };

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      {/* Hidden/Visible QR Source */}
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
        <Button 
          className="w-full" 
          onClick={onViewFullscreen} 
          disabled={isGenerating}
        >
          <Eye className="w-4 h-4 mr-2" /> View Fullscreen
        </Button>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1" 
            onClick={handlePrint} 
            disabled={isGenerating}
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
            Print
          </Button>
          
          <Button 
            variant="outline" 
            className="flex-1" 
            onClick={handleShare} 
            disabled={isGenerating}
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4 mr-2" />}
            Share
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QrTab;
