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

  // Helper to get CSS variables (theme colors) for the canvas
  const getThemeColor = (varName: string) => {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || "#764ba2";
  };

  const generateQrImage = async (): Promise<{ blob: Blob; url: string } | null> => {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return null;

    const canvas = document.createElement("canvas");
    const scale = 3; 
    canvas.width = 400 * scale;
    canvas.height = 560 * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.scale(scale, scale);

    // DYNAMIC THEME COLORS
    // This pulls from your app's CSS variables (--primary, --background, etc.)
    const primaryColor = getThemeColor('--primary');
    const accentColor = getThemeColor('--accent').length > 0 ? getThemeColor('--accent') : "#f093fb";

    // Draw Background using your App's Theme
    const grad = ctx.createLinearGradient(0, 0, 400, 560);
    grad.addColorStop(0, primaryColor);
    grad.addColorStop(1, accentColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 400, 560);

    // Draw Card
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.roundRect(30, 30, 340, 500, 24);
    ctx.fill();

    // Text & QR logic
    ctx.fillStyle = "#1a1a2e";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(restaurant.name, 200, 90);

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();

    await new Promise((resolve) => {
      img.onload = () => {
        ctx.drawImage(img, 80, 140, 240, 240);
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve({ blob, url: URL.createObjectURL(blob) });
        else resolve(null);
      }, "image/png");
    });
  };

  const handlePrint = async () => {
    const data = await generateQrImage();
    if (!data) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // FIX: We wait for the image to truly load in the new window before calling print()
    printWindow.document.write(`
      <html>
        <head><title>Print Menu</title></head>
        <body style="margin:0; display:flex; justify-content:center; align-items:center; height:100vh; background:#f0f0f0;">
          <img id="print-img" src="${data.url}" style="width:100%; max-width:500px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius:10px;">
          <script>
            const img = document.getElementById('print-img');
            img.onload = () => {
              window.focus();
              window.print();
              // Optional: window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleShare = async () => {
    const data = await generateQrImage();
    
    if (data && navigator.share) {
      const file = new File([data.blob], "restaurant-qr.png", { type: "image/png" });
      
      try {
        // Try sharing the file
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: restaurant.name,
            text: `Check out the menu for ${restaurant.name}!`,
          });
        } else {
          // Fallback to link share ONLY if file sharing isn't supported
          await navigator.share({
            title: restaurant.name,
            url: menuUrl,
          });
        }
      } catch (e) {
        console.log("Share cancelled or failed");
      }
    } else {
      toast({ title: "Sharing not supported on this browser", variant: "destructive" });
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
              ? { src: restaurant.logo_url, height: 32, width: 32, excavate: true }
              : undefined
          }
        />
      </div>
      
      <div className="flex flex-col gap-2 w-full">
        <Button className="w-full" onClick={onViewFullscreen}>
          <Eye className="w-4 h-4 mr-2" />View Fullscreen
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />Print
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />Share
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QrTab;
