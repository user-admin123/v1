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
  const [qrRef, fullQrRef] = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const getPrimary = () => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || "0 0% 0%";

  const loadLogo = async () => {
    if (!restaurant.logo_url || restaurant.show_qr_logo === false) return { data: null, useFull: true };
    try {
      const res = await fetch(restaurant.logo_url, { mode: 'cors' });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      return { data, useFull: false };
    } catch {
      toast.error("Logo load failed. Using full QR...");
      return { data: null, useFull: true };
    }
  };

  const shrinkText = (ctx: CanvasRenderingContext2D, text: string, initialSize: number, maxW: number, style: string) => {
    let size = initialSize;
    ctx.font = `${style} ${size}px sans-serif`;
    while (ctx.measureText(text).width > maxW && size > 20) {
      size -= 2;
      ctx.font = `${style} ${size}px sans-serif`;
    }
    return size;
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    const { data: logoData, useFull } = await loadLogo();
    const svgData = new XMLSerializer().serializeToString((useFull ? fullQrRef : qrRef).current?.querySelector("svg")!);
    const pw = window.open("", "_blank");
    if (!pw) return setIsPrinting(false);

    pw.document.write(`
      <html><head><title>${restaurant.name}</title><style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;700&display=swap');
        body { margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: 'Inter'; }
        .card { border-radius: 32px; padding: 60px 40px; text-align: center; border: 8px solid hsl(${getPrimary()}); width: 450px; box-sizing: border-box; }
        .logo { width: 80px; height: 80px; border-radius: 16px; margin-bottom: 15px; border: 1px solid #eee; }
        h2 { font-family: 'Playfair Display'; font-size: clamp(24px, ${40/restaurant.name.length*38}px, 38px); margin: 0 0 8px; }
        .tagline { color: #666; font-size: clamp(14px, ${60/(restaurant.tagline?.length||1)*18}px, 18px); font-style: italic; margin-bottom: 30px; }
        svg { width: 250px !important; height: 250px !important; }
      </style></head>
      <body><div class="card">
        ${logoData ? `<img src="${logoData}" class="logo" />` : ""}
        <h2>${restaurant.name}</h2>
        ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
        <div style="padding: 20px; border-radius: 24px; border: 2px solid #f0f0f0; display: inline-block;">${svgData}</div>
        <p style="margin-top: 30px; font-weight: 700;">Scan to view our digital menu</p>
      </div><script>window.onload=()=>{setTimeout(()=>window.print(),500)}</script></body></html>`);
    pw.document.close();
    setIsPrinting(false);
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      await document.fonts.ready;
      const cvs = document.createElement("canvas");
      const ctx = cvs.getContext("2d", { alpha: false })!;
      cvs.width = 900; cvs.height = 1200;
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 900, 1200);
      ctx.strokeStyle = `hsl(${getPrimary()})`; ctx.lineWidth = 16;
      ctx.roundRect ? ctx.roundRect(40, 40, 820, 1120, 60) : ctx.rect(40, 40, 820, 1120); ctx.stroke();
      ctx.textAlign = "center"; ctx.fillStyle = "#000";

      let y = 180;
      shrinkText(ctx, restaurant.name, 72, 780, "bold");
      ctx.fillText(restaurant.name, 450, y);
      y += 70;

      if (restaurant.tagline) {
        shrinkText(ctx, restaurant.tagline, 36, 780, "italic");
        ctx.fillStyle = "#666"; ctx.fillText(restaurant.tagline, 450, y);
        y += 80;
      } else y += 20;

      const qrY = y + 30;
      const { data: logoData, useFull } = await loadLogo();
      const svgData = new XMLSerializer().serializeToString((useFull ? fullQrRef : qrRef).current?.querySelector("svg")!);
      const qrImg = new Image();
      
      qrImg.onload = () => {
        ctx.drawImage(qrImg, 200, qrY, 500, 500);
        if (logoData) {
          const logo = new Image();
          logo.onload = () => {
            ctx.fillStyle = "#fff"; ctx.fillRect(385, qrY + 185, 130, 130);
            ctx.drawImage(logo, 390, qrY + 190, 120, 120);
            finishShare(cvs);
          };
          logo.src = logoData;
        } else finishShare(cvs);
      };
      qrImg.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
    } catch { toast.error("Share failed"); setIsSharing(false); }
  };

  const finishShare = (cvs: HTMLCanvasElement) => {
    const ctx = cvs.getContext("2d")!;
    ctx.fillStyle = "#000"; ctx.font = "bold 44px sans-serif";
    ctx.fillText("Scan to view our digital menu", 450, 1060);
    cvs.toBlob(async (b) => {
      if (b) {
        const f = new File([b], "menu-qr.png", { type: "image/png" });
        if (navigator.share && navigator.canShare?.({ files: [f] })) {
          await navigator.share({ files: [f], title: restaurant.name });
        } else {
          const a = document.createElement("a"); a.href = cvs.toDataURL(); a.download = "qr.png"; a.click();
        }
      }
      setIsSharing(false);
    });
  };

  const hasLogo = restaurant.show_qr_logo !== false && !!restaurant.logo_url;

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      <div className="bg-white p-6 rounded-2xl border shadow-sm" ref={qrRef}>
        <QRCodeSVG value={menuUrl} size={160} level="H" imageSettings={hasLogo ? { src: restaurant.logo_url!, height: 38, width: 38, excavate: true } : undefined} />
      </div>
      <div className="hidden" ref={fullQrRef}><QRCodeSVG value={menuUrl} size={160} level="H" /></div>
      <div className="text-center text-sm text-muted-foreground">
        Your menu QR code {hasLogo && <p className="text-xs text-primary font-medium mt-1">Logo embedded ✓</p>}
      </div>
      <Button className="w-full" onClick={onViewFullscreen}><Eye className="mr-2 h-4 w-4" />View QR Display</Button>
      <div className="flex w-full gap-2">
        <Button variant="outline" className="flex-1" onClick={handlePrint} disabled={isPrinting}>
          {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />} Print
        </Button>
        <Button variant="outline" className="flex-1" onClick={handleShare} disabled={isSharing}>
          {isSharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />} Share
        </Button>
      </div>
    </div>
  );
};

export default QrTab;
