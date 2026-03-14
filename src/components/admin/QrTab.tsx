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

  const hasEmbeddedLogo =
    restaurant.show_qr_logo !== false && !!restaurant.logo_url;

  /* ------------------------------------------------ */
  /* UTILITIES                                        */
  /* ------------------------------------------------ */

  const getPrimaryColor = () =>
    getComputedStyle(document.documentElement)
      .getPropertyValue("--primary")
      .trim() || "0 0% 0%";

  const showToast = (msg: string) =>
    toast.error(msg, { position: "top-center", duration: 3000 });

  const getBase64 = async (url: string): Promise<string | null> => {
    try {
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) return null;

      const blob = await res.blob();

      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const getQrSvg = (useFull: boolean) => {
    const node = useFull ? hiddenFullQrRef.current : qrRef.current;
    const svg = node?.querySelector("svg");
    return svg ? new XMLSerializer().serializeToString(svg) : null;
  };

  const resolveLogo = async () => {
    if (!restaurant.logo_url || restaurant.show_qr_logo === false)
      return { logo: null, useFull: true };

    const logo = await getBase64(restaurant.logo_url);

    if (!logo) {
      showToast("Logo load failed. Generating full QR code...");
      await new Promise((r) => setTimeout(r, 2000));
      return { logo: null, useFull: true };
    }

    return { logo, useFull: false };
  };

  /* ------------------------------------------------ */
  /* PRINT                                            */
  /* ------------------------------------------------ */

  const handlePrint = async () => {
    setIsPrinting(true);

    try {
      const primary = getPrimaryColor();
      const { logo, useFull } = await resolveLogo();

      const svgData = getQrSvg(useFull);
      if (!svgData) return;

      const pw = window.open("", "_blank");
      if (!pw) return;

      pw.document.write(`
      <html>
      <head>
      <title>${restaurant.name}</title>
      <style>
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;700&display=swap');

      @page { size:auto; margin:0mm !important; }

      html,body{
        margin:0;
        padding:0;
        width:100%;
        height:100%;
        display:flex;
        align-items:center;
        justify-content:center;
        background:#fff;
        font-family:'Inter',sans-serif;
        overflow:hidden;
      }

      .card{
        background:white;
        border-radius:32px;
        padding:60px 40px;
        text-align:center;
        border:8px solid hsl(${primary});
        width:450px;
        box-sizing:border-box;
      }

      .logo{
        width:80px;
        height:80px;
        border-radius:16px;
        object-fit:cover;
        border:1px solid #eee;
        margin-bottom:15px;
      }

      h2{
        font-family:'Playfair Display',serif;
        font-size:clamp(24px,${40 / restaurant.name.length * 38}px,38px);
        color:#000;
        margin:0 0 8px;
        line-height:1.2;
      }

      .tagline{
        color:#666;
        font-size:clamp(14px,${
          60 / (restaurant.tagline?.length || 1) * 18
        }px,18px);
        font-style:italic;
        margin-bottom:30px;
      }

      .qr-wrap{
        display:inline-block;
        padding:20px;
        border-radius:24px;
        border:2px solid #f0f0f0;
        margin:10px 0;
        background:white;
      }

      .qr-wrap svg{
        width:250px !important;
        height:250px !important;
      }

      .scan-text{
        margin-top:30px;
        font-size:20px;
        font-weight:700;
      }
      </style>
      </head>

      <body>
      <div class="card">

      ${logo ? `<img src="${logo}" class="logo" />` : ""}

      <h2>${restaurant.name}</h2>

      ${
        restaurant.tagline
          ? `<p class="tagline">${restaurant.tagline}</p>`
          : ""
      }

      <div class="qr-wrap">${svgData}</div>

      <p class="scan-text">Scan to view our digital menu</p>

      </div>

      <script>
      window.onload=()=>{setTimeout(()=>{window.print()},500)}
      </script>

      </body>
      </html>
      `);

      pw.document.close();
    } finally {
      setIsPrinting(false);
    }
  };

  /* ------------------------------------------------ */
  /* SHARE                                            */
  /* ------------------------------------------------ */

  const handleShare = async () => {
    setIsSharing(true);

    try {
      await document.fonts.ready;

      const cvs = document.createElement("canvas");
      const ctx = cvs.getContext("2d", { alpha: false });

      if (!ctx) throw new Error();

      const primary = getPrimaryColor();

      cvs.width = 900;
      cvs.height = 1200;

      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, 900, 1200);

      ctx.strokeStyle = `hsl(${primary})`;
      ctx.lineWidth = 16;

      ctx.roundRect?.(40, 40, 820, 1120, 60);
      ctx.stroke();

      ctx.textAlign = "center";

      /* DYNAMIC TEXT */

      let y = 180;
      const maxWidth = 780;

      let nameSize = 72;
      ctx.font = `bold ${nameSize}px sans-serif`;

      while (ctx.measureText(restaurant.name).width > maxWidth && nameSize > 32) {
        nameSize -= 2;
        ctx.font = `bold ${nameSize}px sans-serif`;
      }

      ctx.fillStyle = "#000";
      ctx.fillText(restaurant.name, 450, y);

      y += 70;

      if (restaurant.tagline) {
        let tagSize = 36;
        ctx.font = `italic ${tagSize}px sans-serif`;

        while (
          ctx.measureText(restaurant.tagline).width > maxWidth &&
          tagSize > 20
        ) {
          tagSize -= 2;
          ctx.font = `italic ${tagSize}px sans-serif`;
        }

        ctx.fillStyle = "#666";
        ctx.fillText(restaurant.tagline, 450, y);
        y += 80;
      } else y += 20;

      const qrY = y + 30;

      const { logo, useFull } = await resolveLogo();
      const svgData = getQrSvg(useFull);
      if (!svgData) return;

      const blob = new Blob([svgData], { type: "image/svg+xml" });
      const qrUrl = URL.createObjectURL(blob);

      const qrImg = new Image();

      qrImg.onload = () => {
        ctx.drawImage(qrImg, 200, qrY, 500, 500);
        URL.revokeObjectURL(qrUrl);

        const finish = () => {
          ctx.fillStyle = "#000";
          ctx.font = "bold 44px sans-serif";
          ctx.fillText("Scan to view our digital menu", 450, 1060);

          cvs.toBlob(async (blob) => {
            if (!blob) return;

            const file = new File([blob], "menu-qr.png", {
              type: "image/png",
            });

            try {
              if (
                navigator.share &&
                navigator.canShare?.({ files: [file] })
              ) {
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
            } catch {}
            setIsSharing(false);
          });
        };

        if (logo) {
          const img = new Image();
          img.onload = () => {
            const size = 120;
            const x = 390;
            const ly = qrY + 190;

            ctx.fillStyle = "#fff";
            ctx.fillRect(x - 5, ly - 5, size + 10, size + 10);

            ctx.drawImage(img, x, ly, size, size);
            finish();
          };

          img.onerror = finish;
          img.src = logo;
        } else finish();
      };

      qrImg.src = qrUrl;
    } catch {
      showToast("Share failed");
      setIsSharing(false);
    }
  };

  /* ------------------------------------------------ */
  /* UI                                               */
  /* ------------------------------------------------ */

  return (
    <div className="mt-3 flex flex-col items-center gap-4">

      <div className="bg-white p-6 rounded-2xl border shadow-sm" ref={qrRef}>
        <QRCodeSVG
          value={menuUrl}
          size={160}
          level="H"
          imageSettings={
            hasEmbeddedLogo
              ? {
                  src: restaurant.logo_url!,
                  height: 38,
                  width: 38,
                  excavate: true,
                }
              : undefined
          }
        />
      </div>

      <div className="hidden" ref={hiddenFullQrRef}>
        <QRCodeSVG value={menuUrl} size={160} level="H" />
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Your menu QR code
        </p>

        {hasEmbeddedLogo && (
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
