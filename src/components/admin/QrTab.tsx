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
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const getPrimaryColor = () => 
    getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || "0 0% 0%";

  const handlePrint = async () => {
    setIsPrinting(true);
    const primary = getPrimaryColor();
    const hasLogoReq = !!restaurant.logo_url && restaurant.show_qr_logo !== false;
    
    const fullSvg = new XMLSerializer().serializeToString(hiddenFullQrRef.current?.querySelector("svg")!);
    const logoSvg = new XMLSerializer().serializeToString(qrRef.current?.querySelector("svg")!);

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setIsPrinting(false);
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${restaurant.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;700&display=swap');
            @page { size: auto; margin: 0mm !important; }
            html, body { margin: 0; padding: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #fff; font-family: 'Inter', sans-serif; }
            .card { background: white; border-radius: 32px; padding: 60px 40px; text-align: center; border: 8px solid hsl(${primary}); width: 450px; box-sizing: border-box; }
            .logo { width: 80px; height: 80px; border-radius: 16px; object-fit: cover; border: 3px solid hsl(${primary}); margin-bottom: 15px; padding: 2px; background: #fff; }
            h2 { font-family: 'Playfair Display', serif; font-size: 38px; color: #000; margin: 0 0 8px 0; }
            .tagline { color: #666; font-size: 18px; font-style: italic; margin-bottom: 30px; }
            .qr-wrap { display: inline-block; padding: 20px; border-radius: 24px; border: 2px solid #f0f0f0; margin: 10px 0; background: white; }
            .qr-wrap svg { width: 250px !important; height: 250px !important; }
            .scan-text { margin-top: 30px; font-size: 20px; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="card">
            ${restaurant.logo_url ? `<img src="${restaurant.logo_url}" class="logo" crossorigin="anonymous" id="pLogo" style="display: none;"/>` : ""}
            <h2>${restaurant.name}</h2>
            ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
            <div id="qrC" class="qr-wrap">${hasLogoReq ? logoSvg : fullSvg}</div>
            <p class="scan-text">Scan to view our digital menu</p>
          </div>
          <script>
            const img = document.getElementById('pLogo'), qrC = document.getElementById('qrC'), full = \`${fullSvg}\`;
            const go = () => setTimeout(() => { window.print(); window.close(); }, 500);
            if (img) {
              img.onload = () => { img.style.display = 'inline-block'; go(); };
              img.onerror = () => { img.remove(); qrC.innerHTML = full; go(); if (window.opener) window.opener.postMessage('fail', '*'); };
            } else window.onload = go;
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    setIsPrinting(false);
  };

  if (typeof window !== "undefined") {
    window.onmessage = (e) => e.data === 'fail' && toast.error("Logo failed for print. Using full QR.", { position: "top-center" });
  }

  const handleShare = async () => {
    setIsSharing(true);
    toast.info("Preparing image...", { position: "top-center" });
    const cvs = document.createElement("canvas"), ctx = cvs.getContext("2d");
    if (!ctx) { setIsSharing(false); return; }
    cvs.width = 900; cvs.height = 1200;

    const rect = (x: number, y: number, w: number, h: number, r: number, s = false) => {
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
      s ? ctx.stroke() : ctx.fill();
    };

    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 900, 1200);
    ctx.strokeStyle = `hsl(${getPrimaryColor()})`; ctx.lineWidth = 16;
    rect(40, 40, 820, 1120, 60, true);

    ctx.textAlign = "center"; ctx.fillStyle = "#000"; ctx.font = "bold 72px serif";
    ctx.fillText(restaurant.name, 450, 220);
    if (restaurant.tagline) { ctx.fillStyle = "#666"; ctx.font = "italic 36px sans-serif"; ctx.fillText(restaurant.tagline, 450, 290); }

    const logoImg = new Image(); logoImg.crossOrigin = "anonymous";
    let useFull = true;
    if (restaurant.logo_url && restaurant.show_qr_logo !== false) {
      useFull = !(await new Promise(r => { logoImg.onload = () => r(true); logoImg.onerror = () => r(false); logoImg.src = restaurant.logo_url!; }));
    }
    if (useFull && restaurant.logo_url) toast.error("Logo failed. Using full QR.", { position: "top-center" });

    const svg = useFull ? hiddenFullQrRef.current : qrRef.current;
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg?.querySelector("svg")!)], { type: "image/svg+xml" }));
    const qrImg = new Image();

    qrImg.onload = () => {
      ctx.fillStyle = "#fff"; rect(170, 350, 560, 560, 40);
      ctx.strokeStyle = "#f0f0f0"; ctx.lineWidth = 4; rect(170, 350, 560, 560, 40, true);
      ctx.drawImage(qrImg, 200, 380, 500, 500);
      if (!useFull) {
        ctx.fillStyle = "#fff"; ctx.fillRect(387, 567, 126, 126);
        ctx.drawImage(logoImg, 395, 575, 110, 110);
      }
      ctx.fillStyle = "#000"; ctx.font = "bold 44px sans-serif"; ctx.fillText("Scan to view our digital menu", 450, 1040);
      cvs.toBlob(async b => {
        if (b) {
          const f = new File([b], "menu.png", { type: "image/png" });
          if (navigator.share && navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f] });
          else { const a = document.createElement('a'); a.href = cvs.toDataURL(); a.download = "menu.png"; a.click(); }
        }
        setIsSharing(false);
      });
      URL.revokeObjectURL(url);
    };
    qrImg.src = url;
  };

  const hasEmbeddedLogo = restaurant.show_qr_logo !== false && !!restaurant.logo_url;

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      <div className="bg-white p-6 rounded-2xl border shadow-sm" ref={qrRef}>
        <QRCodeSVG value={menuUrl} size={160} level="H"
          imageSettings={hasEmbeddedLogo ? { src: restaurant.logo_url!, height: 38, width: 38, excavate: true } : undefined}
        />
      </div>
      <div className="hidden" ref={hiddenFullQrRef}><QRCodeSVG value={menuUrl} size={160} level="H" /></div>
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Your menu QR code</p>
        {hasEmbeddedLogo && <p className="text-xs text-primary font-medium mt-1">Logo embedded ✓</p>}
      </div>
      <Button className="w-full" onClick={onViewFullscreen}><Eye className="w-4 h-4 mr-2" />View QR Display</Button>
      <div className="flex gap-2 w-full">
        <Button variant="outline" className="flex-1" onClick={handlePrint} disabled={isPrinting}>
          {isPrinting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
          Print
        </Button>
        <Button variant="outline" className="flex-1" onClick={handleShare} disabled={isSharing}>
          {isSharing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Share2 className="w-4 h-4 mr-2" />}
          Share
        </Button>
      </div>
    </div>
  );
};

export default QrTab;
