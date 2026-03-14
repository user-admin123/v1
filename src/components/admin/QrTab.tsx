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
  const qrRef = useRef<HTMLDivElement>(null);
  const hiddenFullQrRef = useRef<HTMLDivElement>(null);
  const [loadingState, setLoadingState] = useState<{ print: boolean; share: boolean }>({ print: false, share: false });

  // --- Utilities ---
  const getPrimaryColor = () => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || "0 0% 0%";

  const getBase64 = async (url: string): Promise<string | null> => {
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) return null;
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch { return null; }
  };

  const getQrAsset = async (useLogo: boolean) => {
    const targetRef = useLogo ? qrRef.current : hiddenFullQrRef.current;
    const svg = targetRef?.querySelector("svg");
    if (!svg) return null;
    return new XMLSerializer().serializeToString(svg);
  };

  const processLogo = async () => {
    if (restaurant.show_qr_logo === false || !restaurant.logo_url) return { logoData: null, useFull: true };
    const logoData = await getBase64(restaurant.logo_url);
    if (!logoData) {
      toast.error("Logo load failed. Using standard QR.", { position: "top-center" });
      return { logoData: null, useFull: true };
    }
    return { logoData, useFull: false };
  };

  // --- Actions ---
  const handlePrint = async () => {
    setLoadingState(prev => ({ ...prev, print: true }));
    try {
      const { logoData, useFull } = await processLogo();
      const svgData = await getQrAsset(!useFull);
      const pw = window.open("", "_blank");
      if (!pw || !svgData) return;

      const titleScale = Math.min(38, (40 / restaurant.name.length) * 38);
      const taglineScale = Math.min(18, (60 / (restaurant.tagline?.length || 1)) * 18);

      pw.document.write(`
        <html>
          <head>
            <title>${restaurant.name}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;700&display=swap');
              @page { size: auto; margin: 0mm; }
              body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: 'Inter', sans-serif; }
              .card { background: white; border-radius: 32px; padding: 60px 40px; text-align: center; border: 8px solid hsl(${getPrimaryColor()}); width: 450px; }
              .logo { width: 80px; height: 80px; border-radius: 16px; object-fit: cover; margin-bottom: 15px; border: 1px solid #eee; }
              h2 { font-family: 'Playfair Display', serif; font-size: ${titleScale}px; margin: 0 0 8px 0; }
              .tagline { color: #666; font-size: ${taglineScale}px; font-style: italic; margin-bottom: 30px; }
              .qr-wrap svg { width: 250px!important; height: 250px!important; padding: 20px; border: 2px solid #f0f0f0; border-radius: 24px; }
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
    } finally { setLoadingState(prev => ({ ...prev, print: false })); }
  };

  const handleShare = async () => {
    setLoadingState(prev => ({ ...prev, share: true }));
    try {
      await document.fonts.ready;
      const cvs = document.createElement("canvas");
      const ctx = cvs.getContext("2d", { alpha: false });
      if (!ctx) return;

      cvs.width = 900; cvs.height = 1200;
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 900, 1200);
      ctx.strokeStyle = `hsl(${getPrimaryColor()})`; ctx.lineWidth = 16;
      ctx.roundRect ? ctx.roundRect(40, 40, 820, 1120, 60) : ctx.rect(40, 40, 820, 1120);
      ctx.stroke();

      let currentY = 180;
      ctx.textAlign = "center";
      
      // Text drawing helper
      const drawText = (text: string, size: number, color: string, style: string, y: number) => {
        let fontSize = size;
        ctx.font = `${style} ${fontSize}px sans-serif`;
        while (ctx.measureText(text).width > 780 && fontSize > 20) {
          fontSize -= 2;
          ctx.font = `${style} ${fontSize}px sans-serif`;
        }
        ctx.fillStyle = color;
        ctx.fillText(text, 450, y);
        return y + (size === 72 ? 70 : 80);
      };

      currentY = drawText(restaurant.name, 72, "#000", "bold", currentY);
      if (restaurant.tagline) currentY = drawText(restaurant.tagline, 36, "#666", "italic", currentY);

      const { logoData, useFull } = await processLogo();
      const svgData = await getQrAsset(!useFull);
      if (!svgData) throw new Error();

      const qrImg = new Image();
      const qrUrl = URL.createObjectURL(new Blob([svgData], { type: "image/svg+xml" }));

      qrImg.onload = () => {
        ctx.drawImage(qrImg, 200, currentY + 30, 500, 500);
        URL.revokeObjectURL(qrUrl);

        const finish = () => {
          ctx.fillStyle = "#000"; ctx.font = "bold 44px sans-serif";
          ctx.fillText("Scan to view our digital menu", 450, 1060);
          cvs.toBlob(async (blob) => {
            if (!blob) return;
            const file = new File([blob], "menu-qr.png", { type: "image/png" });
            try {
              if (navigator.share && navigator.canShare?.({ files: [file] })) {
                await navigator.share({ files: [file], title: restaurant.name, text: `Menu: ${menuUrl}` });
              } else {
                const a = document.createElement('a');
                a.href = cvs.toDataURL(); a.download = `${restaurant.name}-qr.png`; a.click();
              }
            } catch (e: any) { if (e.name !== 'AbortError') toast.error("Share failed", { position: "top-center" }); }
            setLoadingState(prev => ({ ...prev, share: false }));
          });
        };

        if (logoData) {
          const lImg = new Image();
          lImg.onload = () => {
            ctx.fillStyle = "#fff"; ctx.fillRect(385, currentY + 215, 130, 130);
            ctx.drawImage(lImg, 390, currentY + 220, 120, 120);
            finish();
          };
          lImg.src = logoData;
        } else finish();
      };
      qrImg.src = qrUrl;
    } catch { 
      toast.error("Process failed", { position: "top-center" });
      setLoadingState(prev => ({ ...prev, share: false }));
    }
  };

  const hasEmbeddedLogo = useMemo(() => restaurant.show_qr_logo !== false && !!restaurant.logo_url, [restaurant]);

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      <div className="bg-white p-6 rounded-2xl border shadow-sm" ref={qrRef}>
        <QRCodeSVG value={menuUrl} size={160} level="H" 
          imageSettings={hasEmbeddedLogo ? { src: restaurant.logo_url!, height: 38, width: 38, excavate: true } : undefined} 
        />
      </div>
      <div className="hidden" ref={hiddenFullQrRef}>
        <QRCodeSVG value={menuUrl} size={160} level="H" />
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">Your menu QR code</p>
        {hasEmbeddedLogo && <p className="text-xs text-primary font-medium mt-1">Logo embedded ✓</p>}
      </div>

      <Button className="w-full" onClick={onViewFullscreen}>
        <Eye className="w-4 h-4 mr-2" />View QR Display
      </Button>

      <div className="flex gap-2 w-full">
        <Button variant="outline" className="flex-1" onClick={handlePrint} disabled={loadingState.print}>
          {loadingState.print ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Printer className="mr-2 h-4 w-4" />} Print
        </Button>
        <Button variant="outline" className="flex-1" onClick={handleShare} disabled={loadingState.share}>
          {loadingState.share ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Share2 className="mr-2 h-4 w-4" />} Share
        </Button>
      </div>
    </div>
  );
};

export default QrTab;
