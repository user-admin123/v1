import { useRef } from "react";
import { RestaurantInfo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Eye, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  restaurant: RestaurantInfo;
  menuUrl: string;
  onViewFullscreen: () => void;
}

const QrTab = ({ restaurant, menuUrl, onViewFullscreen }: Props) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const hiddenFullQrRef = useRef<HTMLDivElement>(null);

  const getPrimaryColor = () => 
    getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || "0 0% 0%";

  const handlePrint = async () => {
    const primaryColor = getPrimaryColor();
    const hasLogoRequest = !!restaurant.logo_url && restaurant.show_qr_logo !== false;
    
    // We use the "Full QR" (hidden) by default for print to be safe, 
    // unless the logo is verified.
    const fullSvgData = new XMLSerializer().serializeToString(
        hiddenFullQrRef.current?.querySelector("svg")!
    );
    const logoSvgData = new XMLSerializer().serializeToString(
        qrRef.current?.querySelector("svg")!
    );

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${restaurant.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;700&display=swap');
            @page { size: auto; margin: 0mm !important; }
            html, body { margin: 0; padding: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #fff; font-family: 'Inter', sans-serif; }
            .card { background: white; border-radius: 32px; padding: 60px 40px; text-align: center; border: 8px solid hsl(${primaryColor}); width: 450px; box-sizing: border-box; }
            .logo { width: 80px; height: 80px; border-radius: 16px; object-fit: cover; border: 1px solid #eee; margin-bottom: 15px; }
            h2 { font-family: 'Playfair Display', serif; font-size: 38px; color: #000; margin: 0 0 8px 0; }
            .tagline { color: #666; font-size: 18px; font-style: italic; margin-bottom: 30px; }
            .qr-wrap { display: inline-block; padding: 20px; border-radius: 24px; border: 2px solid #f0f0f0; margin: 10px 0; background: white; }
            .qr-wrap svg { width: 250px !important; height: 250px !important; }
            .scan-text { margin-top: 30px; font-size: 20px; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="card">
            ${restaurant.logo_url ? `
              <img 
                src="${restaurant.logo_url}" 
                class="logo" 
                crossorigin="anonymous" 
                id="pLogo" 
                style="display: none;"
              />` : ""
            }
            <h2>${restaurant.name}</h2>
            ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
            <div id="qrContainer" class="qr-wrap">${hasLogoRequest ? logoSvgData : fullSvgData}</div>
            <p class="scan-text">Scan to view our digital menu</p>
          </div>
          <script>
            const img = document.getElementById('pLogo');
            const qrCont = document.getElementById('qrContainer');
            const fullQrSvg = \`${fullSvgData}\`;
            
            const triggerPrint = () => { setTimeout(() => { window.print(); }, 500); };

            if (img) {
              img.onload = () => {
                img.style.display = 'inline-block';
                triggerPrint();
              };
              img.onerror = () => {
                // LOGO FAILED: Remove broken img and swap to Full QR (no hole)
                img.remove();
                qrCont.innerHTML = fullQrSvg;
                triggerPrint();
                // Send message back to main window for themed toast
                if (window.opener) {
                  window.opener.postMessage('print-logo-fail', '*');
                }
              };
            } else {
              window.onload = triggerPrint;
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Listen for messages from the print window to show themed toast
  if (typeof window !== "undefined") {
    window.onmessage = (e) => {
      if (e.data === 'print-logo-fail') {
        toast.error("Logo could not be loaded for print. Using full QR code.", { position: "top-center" });
      }
    };
  }

  const handleShare = async () => {
    toast.info("Preparing shareable image...", { position: "top-center" });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 900;
    canvas.height = 1200;

    const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number, stroke = false) => {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
      stroke ? ctx.stroke() : ctx.fill();
    };

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = `hsl(${getPrimaryColor()})`;
    ctx.lineWidth = 16;
    drawRoundedRect(40, 40, canvas.width - 80, canvas.height - 80, 60, true);
    ctx.textAlign = "center";
    ctx.fillStyle = "#000000";
    ctx.font = "bold 72px serif";
    ctx.fillText(restaurant.name, 450, 220);
    if (restaurant.tagline) {
      ctx.fillStyle = "#666666";
      ctx.font = "italic 36px sans-serif";
      ctx.fillText(restaurant.tagline, 450, 290);
    }

    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";
    let useFullQr = true;

    if (restaurant.logo_url && restaurant.show_qr_logo !== false) {
      const isLoaded = await new Promise((resolve) => {
        logoImg.onload = () => resolve(true);
        logoImg.onerror = () => resolve(false);
        logoImg.src = restaurant.logo_url!;
      });
      useFullQr = !isLoaded;
    }

    if (useFullQr && restaurant.logo_url) {
      toast.error("Logo load failed. Using full QR code.", { position: "top-center" });
    }

    const svgEl = useFullQr 
      ? hiddenFullQrRef.current?.querySelector("svg") 
      : qrRef.current?.querySelector("svg");
    
    if (!svgEl) return;

    const qrUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svgEl)], { type: "image/svg+xml" }));
    const qrImg = new Image();

    qrImg.onload = () => {
      const x = 200, y = 380, s = 500;
      ctx.fillStyle = "#FFFFFF";
      drawRoundedRect(x - 30, y - 30, 560, 560, 40);
      ctx.strokeStyle = "#f0f0f0";
      ctx.lineWidth = 4;
      drawRoundedRect(x - 30, y - 30, 560, 560, 40, true);
      ctx.drawImage(qrImg, x, y, s, s);

      if (!useFullQr) {
        const ls = 110, lx = 450 - ls/2, ly = y + (s - ls)/2;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(lx - 8, ly - 8, ls + 16, ls + 16);
        ctx.drawImage(logoImg, lx, ly, ls, ls);
      }

      ctx.fillStyle = "#000000";
      ctx.font = "bold 44px sans-serif";
      ctx.fillText("Scan to view our digital menu", 450, 1040);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "menu-qr.png", { type: "image/png" });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          try { await navigator.share({ files: [file], title: restaurant.name }); } catch {}
        } else {
          const link = document.createElement('a');
          link.href = canvas.toDataURL();
          link.download = `${restaurant.name}-menu.png`;
          link.click();
        }
      });
      URL.revokeObjectURL(qrUrl);
    };
    qrImg.src = qrUrl;
  };

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      <div className="bg-white p-6 rounded-2xl border shadow-sm" ref={qrRef}>
        <QRCodeSVG
          value={menuUrl}
          size={160}
          level="H"
          imageSettings={restaurant.logo_url && restaurant.show_qr_logo !== false ? { 
            src: restaurant.logo_url, 
            height: 38, width: 38, excavate: true 
          } : undefined}
        />
      </div>

      <div className="hidden" ref={hiddenFullQrRef}>
        <QRCodeSVG value={menuUrl} size={160} level="H" />
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">Your menu QR code</p>
      </div>

      <Button className="w-full" onClick={onViewFullscreen}><Eye className="w-4 h-4 mr-2" />View QR Display</Button>
      <div className="flex gap-2 w-full">
        <Button variant="outline" className="flex-1" onClick={handlePrint}><Printer className="w-4 h-4 mr-2" />Print</Button>
        <Button variant="outline" className="flex-1" onClick={handleShare}><Share2 className="w-4 h-4 mr-2" />Share Image</Button>
      </div>
    </div>
  );
};

export default QrTab;
