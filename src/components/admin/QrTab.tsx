import { useRef } from "react";
import { RestaurantInfo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Eye, Printer, Share2 } from "lucide-react";

interface Props {
  restaurant: RestaurantInfo;
  menuUrl: string;
  onViewFullscreen: () => void;
}

const QrTab = ({ restaurant, menuUrl, onViewFullscreen }: Props) => {
  const qrRef = useRef<HTMLDivElement>(null);

  const getPrimaryColor = () =>
    getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || "0 0% 0%";

  const getSafeImageUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("data:")) return url;
    return `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`;
  };

  const handlePrint = () => {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const primaryColor = getPrimaryColor();
    const safeLogoUrl = getSafeImageUrl(restaurant.logo_url || "");

    printWindow.document.write(`
      <html>
        <head>
          <title>${restaurant.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;700&display=swap');
            @page { size: auto; margin: 0mm !important; }
            html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #fff; }
            .card { background: white; border-radius: 32px; padding: 60px 40px; text-align: center; border: 8px solid hsl(${primaryColor}); width: 450px; max-height: 96vh; display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; page-break-inside: avoid; }
            .logo { width: 80px; height: 80px; border-radius: 16px; object-fit: cover; border: 1px solid #eee; margin-bottom: 15px; display: none; }
            .logo.loaded { display: block; }
            h2 { font-family: 'Playfair Display', serif; font-size: 38px; color: #000; margin: 0 0 8px 0; }
            .tagline { color: #666; font-size: 18px; font-style: italic; margin-bottom: 30px; }
            .qr-wrap { display: inline-block; padding: 20px; border-radius: 24px; border: 2px solid #f0f0f0; margin: 10px 0; }
            .qr-wrap svg { width: 250px !important; height: 250px !important; }
            .scan-text { margin-top: 30px; font-size: 20px; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="card">
            ${restaurant.logo_url ? `<img src="${safeLogoUrl}" id="logoImg" class="logo" crossorigin="anonymous" />` : ""}
            <h2>${restaurant.name}</h2>
            ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
            <div class="qr-wrap">${svgData}</div>
            <p class="scan-text">Scan to view our digital menu</p>
          </div>
          <script>
            const img = document.getElementById('logoImg');
            const doPrint = () => {
              setTimeout(() => {
                window.print();
                // We don't close immediately to prevent the "printing error" in some browsers
                window.onafterprint = () => window.close();
              }, 500);
            };

            if (img) {
              img.onload = () => { img.classList.add('loaded'); doPrint(); };
              img.onerror = () => { 
                alert("The logo image could not be loaded due to security restrictions or an invalid URL. Printing without logo.");
                doPrint(); 
              };
              // Backup timeout in case image hangs
              setTimeout(doPrint, 3000);
            } else {
              doPrint();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleShare = async () => {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;

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

    const drawAutoText = (text: string, y: number, baseSize: number, minSize: number, font: string, color: string) => {
      let size = baseSize;
      ctx.font = `${font.includes('italic') ? 'italic' : 'bold'} ${size}px ${font.replace('italic ', '')}`;
      while (ctx.measureText(text).width > 800 && size > minSize) {
        size -= 2;
        ctx.font = `${font.includes('italic') ? 'italic' : 'bold'} ${size}px ${font.replace('italic ', '')}`;
      }
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.fillText(text, canvas.width / 2, y);
    };

    // Initial Drawing
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = `hsl(${getPrimaryColor()})`;
    ctx.lineWidth = 16;
    drawRoundedRect(40, 40, canvas.width - 80, canvas.height - 80, 60, true);
    drawAutoText(restaurant.name, 220, 72, 32, "serif", "#000000");
    if (restaurant.tagline) drawAutoText(restaurant.tagline, 290, 36, 22, "italic sans-serif", "#666666");

    const qrUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svgEl)], { type: "image/svg+xml" }));
    const qrImg = new Image();

    const finishAndShare = () => {
      ctx.fillStyle = "#000000";
      ctx.font = "bold 44px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Scan to view our digital menu", canvas.width / 2, 1040);
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "menu-qr.png", { type: "image/png" });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          try { await navigator.share({ files: [file], title: restaurant.name, text: `Check out our digital menu: ${menuUrl}` }); } catch {}
        }
      });
    };

    qrImg.onload = () => {
      const x = (canvas.width - 500) / 2, y = 380;
      ctx.fillStyle = "#FFFFFF";
      drawRoundedRect(x - 30, y - 30, 560, 560, 40);
      ctx.strokeStyle = "#f0f0f0";
      ctx.lineWidth = 4;
      drawRoundedRect(x - 30, y - 30, 560, 560, 40, true);
      ctx.drawImage(qrImg, x, y, 500, 500);
      URL.revokeObjectURL(qrUrl);

      if (restaurant.logo_url && restaurant.show_qr_logo !== false) {
        const logoImg = new Image();
        if (!restaurant.logo_url.startsWith('data:')) logoImg.crossOrigin = "anonymous";
        
        logoImg.onload = () => {
          const s = 110, lx = (canvas.width - s) / 2, ly = y + (500 - s) / 2;
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(lx - 8, ly - 8, s + 16, s + 16);
          ctx.drawImage(logoImg, lx, ly, s, s);
          finishAndShare();
        };

        logoImg.onerror = () => {
          alert("Could not include the logo in the shared image due to image restrictions. Generating with QR only.");
          finishAndShare();
        };
        logoImg.src = getSafeImageUrl(restaurant.logo_url);
      } else {
        finishAndShare();
      }
    };
    qrImg.src = qrUrl;
  };

  const hasEmbeddedLogo = restaurant.show_qr_logo !== false && !!restaurant.logo_url;

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      <div className="bg-white p-6 rounded-2xl border shadow-sm" ref={qrRef}>
        <QRCodeSVG
          value={menuUrl}
          size={160}
          level="H"
          imageSettings={hasEmbeddedLogo ? { src: restaurant.logo_url!, height: 38, width: 38, excavate: true } : undefined}
        />
      </div>
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Your menu QR code</p>
        {hasEmbeddedLogo && <p className="text-xs text-primary font-medium mt-1">Logo embedded ✓</p>}
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
