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

  const convertToBase64 = async (url: string) => {
    try {
      const res = await fetch(url);
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

  const handlePrint = () => {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const primaryColor = getPrimaryColor();

    printWindow.document.write(`
      <html>
        <head>
          <title>${restaurant.name}</title>
          <style>
            @page { margin:0 }
            html,body{
              margin:0;
              height:100%;
              display:flex;
              align-items:center;
              justify-content:center;
            }
            .card{
              border:8px solid hsl(${primaryColor});
              border-radius:30px;
              padding:60px;
              text-align:center;
            }
            .qr-wrap svg{
              width:250px;
              height:250px;
            }
          </style>
        </head>

        <body>

          <div class="card">
            <h2>${restaurant.name}</h2>
            <div class="qr-wrap">${svgData}</div>
            <p>Scan to view our digital menu</p>
          </div>

          <script>
            window.onload = () => setTimeout(()=>window.print(),400)
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

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = "center";
    ctx.fillStyle = "#000";
    ctx.font = "bold 64px serif";
    ctx.fillText(restaurant.name, 450, 200);

    const svgClone = svgEl.cloneNode(true) as SVGElement;

    if (restaurant.logo_url) {
      const base64Logo = await convertToBase64(restaurant.logo_url);

      const img = svgClone.querySelector("image");

      if (img) {
        img.setAttribute("href", base64Logo);
        img.setAttributeNS("http://www.w3.org/1999/xlink", "href", base64Logo);
      }
    }

    const svgData = new XMLSerializer().serializeToString(svgClone);

    const svgBlob = new Blob([svgData], { type: "image/svg+xml" });

    const url = URL.createObjectURL(svgBlob);

    const img = new Image();

    img.onload = () => {
      ctx.drawImage(img, 200, 350, 500, 500);

      ctx.font = "bold 40px sans-serif";
      ctx.fillText("Scan to view our digital menu", 450, 1000);

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
              text: `Check our menu ${menuUrl}`,
            });
          } catch {}
        }
      });
    };

    img.src = url;
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
