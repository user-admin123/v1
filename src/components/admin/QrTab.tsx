import { useRef, useState, useEffect } from "react";
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
    const toastId = toast.loading("Preparing print layout...", { position: "top-center" });

    try {
      const primary = getPrimaryColor();
      const hasLogoReq = !!restaurant.logo_url && restaurant.show_qr_logo !== false;
      
      // Check if logo is actually reachable before opening window
      let logoBroken = false;
      if (hasLogoReq) {
        try {
          const res = await fetch(restaurant.logo_url!, { method: 'HEAD', mode: 'no-cors' });
        } catch {
          logoBroken = true;
        }
      }

      if (logoBroken) {
        toast.error("Logo unavailable. Switching to standard QR...", { id: toastId, duration: 3000 });
        await new Promise(r => setTimeout(r, 2000)); // Give user time to see the alert
      } else {
        toast.dismiss(toastId);
      }

      const fullSvg = new XMLSerializer().serializeToString(hiddenFullQrRef.current?.querySelector("svg")!);
      const logoSvg = new XMLSerializer().serializeToString(qrRef.current?.querySelector("svg")!);

      const printWindow = window.open("", "_blank");
      if (!printWindow) throw new Error("Blocked");

      printWindow.document.write(`
        <html>
          <head>
            <title>${restaurant.name}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;700&display=swap');
              @page { size: auto; margin: 0mm !important; }
              html, body { margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; background: #fff; font-family: 'Inter', sans-serif; }
              .card { background: white; border-radius: 32px; padding: 60px 40px; text-align: center; border: 8px solid hsl(${primary}); width: 450px; box-sizing: border-box; }
              .logo { width: 80px; height: 80px; border-radius: 16px; object-fit: cover; border: 3px solid hsl(${primary}); margin-bottom: 15px; padding: 2px; }
              h2 { font-family: 'Playfair Display', serif; font-size: 38px; margin: 0 0 8px 0; }
              .tagline { color: #666; font-size: 18px; font-style: italic; margin-bottom: 30px; }
              .qr-wrap { display: inline-block; padding: 20px; border-radius: 24px; border: 2px solid #f0f0f0; margin: 10px 0; background: white; }
              .qr-wrap svg { width: 250px !important; height: 250px !important; }
              .scan-text { margin-top: 30px; font-size: 20px; font-weight: 700; }
            </style>
          </head>
          <body>
            <div class="card">
              ${restaurant.logo_url && !logoBroken ? `<img src="${restaurant.logo_url}" class="logo" crossorigin="anonymous" />` : ""}
              <h2>${restaurant.name}</h2>
              ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
              <div class="qr-wrap">${(hasLogoReq && !logoBroken) ? logoSvg : fullSvg}</div>
              <p class="scan-text">Scan to view our digital menu</p>
            </div>
            <script>window.onload = () => { setTimeout(() => { window.print(); }, 500); };</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (e) {
      toast.error("Popup blocked! Please allow popups to print.");
    } finally {
      setIsPrinting(false);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    const toastId = toast.loading("Generating image...", { position: "top-center" });

    try {
      const cvs = document.createElement("canvas"), ctx = cvs.getContext("2d");
      if (!ctx) return;
      cvs.width = 900; cvs.height = 1200;

      // Layout Drawing
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 900, 1200);
      ctx.strokeStyle = `hsl(${getPrimaryColor()})`; ctx.lineWidth = 16;
      if (ctx.roundRect) ctx.roundRect(40, 40, 820, 1120, 60); else ctx.rect(40, 40, 820, 1120);
      ctx.stroke();

      ctx.textAlign = "center"; ctx.fillStyle = "#000"; ctx.font = "bold 72px serif";
      ctx.fillText(restaurant.name, 450, 220);
      if (restaurant.tagline) {
        ctx.fillStyle = "#666"; ctx.font = "italic 36px sans-serif";
        ctx.fillText(restaurant.tagline, 450, 290);
      }

      // Handle Logo & QR Swapping
      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";
      let useFull = true;

      if (restaurant.logo_url && restaurant.show_qr_logo !== false) {
        useFull = !(await new Promise(r => {
          logoImg.onload = () => r(true);
          logoImg.onerror = () => r(false);
          logoImg.src = restaurant.logo_url!;
        }));
      }

      const svgRef = useFull ? hiddenFullQrRef.current : qrRef.current;
      const svgStr = new XMLSerializer().serializeToString(svgRef?.querySelector("svg")!);
      const qrUrl = URL.createObjectURL(new Blob([svgStr], { type: "image/svg+xml" }));
      
      const qrImg = await new Promise<HTMLImageElement>(res => {
        const i = new Image(); i.onload = () => res(i); i.src = qrUrl;
      });

      // Composition
      ctx.fillStyle = "#fff";
      if (ctx.roundRect) ctx.roundRect(170, 350, 560, 560, 40); else ctx.rect(170, 350, 560, 560);
      ctx.fill();
      ctx.drawImage(qrImg, 200, 380, 500, 500);

      if (!useFull) {
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
          toast.success("Ready to share!", { id: toastId });
        } else {
          const a = document.createElement('a');
          a.href = cvs.toDataURL();
          a.download = `${restaurant.name}-menu.png`;
          a.click();
          toast.success("Image downloaded successfully!", { id: toastId });
        }
      }
    } catch (err: any) {
      // If user just cancels the share sheet, don't show an error toast
      if (err.name !== 'AbortError') {
        toast.error("Could not process image. Please try again.", { id: toastId });
      } else {
        toast.dismiss(toastId);
      }
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
