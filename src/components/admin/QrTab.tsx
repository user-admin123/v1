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
    getComputedStyle(document.documentElement)
      .getPropertyValue("--primary")
      .trim() || "0 0% 0%";

  // Convert external images to base64 (fix canvas security issue)
  const convertToBase64 = async (url: string) => {
    try {
      const res = await fetch(url, { mode: "cors" });
      const blob = await res.blob();

      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch {
      return url;
    }
  };

  const handlePrint = async () => {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const primaryColor = getPrimaryColor();

    const logo = restaurant.logo_url
      ? await convertToBase64(restaurant.logo_url)
      : "";

    printWindow.document.write(`
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
            }

            .card{
              background:white;
              border-radius:32px;
              padding:60px 40px;
              text-align:center;
              border:8px solid hsl(${primaryColor});
              width:450px;
              display:flex;
              flex-direction:column;
              align-items:center;
              justify-content:center;
            }

            .logo{
              width:80px;
              height:80px;
              border-radius:16px;
              object-fit:cover;
              margin-bottom:15px;
            }

            h2{
              font-family:'Playfair Display',serif;
              font-size:38px;
              margin:0 0 8px 0;
            }

            .tagline{
              color:#666;
              font-size:18px;
              font-style:italic;
              margin-bottom:30px;
            }

            .qr-wrap{
              display:inline-block;
              padding:20px;
              border-radius:24px;
              border:2px solid #f0f0f0;
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
            window.onload = () => setTimeout(()=>window.print(),500)
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

    const drawRoundedRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      r: number,
      stroke = false
    ) => {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
      else ctx.rect(x, y, w, h);

      stroke ? ctx.stroke() : ctx.fill();
    };

    const drawAutoText = (
      text: string,
      y: number,
      baseSize: number,
      minSize: number,
      font: string,
      color: string
    ) => {
      let size = baseSize;

      ctx.font = `bold ${size}px ${font}`;

      while (ctx.measureText(text).width > 800 && size > minSize) {
        size -= 2;
        ctx.font = `bold ${size}px ${font}`;
      }

      ctx.fillStyle = color;
      ctx.fillText(text, canvas.width / 2, y);
    };

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = `hsl(${getPrimaryColor()})`;
    ctx.lineWidth = 16;

    drawRoundedRect(40, 40, canvas.width - 80, canvas.height - 80, 60, true);

    ctx.textAlign = "center";

    drawAutoText(restaurant.name, 220, 72, 32, "serif", "#000");

    if (restaurant.tagline)
      drawAutoText(restaurant.tagline, 290, 36, 22, "sans-serif", "#666");

    const qrUrl = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(svgEl)], {
        type: "image/svg+xml",
      })
    );

    const qrImg = new Image();
    qrImg.crossOrigin = "anonymous";

    const finishAndShare = () => {
      ctx.fillStyle = "#000";
      ctx.font = "bold 44px sans-serif";
      ctx.fillText("Scan to view our digital menu", canvas.width / 2, 1040);

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const file = new File([blob], "menu-qr.png", {
          type: "image/png",
        });

        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: restaurant.name,
              text: `Check out our digital menu: ${menuUrl}`,
            });
          } catch {}
        }
      });
    };

    qrImg.onload = async () => {
      const qrSize = 500;
      const x = (canvas.width - qrSize) / 2;
      const y = 380;

      ctx.fillStyle = "#FFF";
      drawRoundedRect(x - 30, y - 30, 560, 560, 40);

      ctx.strokeStyle = "#f0f0f0";
      ctx.lineWidth = 4;
      drawRoundedRect(x - 30, y - 30, 560, 560, 40, true);

      ctx.drawImage(qrImg, x, y, qrSize, qrSize);

      if (restaurant.logo_url && restaurant.show_qr_logo !== false) {
        const logoSrc = await convertToBase64(restaurant.logo_url);

        const logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        logoImg.src = logoSrc;

        logoImg.onload = () => {
          const logoSize = qrSize * 0.22;

          const lx = x + qrSize / 2 - logoSize / 2;
          const ly = y + qrSize / 2 - logoSize / 2;

          ctx.fillStyle = "#FFF";
          ctx.beginPath();
          ctx.roundRect(lx - 10, ly - 10, logoSize + 20, logoSize + 20, 12);
          ctx.fill();

          ctx.drawImage(logoImg, lx, ly, logoSize, logoSize);

          finishAndShare();
        };

        logoImg.onerror = finishAndShare;
      } else finishAndShare();
    };

    qrImg.src = qrUrl;
  };

  const hasEmbeddedLogo =
    restaurant.show_qr_logo !== false && !!restaurant.logo_url;

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

      <div className="text-center">
        <p className="text-sm text-muted-foreground">Your menu QR code</p>

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
        <Button variant="outline" className="flex-1" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>

        <Button variant="outline" className="flex-1" onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-2" />
          Share Image
        </Button>
      </div>
    </div>
  );
};

export default QrTab;
