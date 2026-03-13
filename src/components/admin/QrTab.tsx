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
  const fullQrRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState({ print: false, share: false });

  const getPrimary = () => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || "0 0% 0%";

  const getBase64 = async (url: string): Promise<string | null> => {
    try {
      const res = await fetch(url, { mode: 'cors' });
      const blob = await res.blob();
      return new Promise((r) => {
        const reader = new FileReader();
        reader.onloadend = () => r(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch { return null; }
  };

  const getQrData = async () => {
    let logo = null, useFull = !restaurant.logo_url || restaurant.show_qr_logo === false;
    if (!useFull) {
      logo = await getBase64(restaurant.logo_url!);
      if (!logo) {
        toast.error("Logo load failed. Generating full QR code...", { position: "top-center", duration: 3000 });
        useFull = true;
      }
    }
    const svg = (useFull ? fullQrRef : qrRef).current?.querySelector("svg");
    return { logo, svgData: new XMLSerializer().serializeToString(svg!) };
  };

  const handlePrint = async () => {
    setLoading(prev => ({ ...prev, print: true }));
    try {
      const { logo, svgData } = await getQrData();
      const pw = window.open("", "_blank");
      if (!pw) return;
      pw.document.write(`
        <html><head><title>${restaurant.name}</title><style>
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;700&display=swap');
          body { margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: 'Inter', sans-serif; }
          .card { border: 8px solid hsl(${getPrimary()}); padding: 60px 40px; text-align: center; border-radius: 32px; width: 450px; }
          .logo { width: 80px; height: 80px; border-radius: 16px; margin-bottom: 15px; border: 1px solid #eee; }
          h2 { font-family: 'Playfair Display', serif; font-size: 32px; margin: 0; }
          .tag { color: #666; font-style: italic; margin-bottom: 30px; }
          .qr svg { width: 250px!important; height: 250px!important; }
        </style></head>
        <body><div class="card">
          ${logo ? `<img src="${logo}" class="logo" />` : ""}
          <h2>${restaurant.name}</h2>
          ${restaurant.tagline ? `<p class="tag">${restaurant.tagline}</p>` : ""}
          <div class="qr">${svgData}</div><p><b>Scan to view our digital menu</b></p>
        </div><script>window.onload=()=>{setTimeout(()=>{window.print();window.close()},500)}</script></body></html>
      `);
      pw.document.close();
    } finally { setLoading(prev => ({ ...prev, print: false })); }
  };

  const handleShare = async () => {
    setLoading(prev => ({ ...prev, share: true }));
    try {
      const { logo, svgData } = await getQrData();
      const cvs = document.createElement("canvas");
      const ctx = cvs.getContext("2d")!;
      cvs.width = 900; cvs.height = 1200;
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 900, 1200);
      ctx.strokeStyle = `hsl(${getPrimary()})`; ctx.lineWidth = 16;
      ctx.strokeRect(40, 40, 820, 1120);

      ctx.textAlign = "center"; ctx.fillStyle = "#000";
      ctx.font = "bold 60px sans-serif"; ctx.fillText(restaurant.name, 450, 180);
      let qrY = 220;
      if (restaurant.tagline) {
        ctx.font = "italic 30px sans-serif"; ctx.fillStyle = "#666";
        ctx.fillText(restaurant.tagline, 450, 240); qrY = 300;
      }

      const qrImg = new Image();
      qrImg.onload = () => {
        ctx.drawImage(qrImg, 200, qrY, 500, 500);
        if (logo) {
          const lImg = new Image();
          lImg.onload = () => {
            ctx.fillStyle = "#fff"; ctx.fillRect(385, qrY + 185, 130, 130);
            ctx.drawImage(lImg, 390, qrY + 190, 120, 120);
            finishShare(cvs);
          };
          lImg.src = logo;
        } else finishShare(cvs);
      };
      qrImg.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
    } catch { toast.error("Share failed"); setLoading(prev => ({ ...prev, share: false })); }
  };

  const finishShare = (cvs: HTMLCanvasElement) => {
    const ctx = cvs.getContext("2d")!;
    ctx.fillStyle = "#000"; ctx.font = "bold 40px sans-serif";
    ctx.fillText("Scan to view our digital menu", 450, 1060);
    cvs.toBlob(async (b) => {
      if (!b) return;
      const f = new File([b], "menu-qr.png", { type: "image/png" });
      try {
        if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], title: restaurant.name });
        else { const a = document.createElement('a'); a.href = cvs.toDataURL(); a.download = "qr.png"; a.click(); }
      } catch {}
      setLoading(prev => ({ ...prev, share: false }));
    });
  };

  const hasLogo = restaurant.show_qr_logo !== false && !!restaurant.logo_url;

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      <div className="bg-white p-6 rounded-2xl border shadow-sm" ref={qrRef}>
        <QRCodeSVG value={menuUrl} size={160} level="H" imageSettings={hasLogo ? { src: restaurant.logo_url!, height: 38, width: 38, excavate: true } : undefined} />
      </div>
      <div className="hidden" ref={fullQrRef}><QRCodeSVG value={menuUrl} size={160} level="H" /></div>
      <div className="text-center text-sm text-muted-foreground">Your menu QR code</div>
      <Button className="w-full" onClick={onViewFullscreen}><Eye className="w-4 h-4 mr-2" />View QR Display</Button>
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
