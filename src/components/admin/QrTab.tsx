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

  // Helper to convert image URL to Base64 to prevent "unloaded" issues in Print
  const getBase64 = async (url: string): Promise<string | null> => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch { return null; }
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    const tid = toast.loading("Checking assets...", { position: "top-center" });

    try {
      const primary = getPrimaryColor();
      let logoData = null;
      let useFull = !restaurant.logo_url || restaurant.show_qr_logo === false;

      if (!useFull && restaurant.logo_url) {
        logoData = await getBase64(restaurant.logo_url);
        if (!logoData) {
          toast.error("Logo failed to load. Using full QR code...", { id: tid, duration: 2000 });
          await new Promise(r => setTimeout(r, 2000));
          useFull = true;
        } else {
          toast.dismiss(tid);
        }
      } else {
        toast.dismiss(tid);
      }

      const svgToUse = useFull ? hiddenFullQrRef.current : qrRef.current;
      const svgData = new XMLSerializer().serializeToString(svgToUse?.querySelector("svg")!);

      const pw = window.open("", "_blank");
      if (!pw) throw new Error();

      pw.document.write(`
        <html>
          <head>
            <title>Print Menu - ${restaurant.name}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;700&display=swap');
              @page { size: auto; margin: 0mm !important; }
              body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: 'Inter', sans-serif; background: #fff; }
              .card { background: white; border-radius: 32px; padding: 60px 40px; text-align: center; border: 8px solid hsl(${primary}); width: 450px; box-sizing: border-box; }
              .logo { width: 80px; height: 80px; border-radius: 16px; object-fit: cover; border: 3px solid hsl(${primary}); margin-bottom: 15px; padding: 2px; }
              h2 { font-family: 'Playfair Display', serif; font-size: 38px; margin: 0 0 8px 0; }
              .tagline { color: #666; font-size: 18px; font-style: italic; margin-bottom: 30px; }
              .qr-wrap { display: inline-block; padding: 20px; border-radius: 24px; border: 2px solid #f0f0f0; margin: 10px 0; }
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
    } catch {
      toast.error("Enable popups to print your QR code.");
    } finally {
      setIsPrinting(false);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    const tid = toast.loading("Generating image...", { position: "top-center" });

    try {
      const cvs = document.createElement("canvas"), ctx = cvs.getContext("2d");
      if (!ctx) return;
      cvs.width = 900; cvs.height = 1200;

      // Draw Theme Border
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 900, 1200);
      ctx.strokeStyle = `hsl(${getPrimaryColor()})`; ctx.lineWidth = 16;
      if (ctx.roundRect) ctx.roundRect(40, 40, 820, 1120, 60); else ctx.rect(40, 40, 820, 1120);
      ctx.stroke();

      ctx.textAlign = "center"; ctx.fillStyle = "#000"; ctx.font = "bold 72px serif";
      ctx.fillText(restaurant.name, 450, 220);
      
      // Handle Image Logic
      let logoImg = null;
      let useFull = !restaurant.logo_url || restaurant.show_qr_logo === false;

      if (!useFull) {
        const data = await getBase64(restaurant.logo_url!);
        if (data) {
          logoImg = new Image();
          await new Promise((res) => { logoImg!.onload = res; logoImg!.src = data; });
        } else {
          useFull = true;
          toast.error("Logo load failed. Using full QR code.", { id: tid, duration: 2000 });
          await new Promise(r => setTimeout(r, 1500));
        }
      }

      const svgToUse = useFull ? hiddenFullQrRef.current : qrRef.current;
      const svgStr = new XMLSerializer().serializeToString(svgToUse?.querySelector("svg")!);
      const qrUrl = URL.createObjectURL(new Blob([svgStr], { type: "image/svg+xml" }));
      const qrImg = new Image();
      await new Promise(r => { qrImg.onload = r; qrImg.src = qrUrl; });

      // Draw QR
      ctx.fillStyle = "#fff";
      if (ctx.roundRect) ctx.roundRect(170, 350, 560, 560, 40); else ctx.rect(170, 350, 560, 560);
      ctx.fill();
      ctx.drawImage(qrImg, 200, 380, 500, 500);

      if (logoImg) {
        ctx.fillStyle = "#fff"; ctx.fillRect(387, 567, 126, 126);
        ctx.drawImage(logoImg, 395, 575, 110, 110);
      }

      ctx.fillStyle = "#000"; ctx.font = "bold 44px sans-serif";
      ctx.fillText("Scan to view our digital menu", 450, 1040);

      const blob = await new Promise<Blob | null>(r => cvs.toBlob(r, "image/png"));
      URL.revokeObjectURL(qrUrl);

      if (blob) {
        const f = new File([blob], "menu-qr.png", { type: "image/png" });
        if (navigator.share && navigator.canShare?.({ files: [f] })) {
          await navigator.share({ files: [f] });
          toast.dismiss(tid);
        } else {
          const a = document.createElement('a'); a.href = cvs.toDataURL(); a.download = "menu.png"; a.click();
          toast.success("Downloaded!", { id: tid });
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') toast.error("Share failed", { id: tid });
      else toast.dismiss(tid);
    } finally {
      setIsSharing(false);
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
