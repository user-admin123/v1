import { useRef, useState } from "react";
import { RestaurantInfo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Eye, Printer, Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  restaurant: RestaurantInfo;
  menuUrl: string;
  onViewFullscreen: () => void;
}

const QrTab = ({ restaurant, menuUrl, onViewFullscreen }: Props) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const hiddenFullQrRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState({ printing: false, sharing: false });

  // Helpers
  const getPrimary = () => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || "0 0% 0%";
  
  const getLogo = async (): Promise<string | null> => {
    if (!restaurant.logo_url || restaurant.show_qr_logo === false) return null;
    try {
      const res = await fetch(restaurant.logo_url, { mode: 'cors' });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      return new Promise(r => {
        const reader = new FileReader();
        reader.onloadend = () => r(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch {
      toast.error("Logo load failed. Using standard QR...", { position: "top-center", duration: 3000 });
      return null;
    }
  };

  const getSvgData = (isFull: boolean) => {
    const target = isFull ? hiddenFullQrRef.current : qrRef.current;
    return new XMLSerializer().serializeToString(target?.querySelector("svg")!);
  };

  const handlePrint = async () => {
    setLoading(prev => ({ ...prev, printing: true }));
    const logoData = await getLogo();
    const svgData = getSvgData(!logoData);
    
    const pw = window.open("", "_blank");
    if (!pw) return setLoading(prev => ({ ...prev, printing: false }));

    pw.document.write(`
      <html>
        <head>
          <title>${restaurant.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;700&display=swap');
            body { margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: 'Inter', sans-serif; }
            .card { border: 8px solid hsl(${getPrimary()}); padding: 60px 40px; text-align: center; border-radius: 32px; width: 450px; }
            .logo { width: 80px; height: 80px; border-radius: 16px; object-fit: cover; margin-bottom: 15px; border: 1px solid #eee; }
            h2 { font-family: 'Playfair Display'; font-size: 32px; margin: 0 0 8px; }
            .tagline { color: #666; font-style: italic; margin-bottom: 30px; }
            .qr-wrap svg { width: 250px !important; height: 250px !important; }
            .scan { margin-top: 30px; font-size: 20px; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="card">
            ${logoData ? `<img src="${logoData}" class="logo" />` : ""}
            <h2>${restaurant.name}</h2>
            ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
            <div class="qr-wrap">${svgData}</div>
            <p class="scan">Scan to view our digital menu</p>
          </div>
          <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script>
        </body>
      </html>
    `);
    pw.document.close();
    setLoading(prev => ({ ...prev, printing: false }));
  };

  const handleShare = async () => {
    setLoading(prev => ({ ...prev, sharing: true }));
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      canvas.width = 900; canvas.height = 1200;

      // Background & Border
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 900, 1200);
      ctx.strokeStyle = `hsl(${getPrimary()})`; ctx.lineWidth = 16;
      ctx.roundRect ? ctx.roundRect(40, 40, 820, 1120, 60) : ctx.rect(40, 40, 820, 1120);
      ctx.stroke();

      // Text Drawing Helper
      const drawText = (text: string, y: number, size: number, style = "bold", color = "#000") => {
        ctx.font = `${style} ${size}px sans-serif`;
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.fillText(text, 450, y);
      };

      drawText(restaurant.name, 180, 72);
      let nextY = 250;
      if (restaurant.tagline) {
        drawText(restaurant.tagline, 250, 36, "italic", "#666");
        nextY = 330;
      }

      // QR and Logo Processing
      const logoData = await getLogo();
      const svgBlob = new Blob([getSvgData(!logoData)], { type: "image/svg+xml" });
      const qrUrl = URL.createObjectURL(svgBlob);
      
      const loadImg = (src: string) => new Promise<HTMLImageElement>((r) => {
        const img = new Image(); img.onload = () => r(img); img.src = src;
      });

      const qrImg = await loadImg(qrUrl);
      ctx.drawImage(qrImg, 200, nextY, 500, 500);
      URL.revokeObjectURL(qrUrl);

      if (logoData) {
        const logoImg = await loadImg(logoData);
        ctx.fillStyle = "#fff";
        ctx.fillRect(385, nextY + 185, 130, 130);
        ctx.drawImage(logoImg, 390, nextY + 190, 120, 120);
      }

      drawText("Scan to view our digital menu", 1060, 44);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "menu-qr.png", { type: "image/png" });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: restaurant.name });
        } else {
          const a = document.createElement('a');
          a.href = canvas.toDataURL();
          a.download = `${restaurant.name}-qr.png`;
          a.click();
        }
      });
    } catch {
      toast.error("Share failed", { position: "top-center" });
    } finally {
      setLoading(prev => ({ ...prev, sharing: false }));
    }
  };

  const hasLogo = restaurant.show_qr_logo !== false && !!restaurant.logo_url;

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      <div className="bg-white p-6 rounded-2xl border shadow-sm" ref={qrRef}>
        <QRCodeSVG value={menuUrl} size={160} level="H" 
          imageSettings={hasLogo ? { src: restaurant.logo_url!, height: 38, width: 38, excavate: true } : undefined} 
        />
      </div>
      <div className="hidden" ref={hiddenFullQrRef}>
        <QRCodeSVG value={menuUrl} size={160} level="H" />
      </div>
      
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Your menu QR code</p>
        {hasLogo && <p className="text-xs text-primary font-medium mt-1">Logo embedded ✓</p>}
      </div>

      <Button className="w-full" onClick={onViewFullscreen}>
        <Eye className="w-4 h-4 mr-2" /> View QR Display
      </Button>
      
      <div className="flex gap-2 w-full">
        <Button variant="outline" className="flex-1" onClick={handlePrint} disabled={loading.printing}>
          {loading.printing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
          Print
        </Button>
        <Button variant="outline" className="flex-1" onClick={handleShare} disabled={loading.sharing}>
          {loading.sharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
          Share
        </Button>
      </div>
    </div>
  );
};

export default QrTab;
