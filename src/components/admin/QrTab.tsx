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

  const getPrimary = () => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || "0 0% 0%";

  const handlePrint = () => {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(`
      <html><head><title>${restaurant.name}</title><style>
        body { margin:0; display:flex; align-items:center; justify-content:center; height:100vh; font-family: sans-serif; }
        .card { border: 8px solid hsl(${getPrimary()}); border-radius: 32px; padding: 40px; text-align: center; width: 400px; }
        .logo { width: 80px; height: 80px; border-radius: 12px; margin-bottom: 10px; object-fit: cover; }
        .qr-wrap { padding: 20px; border: 2px solid #f0f0f0; border-radius: 20px; display: inline-block; margin: 20px 0; }
        .qr-wrap svg { width: 250px!important; height: 250px!important; }
      </style></head>
      <body><div class="card">
        ${restaurant.logo_url ? `<img src="${restaurant.logo_url}" class="logo" />` : ""}
        <h1 style="margin:0">${restaurant.name}</h1>
        ${restaurant.tagline ? `<p style="color:#666; font-style:italic">${restaurant.tagline}</p>` : ""}
        <div class="qr-wrap">${svgData}</div>
        <p style="font-weight:bold; font-size: 1.2rem;">Scan to view our digital menu</p>
      </div><script>window.onload=()=>setTimeout(()=>{window.print();window.close()},500)</script></body></html>
    `);
    win.document.close();
  };

  const handleShare = async () => {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    canvas.width = 900; canvas.height = 1200;

    const drawRounded = (x: number, y: number, w: number, h: number, r: number, fill = false) => {
      ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
      fill ? ctx.fill() : ctx.stroke();
    };

    // Draw Background & Border
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 900, 1200);
    ctx.strokeStyle = `hsl(${getPrimary()})`; ctx.lineWidth = 16;
    drawRounded(40, 40, 820, 1120, 60);

    // Text Headers
    ctx.fillStyle = "#000"; ctx.textAlign = "center";
    ctx.font = "bold 72px serif"; ctx.fillText(restaurant.name, 450, 220);
    if (restaurant.tagline) {
      ctx.font = "italic 36px sans-serif"; ctx.fillStyle = "#666";
      ctx.fillText(restaurant.tagline, 450, 290);
    }

    const svgBlob = new Blob([new XMLSerializer().serializeToString(svgEl)], { type: "image/svg+xml" });
    const qrImg = new Image();
    qrImg.src = URL.createObjectURL(svgBlob);

    qrImg.onload = () => {
      ctx.fillStyle = "#fff"; ctx.strokeStyle = "#f0f0f0"; ctx.lineWidth = 4;
      drawRounded(220, 350, 460, 460, 40, true); drawRounded(220, 350, 460, 460, 40);
      ctx.drawImage(qrImg, 250, 380, 400, 400);

      const finish = () => {
        ctx.fillStyle = "#000"; ctx.font = "bold 40px sans-serif";
        ctx.fillText("Scan to view our digital menu", 450, 1100);
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], "menu.png", { type: "image/png" });
          try {
            await navigator.share({
              files: [file],
              title: restaurant.name,
              text: `Check out the menu for ${restaurant.name} here: ${menuUrl}`,
            });
          } catch (e) { console.error(e); }
        });
      };

      if (restaurant.logo_url && restaurant.show_qr_logo !== false) {
        const logo = new Image(); logo.crossOrigin = "anonymous";
        logo.src = restaurant.logo_url;
        logo.onload = () => {
          ctx.fillStyle = "#fff"; ctx.fillRect(395, 530, 110, 110);
          ctx.drawImage(logo, 400, 535, 100, 100); finish();
        };
        logo.onerror = finish;
      } else finish();
    };
  };

  const hasLogo = restaurant.show_qr_logo !== false && !!restaurant.logo_url;

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      <div className="bg-white p-6 rounded-2xl border shadow-sm" ref={qrRef}>
        <QRCodeSVG value={menuUrl} size={160} level="H"
          imageSettings={hasLogo ? { src: restaurant.logo_url!, height: 38, width: 38, excavate: true } : undefined}
        />
      </div>
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Your menu QR code</p>
        {hasLogo && <p className="text-xs text-primary font-medium mt-1">Logo embedded ✓</p>}
      </div>
      <Button className="w-full" onClick={onViewFullscreen}><Eye className="w-4 h-4 mr-2" />View QR Display</Button>
      <div className="flex gap-2 w-full">
        <Button variant="outline" className="flex-1" onClick={handlePrint}><Printer className="w-4 h-4 mr-2" />Print</Button>
        <Button variant="outline" className="flex-1" onClick={handleShare}><Share2 className="w-4 h-4 mr-2" />Share</Button>
      </div>
    </div>
  );
};

export default QrTab;
