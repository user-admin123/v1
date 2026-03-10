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

  // --- THE SINGLE SOURCE OF TRUTH ---
  const generateQrImage = async (): Promise<{ blob: Blob; url: string } | null> => {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return null;

    const canvas = document.createElement("canvas");
    const scale = 3; // Extra high res for printing sharpness
    canvas.width = 400 * scale;
    canvas.height = 560 * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.scale(scale, scale);

    // Draw Background
    const grad = ctx.createLinearGradient(0, 0, 400, 560);
    grad.addColorStop(0, "#667eea");
    grad.addColorStop(1, "#764ba2");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 400, 560);

    // Draw Card
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.roundRect(30, 30, 340, 500, 24);
    ctx.fill();

    // Draw Text
    ctx.fillStyle = "#1a1a2e";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(restaurant.name, 200, 90);

    // Draw QR
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

  // --- REFACTORED ACTIONS ---

  const handlePrint = async () => {
    const data = await generateQrImage();
    if (!data) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html><head><title>Print Menu</title></head>
      <body style="margin:0; display:flex; justify-content:center; align-items:center; height:100vh;">
        <img src="${data.url}" style="width:100%; max-width:500px;" onload="window.print(); window.close();">
      </body></html>
    `);
    printWindow.document.close();
  };

  const handleShare = async () => {
    // 1. Try to share as a file first
    const data = await generateQrImage();
    
    if (data && navigator.canShare && navigator.share) {
      const file = new File([data.blob], "restaurant-qr.png", { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: restaurant.name,
            text: "Scan to view our menu!",
          });
          return;
        } catch (e) { /* user cancelled */ }
      }
    }

    // 2. FALLBACK: Fixed Clipboard Logic
    // We use a backup method for the clipboard to ensure it actually copies
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(menuUrl);
      } else {
        // Fallback for non-secure or older browsers
        const textArea = document.createElement("textarea");
        textArea.value = menuUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      toast({ title: "Link copied to clipboard!" });
    } catch (err) {
      toast({ title: "Failed to copy link", variant: "destructive" });
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
