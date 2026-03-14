import { useRef, useState, useMemo } from "react";
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
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const hiddenFullQrRef = useRef<HTMLDivElement>(null);

  // --- Constants & State Logic ---
  const hasLogoPref = restaurant.show_qr_logo !== false && !!restaurant.logo_url;
  const primaryColor = useMemo(() => 
    getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || "0 0% 0%", []);

  // --- Core Utility: Asset Loading & Serialization ---
  const prepareAssets = async () => {
    let logoData: string | null = null;
    if (hasLogoPref) {
      try {
        const res = await fetch(restaurant.logo_url!, { mode: 'cors' });
        const blob = await res.blob();
        logoData = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch {
        toast.error("Logo load failed. Using standard QR.", { position: "top-center" });
      }
    }
    const svgEl = (!logoData ? hiddenFullQrRef : qrRef).current?.querySelector("svg");
    const svgData = new XMLSerializer().serializeToString(svgEl!);
    return { logoData, svgData };
  };

  // --- Action: Print ---
  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const { logoData, svgData } = await prepareAssets();
      const pw = window.open("", "_blank");
      if (!pw) return;

      pw.document.write(`
        <html>
          <head>
            <title>${restaurant.name}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;700&display=swap');
              @page { size: auto; margin: 0mm; }
              body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: 'Inter', sans-serif; }
              .card { background: white; border-radius: 32px; padding: 60px 40px; text-align: center; border: 8px solid hsl(${primaryColor}); width: 450px; box-sizing: border-box; }
              .logo { width: 80px; height: 80px; border-radius: 16px; object-fit: cover; border: 1px solid #eee; margin-bottom: 15px; }
              h2 { font-family: 'Playfair Display', serif; font-size: clamp(24px, ${1520 / restaurant.name.length}px, 38px); margin: 0 0 8px 0; }
              .tagline { color: #666; font-size: 16px; font-style: italic; margin-bottom: 30px; }
              .qr-wrap svg { width: 250px !important; height: 250px !important; }
              .scan-text { margin-top: 30px; font-size: 20px; font-weight: 700; }
            </style>
          </head>
          <body>
            <div class="card">
              ${logoData ? `<img src="${logoData}" class="logo" />` : ""}
              <h2>${restaurant.name}</h2>
              ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
              <div class="qr-wrap">${svgData}</div>
              <p class="scan-text">Scan to view our digital menu</p>
            </div>
            <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };</script>
          </body>
        </html>
      `);
      pw.document.close();
    } finally { setIsPrinting(false); }
  };

  // --- Action: Share ---
  const handleShare = async () => {
    setIsSharing(true);
    try {
      await document.fonts.ready;
      const { logoData, svgData } = await prepareAssets();
      const cvs = document.createElement("canvas");
      const ctx = cvs.getContext("2d", { alpha: false })!;
      
      cvs.width = 900; cvs.height = 1200;
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, 900, 1200);
      ctx.strokeStyle = `hsl(${primaryColor})`; ctx.lineWidth = 16;
      ctx.roundRect ? ctx.roundRect(40, 40, 820, 1120, 60) : ctx.rect(40, 40, 820, 1120);
      ctx.stroke();

      ctx.textAlign = "center"; ctx.fillStyle = "#000000";
      
      // Dynamic Title
      let fontSize = 72;
      ctx.font = `bold ${fontSize}px sans-serif`;
      while (ctx.measureText(restaurant.name).width > 780 && fontSize > 32) {
        ctx.font = `bold ${--fontSize}px sans-serif`;
      }
      ctx.fillText(restaurant.name, 450, 180);

      let currentY = 250;
      if (restaurant.tagline) {
        ctx.font = "italic 32px sans-serif"; ctx.fillStyle = "#666";
        ctx.fillText(restaurant.tagline, 450, currentY);
        currentY += 80;
      }

      // QR and Logo Drawing
      const qrImg = new Image();
      const qrBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      qrImg.src = URL.createObjectURL(qrBlob);
      await new Promise(r => qrImg.onload = r);
      ctx.drawImage(qrImg, 200, currentY, 500, 500);
      URL.revokeObjectURL(qrImg.src);

      if (logoData) {
        const lImg = new Image(); lImg.src = logoData;
        await new Promise(r => lImg.onload = r);
        ctx.fillStyle = "#fff"; ctx.fillRect(385, currentY + 185, 130, 130);
        ctx.drawImage(lImg, 390, currentY + 190, 120, 120);
      }

      ctx.fillStyle = "#000"; ctx.font = "bold 44px sans-serif";
      ctx.fillText("Scan to view our digital menu", 450, 1060);

      cvs.toBlob(async (blob) => {
        if (!blob) return;
        const f = new File([blob], "menu-qr.png", { type: "image/png" });
        if (navigator.share && navigator.canShare?.({ files: [f] })) {
          await navigator.share({ files: [f], title: restaurant.name, text: `Menu: ${menuUrl}` });
        } else {
          const a = document.createElement('a');
          a.href = cvs.toDataURL("image/png");
          a.download = `${restaurant.name}-qr.png`;
          a.click();
        }
        setIsSharing(false);
      });
    } catch { 
      toast.error("Share failed", { position: "top-center" }); 
      setIsSharing(false); 
    }
  };

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      {/* Visible QR for UI */}
      <div className="bg-white p-6 rounded-2xl border shadow-sm" ref={qrRef}>
        <QRCodeSVG 
          value={menuUrl} size={160} level="H"
          imageSettings={hasLogoPref ? { src: restaurant.logo_url!, height: 38, width: 38, excavate: true } : undefined}
        />
      </div>

      {/* Hidden Plain QR for Fallbacks */}
      <div className="hidden" ref={hiddenFullQrRef}>
        <QRCodeSVG value={menuUrl} size={160} level="H" />
      </div>
      
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Your menu QR code</p>
        {hasLogoPref && <p className="text-xs text-primary font-medium mt-1">Logo embedded ✓</p>}
      </div>

      <Button className="w-full" onClick={onViewFullscreen}>
        <Eye className="w-4 h-4 mr-2" /> View QR Display
      </Button>
      
      <div className="flex gap-2 w-full">
        <ActionButton label="Print" icon={Printer} loading={isPrinting} onClick={handlePrint} />
        <ActionButton label="Share" icon={Share2} loading={isSharing} onClick={handleShare} />
      </div>
    </div>
  );
};

const ActionButton = ({ label, icon: Icon, loading, onClick }: any) => (
  <Button variant="outline" className="flex-1" onClick={onClick} disabled={loading}>
    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Icon className="w-4 h-4 mr-2" />}
    {label}
  </Button>
);

export default QrTab;
