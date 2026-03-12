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

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);

    const primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--primary')
      .trim() || "0 0% 0%";

    printWindow.document.write(`
      <html>
        <head>
          <title>${restaurant.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap');
            
            @page { 
              size: auto; 
              margin: 0mm !important; 
            }

            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: 100%;
              height: 100%;
              overflow: hidden !important;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #fff;
              -webkit-print-color-adjust: exact;
            }
            
            .card { 
              background: white; 
              border-radius: 32px; 
              padding: 60px 40px; /* Increased padding for a larger look */
              text-align: center; 
              border: 8px solid hsl(${primaryColor}); /* Thicker border */
              width: 450px; /* Increased width from 320px */
              max-height: 96vh; 
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              box-sizing: border-box;
              page-break-inside: avoid;
            }
            
            .logo { 
              width: 80px; height: 80px; border-radius: 16px; object-fit: cover; 
              border: 1px solid #eee; margin-bottom: 15px;
            }
            
            h2 { font-family: 'Playfair Display', serif; font-size: 38px; color: #000; margin-bottom: 8px; }
            .tagline { color: #666; font-size: 18px; font-style: italic; margin-bottom: 30px; }
            
            .qr-wrap {
              display: inline-block; 
              padding: 20px; 
              border-radius: 24px; 
              background: white; 
              border: 2px solid #f0f0f0;
              margin: 10px 0;
            }
            
            /* Make the SVG inside the wrap fill space better */
            .qr-wrap svg {
                width: 250px !important;
                height: 250px !important;
            }
            
            .scan-text { margin-top: 30px; font-size: 20px; font-weight: 700; color: #000; letter-spacing: -0.01em; }
          </style>
        </head>
        <body>
          <div class="card">
            ${restaurant.logo_url ? `<img src="${restaurant.logo_url}" class="logo" crossorigin="anonymous" />` : ""}
            <h2>${restaurant.name}</h2>
            ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
            <div class="qr-wrap">${svgData}</div>
            <p class="scan-text">Scan to view our digital menu</p>
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => { 
                window.print();
              }, 500);
            };
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

    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || "0 0% 0%";

    canvas.width = 800;
    canvas.height = 1000;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = `hsl(${primaryColor})`;
    ctx.lineWidth = 20;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

    const finishAndShare = () => {
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.font = "bold 28px sans-serif";
      ctx.fillText("Scan to view our menu", canvas.width / 2, 880);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "menu-qr.png", { type: "image/png" });
        try {
          if (navigator.share && navigator.canShare?.({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: restaurant.name,
              text: `Check out our digital menu at ${restaurant.name}!\nView it here: ${menuUrl}`,
            });
          }
        } catch (err) { console.log("Share failed", err); }
      }, "image/png");
    };

    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.font = "bold 48px sans-serif";
    ctx.fillText(restaurant.name, canvas.width / 2, 140);

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const qrUrl = URL.createObjectURL(svgBlob);
    const qrImg = new Image();

    qrImg.onload = () => {
      ctx.drawImage(qrImg, 150, 250, 500, 500);
      URL.revokeObjectURL(qrUrl);

      if (restaurant.logo_url && restaurant.show_qr_logo !== false) {
        const logoImg = new Image();
        if (restaurant.logo_url.startsWith('http')) {
          logoImg.crossOrigin = "anonymous";
        }
        logoImg.src = restaurant.logo_url;
        
        logoImg.onload = () => {
          const size = 115;
          const x = (canvas.width - size) / 2;
          const y = 250 + (500 - size) / 2;
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(x - 4, y - 4, size + 8, size + 8);
          ctx.strokeStyle = `hsl(${primaryColor})`;
          ctx.lineWidth = 2;
          ctx.strokeRect(x - 4, y - 4, size + 8, size + 8);
          ctx.drawImage(logoImg, x, y, size, size);
          finishAndShare();
        };
        logoImg.onerror = () => finishAndShare();
      } else {
        finishAndShare();
      }
    };
    qrImg.src = qrUrl;
  };

  const hasEmbeddedLogo = restaurant.show_qr_logo !== false && restaurant.logo_url;

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      <div className="bg-white p-6 rounded-2xl border relative shadow-sm" ref={qrRef}>
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
                  excavate: true 
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
        <Eye className="w-4 h-4 mr-2" />View QR Display
      </Button>

      <div className="flex gap-2 w-full">
        <Button variant="outline" className="flex-1" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />Print
        </Button>
        <Button variant="outline" className="flex-1" onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-2" />Share Image
        </Button>
      </div>
    </div>
  );
};

export default QrTab;
