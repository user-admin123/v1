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
  const [loading, setLoading] = useState({ print: false, share: false });

  const getPrimaryColor = () => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || "0 0% 0%";

  const getLogoData = async (): Promise<{ data: string | null; useFull: boolean }> => {
    const skipLogo = !restaurant.logo_url || restaurant.show_qr_logo === false;
    if (skipLogo) return { data: null, useFull: true };

    try {
      const res = await fetch(restaurant.logo_url!, { mode: 'cors' });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      return { data, useFull: false };
    } catch {
      toast.error("Logo load failed. Using standard QR.", { position: "top-center" });
      return { data: null, useFull: true };
    }
  };

  const getSvgString = (useFull: boolean) => {
    const target = useFull ? hiddenFullQrRef.current : qrRef.current;
    return new XMLSerializer().serializeToString(target?.querySelector("svg")!);
  };

  const handlePrint = async () => {
    setLoading(prev => ({ ...prev, print: true }));
    const { data: logoData, useFull } = await getLogoData();
    const svgData = getSvgString(useFull);
    const primary = getPrimaryColor();

    const pw = window.open("", "_blank");
    if (!pw) return setLoading(prev => ({ ...prev, print: false }));

    pw.document.write(`
      <html>
        <head>
          <title>${restaurant.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;700&display=swap');
            @page { size: auto; margin: 0mm; }
            body { margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: 'Inter', sans-serif; }
            .card { background: white; border-radius: 32px; padding: 60px 40px; text-align: center; border: 8px solid hsl(${primary}); width: 450px; box-sizing: border-box; }
            .logo { width: 80px; height: 80px; border-radius: 16px; object-fit: cover; margin-bottom: 15px; border: 1px solid #eee; }
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
    setLoading(prev => ({ ...prev, print: false }));
  };

  const handleShare = async () => {
    setLoading(prev => ({ ...prev, share: true }));
    try {
      const { data: logoData, useFull } = await getLogoData();
      const cvs = document.createElement("canvas");
      const ctx = cvs.getContext("2d", { alpha: false })!;
      cvs.width = 900; cvs.height = 1200;

      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 900, 1200);
      ctx.strokeStyle = `hsl(${getPrimaryColor()})`;
      ctx.lineWidth = 16;
      ctx.roundRect ? ctx.roundRect(40, 40, 820, 1120, 60) : ctx.rect(40, 40, 820, 1120);
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.fillStyle = "#000";
      let currentY = 180;

      // Draw Name
      let nSize = 72; ctx.font = `bold ${nSize}px sans-serif`;
      while (ctx.measureText(restaurant.name).width > 780 && nSize > 32) ctx.font = `bold ${--nSize}px sans-serif`;
      ctx.fillText(restaurant.name, 450, currentY);

      // Draw Tagline
      if (restaurant.tagline) {
        currentY += 70;
        let tSize = 36; ctx.font = `italic ${tSize}px sans-serif`;
        ctx.fillStyle = "#666";
        while (ctx.measureText(restaurant.tagline).width > 780 && tSize > 20) ctx.font = `italic ${--tSize}px sans-serif`;
        ctx.fillText(restaurant.tagline, 450, currentY);
      }

      // Draw QR
      const qrImg = new Image();
      const svgBlob = new Blob([getSvgString(useFull)], { type: "image/svg+xml;charset=utf-8" });
      qrImg.src = URL.createObjectURL(svgBlob);

      await new Promise(r => qrImg.onload = r);
      const qrY = currentY + 80;
      ctx.drawImage(qrImg, 200, qrY, 500, 500);

      if (logoData) {
        const lImg = new Image();
        lImg.src = logoData;
        await new Promise(r => lImg.onload = r);
        ctx.fillStyle = "#fff";
        ctx.fillRect(385, qrY + 185, 130, 130);
        ctx.drawImage(lImg, 390, qrY + 190, 120, 120);
      }

      ctx.fillStyle = "#000"; ctx.font = "bold 44px sans-serif";
      ctx.fillText("Scan to view our digital menu", 450, 1060);

      cvs.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "menu-qr.png", { type: "image/png" });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: restaurant.name });
        } else {
          const a = document.createElement('a');
          a.href = cvs.toDataURL("image/png");
          a.download = `${restaurant.name}-menu.png`;
          a.click();
        }
      });
    } catch (e) {
      toast.error("Share failed", { position: "top-center" });
    } finally {
      setLoading(prev => ({ ...prev, share: false }));
    }
  };

  const hasEmbeddedLogo = restaurant.show_qr_logo !== false && !!restaurant.logo_url;

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
        <Button variant="outline" className="flex-1" onClick={handlePrint} disabled={loading.print}>
          {loading.print ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />} Print
        </Button>
        <Button variant="outline" className="flex-1" onClick={handleShare} disabled={loading.share}>
          {loading.share ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Share2 className="w-4 h-4 mr-2" />} Share
        </Button>
      </div>
    </div>
  );
};

export default QrTab;
