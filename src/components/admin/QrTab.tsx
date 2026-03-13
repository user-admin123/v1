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

  const [isPrinting, setPrinting] = useState(false);
  const [isSharing, setSharing] = useState(false);

  const primary = () =>
    getComputedStyle(document.documentElement)
      .getPropertyValue("--primary")
      .trim() || "0 0% 0%";

  const getBase64 = async (url: string) => {
    try {
      const r = await fetch(url);
      const b = await r.blob();
      return await new Promise<string | null>((res) => {
        const fr = new FileReader();
        fr.onloadend = () => res(fr.result as string);
        fr.onerror = () => res(null);
        fr.readAsDataURL(b);
      });
    } catch {
      return null;
    }
  };

  const getSvg = (useFull = false) => {
    const ref = useFull ? fullQrRef : qrRef;
    const svg = ref.current?.querySelector("svg");
    return svg ? new XMLSerializer().serializeToString(svg) : "";
  };

  const loadLogo = async () => {
    if (!restaurant.logo_url || restaurant.show_qr_logo === false) return null;

    const logo = await getBase64(restaurant.logo_url);
    if (!logo)
      toast.error("Logo load failed. Generating full QR code...", {
        position: "top-center",
      });

    return logo;
  };

  const handlePrint = async () => {
    setPrinting(true);

    try {
      const logo = await loadLogo();
      const svg = getSvg(!logo);
      const p = window.open("", "_blank");
      if (!p) return;

      p.document.write(`
      <html>
      <head>
      <title>${restaurant.name}</title>
      <style>
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;700&display=swap');
      @page{margin:0}
      body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:Inter;background:#fff}
      .card{border:8px solid hsl(${primary()});border-radius:32px;padding:60px 40px;text-align:center;width:450px}
      .logo{width:80px;height:80px;border-radius:16px;margin-bottom:15px}
      h2{font-family:'Playfair Display',serif;font-size:36px;margin:0 0 8px}
      .tag{color:#666;font-style:italic;margin-bottom:30px}
      .qr svg{width:250px;height:250px}
      .scan{margin-top:30px;font-weight:700;font-size:20px}
      </style>
      </head>
      <body>
      <div class="card">
      ${logo ? `<img src="${logo}" class="logo"/>` : ""}
      <h2>${restaurant.name}</h2>
      ${restaurant.tagline ? `<p class="tag">${restaurant.tagline}</p>` : ""}
      <div class="qr">${svg}</div>
      <p class="scan">Scan to view our digital menu</p>
      </div>
      <script>window.onload=()=>setTimeout(()=>window.print(),500)</script>
      </body>
      </html>
      `);

      p.document.close();
    } finally {
      setPrinting(false);
    }
  };

  const handleShare = async () => {
    setSharing(true);

    try {
      await document.fonts.ready;

      const cvs = document.createElement("canvas");
      const ctx = cvs.getContext("2d", { alpha: false });
      if (!ctx) throw new Error();

      cvs.width = 900;
      cvs.height = 1200;

      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, 900, 1200);

      ctx.strokeStyle = `hsl(${primary()})`;
      ctx.lineWidth = 16;
      ctx.roundRect?.(40, 40, 820, 1120, 60);
      ctx.stroke();

      ctx.textAlign = "center";

      let y = 180;
      const max = 780;

      let fs = 72;
      ctx.font = `bold ${fs}px sans-serif`;
      while (ctx.measureText(restaurant.name).width > max && fs > 32) {
        fs -= 2;
        ctx.font = `bold ${fs}px sans-serif`;
      }

      ctx.fillStyle = "#000";
      ctx.fillText(restaurant.name, 450, y);

      y += 70;

      if (restaurant.tagline) {
        let ts = 36;
        ctx.font = `italic ${ts}px sans-serif`;

        while (ctx.measureText(restaurant.tagline).width > max && ts > 20) {
          ts -= 2;
          ctx.font = `italic ${ts}px sans-serif`;
        }

        ctx.fillStyle = "#666";
        ctx.fillText(restaurant.tagline, 450, y);
        y += 80;
      }

      const qrY = y + 30;

      const logo = await loadLogo();
      const svg = getSvg(!logo);

      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 200, qrY, 500, 500);
        URL.revokeObjectURL(url);

        const finish = () => {
          ctx.fillStyle = "#000";
          ctx.font = "bold 44px sans-serif";
          ctx.fillText("Scan to view our digital menu", 450, 1060);

          cvs.toBlob(async (b) => {
            if (!b) return;

            const file = new File([b], "menu-qr.png", { type: "image/png" });

            try {
              if (navigator.share && navigator.canShare?.({ files: [file] })) {
                await navigator.share({
                  files: [file],
                  title: restaurant.name,
                  text: `View our menu here: ${menuUrl}`,
                });
              } else {
                const a = document.createElement("a");
                a.href = cvs.toDataURL();
                a.download = `${restaurant.name}-menu.png`;
                a.click();
              }
            } catch (e: any) {
              if (e.name !== "AbortError") toast.error("Share failed");
            }

            setSharing(false);
          });
        };

        if (!logo) return finish();

        const li = new Image();
        li.onload = () => {
          const s = 120;
          const x = 390;
          const y = qrY + 190;

          ctx.fillStyle = "#fff";
          ctx.fillRect(x - 5, y - 5, s + 10, s + 10);
          ctx.drawImage(li, x, y, s, s);

          finish();
        };

        li.onerror = finish;
        li.src = logo;
      };

      img.src = url;
    } catch {
      toast.error("Share failed");
      setSharing(false);
    }
  };

  const hasLogo = restaurant.show_qr_logo !== false && !!restaurant.logo_url;

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      <div className="bg-white p-6 rounded-2xl border shadow-sm" ref={qrRef}>
        <QRCodeSVG
          value={menuUrl}
          size={160}
          level="H"
          imageSettings={
            hasLogo
              ? { src: restaurant.logo_url!, height: 38, width: 38, excavate: true }
              : undefined
          }
        />
      </div>

      <div className="hidden" ref={fullQrRef}>
        <QRCodeSVG value={menuUrl} size={160} level="H" />
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">Your menu QR code</p>
        {hasLogo && (
          <p className="text-xs text-primary font-medium mt-1">
            Logo embedded ✓
          </p>
        )}
      </div>

      <Button className="w-full" onClick={onViewFullscreen}>
        <Eye className="w-4 h-4 mr-2" />
        View QR Display
      </Button>

      <div className="flex gap-2 w-full">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handlePrint}
          disabled={isPrinting}
        >
          {isPrinting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Printer className="w-4 h-4 mr-2" />
          )}
          Print
        </Button>

        <Button
          variant="outline"
          className="flex-1"
          onClick={handleShare}
          disabled={isSharing}
        >
          {isSharing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Share2 className="w-4 h-4 mr-2" />
          )}
          Share
        </Button>
      </div>
    </div>
  );
};

export default QrTab;
