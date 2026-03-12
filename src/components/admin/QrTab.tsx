import { useRef } from "react";
import { RestaurantInfo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Eye, Printer, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast"; // Assuming you use shadcn toast

interface Props {
  restaurant: RestaurantInfo;
  menuUrl: string;
  onViewFullscreen: () => void;
}

const QrTab = ({ restaurant, menuUrl, onViewFullscreen }: Props) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const getPrimary = () => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || "0 0% 0%";

  const handlePrint = () => {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const win = window.open("", "_blank");
    if (!win) {
      toast({ title: "Pop-up blocked", description: "Please allow pop-ups to print.", variant: "destructive" });
      return;
    }

    win.document.write(`
      <html><head><title>${restaurant.name}</title><style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap');
        body { margin:0; display:flex; align-items:center; justify-content:center; height:100vh; font-family: sans-serif; -webkit-print-color-adjust: exact; }
        .card { border: 8px solid hsl(${getPrimary()}); border-radius: 32px; padding: 40px; text-align: center; width: 450px; background: #fff; }
        .logo { width: 80px; height: 80px; border-radius: 12px; margin-bottom: 10px; object-fit: cover; }
        h1 { font-family: 'Playfair Display', serif; font-size: 32px; margin: 10px 0; }
        .qr-wrap { padding: 20px; border: 2px solid #f0f0f0; border-radius: 20px; display: inline-block; margin: 15px 0; }
        .qr-wrap svg { width: 250px !important; height: 250px !important; }
      </style></head>
      <body><div class="card">
        ${restaurant.logo_url ? `<img src="${restaurant.logo_url}" class="logo" crossorigin="anonymous" />` : ""}
        <h1>${restaurant.name}</h1>
        ${restaurant.tagline ? `<p style="color:#666; font-style:italic; margin: 0 0 10px 0;">${restaurant.tagline}</p>` : ""}
        <div class="qr-wrap">${svgData}</div>
        <p style="font-weight:bold; font-size: 1.2rem; margin-top: 15px;">Scan to view our digital menu</p>
      </div><script>window.onload=()=>setTimeout(()=>{window.print();window.close()},600)</script></body></html>
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
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      fill ? ctx.fill() : ctx.stroke();
    };

    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 900, 1200);
    ctx.strokeStyle = `hsl(${getPrimary()})`; ctx.lineWidth = 16;
    drawRounded(40, 40, 820, 1120, 60);

    ctx.fillStyle = "#000"; ctx.textAlign = "center";
    ctx.font = "bold 72px serif"; ctx.fillText(restaurant.name, 450, 180);
    
    if (restaurant.tagline) {
      ctx.font = "italic 36px sans-serif"; ctx.fillStyle = "#666";
      ctx.fillText(restaurant.tagline, 450, 250);
    }

    const svgBlob = new Blob([new XMLSerializer().serializeToString(svgEl)], { type: "image/svg+xml" });
    const qrImg = new Image();
    qrImg.src = URL.createObjectURL(svgBlob);

    qrImg.onload = () => {
      // Adjusted Y position to 320 to reduce space from tagline (previously 380)
      const qrY = 320; 
      ctx.fillStyle = "#fff"; ctx.strokeStyle = "#f0f0f0"; ctx.lineWidth = 4;
      drawRounded(220, qrY - 30, 460, 460, 40, true);
      drawRounded(220, qrY - 30, 460, 460, 40);
      ctx.drawImage(qrImg, 250, qrY, 400, 400);

      const finish = () => {
        ctx.fillStyle = "#000"; ctx.font = "bold 44px sans-serif";
        ctx.fillText("Scan to view our digital menu", 450, 1050);
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], "menu-qr.png", { type: "image/png" });
          try {
            if (navigator.share) {
              await navigator.share({
                files: [file],
                title: restaurant.name,
                text: `Check out our menu at ${restaurant.name}: ${menuUrl}`,
              });
            }
          } catch { /* User cancelled share */ }
          URL.revokeObjectURL(qrImg.src);
        }, "image/png");
      };

      if (restaurant.logo_url && restaurant.show_qr_logo !== false) {
        const logo = new Image(); logo.crossOrigin = "anonymous";
        logo.src = restaurant.logo_url;
        logo.onload = () => {
          ctx.fillStyle = "#fff"; ctx.fillRect(395, qrY + 145, 110, 110);
          ctx.drawImage(logo, 400, qrY + 150, 100, 100); finish();
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
