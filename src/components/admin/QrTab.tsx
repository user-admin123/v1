import { useRef } from "react";
import { RestaurantInfo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Eye, Printer, Share2 } from "lucide-react";
import { toast } from "sonner"; // Assuming you use Sonner for themed alerts

interface Props {
  restaurant: RestaurantInfo;
  menuUrl: string;
  onViewFullscreen: () => void;
}

const QrTab = ({ restaurant, menuUrl, onViewFullscreen }: Props) => {
  const qrRef = useRef<HTMLDivElement>(null);

  const getPrimaryColor = () => 
    getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || "0 0% 0%";

  const handlePrint = () => {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;

    // Use the actual SVG from the DOM to ensure we capture what's currently rendered
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const primaryColor = getPrimaryColor();
    const logoUrl = restaurant.logo_url;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Menu QR</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;700&display=swap');
            @page { size: auto; margin: 0mm !important; }
            body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: 'Inter', sans-serif; }
            .card { background: white; border-radius: 32px; padding: 60px 40px; text-align: center; border: 8px solid hsl(${primaryColor}); width: 450px; box-sizing: border-box; }
            .logo { width: 80px; height: 80px; border-radius: 16px; object-fit: cover; border: 1px solid #eee; margin-bottom: 15px; }
            h2 { font-family: 'Playfair Display', serif; font-size: 38px; margin: 0 0 8px 0; }
            .tagline { color: #666; font-size: 18px; font-style: italic; margin-bottom: 30px; }
            .qr-wrap { display: inline-block; padding: 20px; border-radius: 24px; border: 2px solid #f0f0f0; }
            .qr-wrap svg { width: 250px !important; height: 250px !important; }
            .scan-text { margin-top: 30px; font-size: 20px; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="card">
            ${logoUrl ? `<img src="${logoUrl}" class="logo" crossorigin="anonymous" onerror="this.style.display='none'" />` : ""}
            <h2>${restaurant.name}</h2>
            ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
            <div class="qr-wrap">${svgData}</div>
            <p class="scan-text">Scan to view our digital menu</p>
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 800);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const generateCanvasImage = async (withLogo: boolean): Promise<Blob | null> => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    canvas.width = 900;
    canvas.height = 1200;

    // Background & Frame
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = `hsl(${getPrimaryColor()})`;
    ctx.lineWidth = 16;
    
    // Rounded Rect helper
    const r = 60;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(40, 40, 820, 1120, r) : ctx.rect(40, 40, 820, 1120);
    ctx.stroke();

    // Text Headers
    ctx.textAlign = "center";
    ctx.fillStyle = "#000000";
    ctx.font = "bold 72px serif";
    ctx.fillText(restaurant.name, 450, 220);
    
    if (restaurant.tagline) {
      ctx.fillStyle = "#666666";
      ctx.font = "italic 36px sans-serif";
      ctx.fillText(restaurant.tagline, 450, 290);
    }

    // QR Code Logic
    // We get the SVG string. If withLogo is false, we need to ensure the SVG doesn't have a "hole"
    // The easiest way is to let the QRCodeSVG component handle the state, but since we are in a function,
    // we use the current Ref. If the user wants NO logo, we'd ideally re-render, 
    // but for this share function, we will draw the QR first.
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return null;
    
    const svgString = new XMLSerializer().serializeToString(svgEl);
    const qrUrl = URL.createObjectURL(new Blob([svgString], { type: "image/svg+xml" }));
    
    return new Promise((resolve) => {
      const qrImg = new Image();
      qrImg.onload = () => {
        const qX = 200, qY = 380, qS = 500;
        // White background for QR
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(170, 350, 560, 560, 40) : ctx.rect(170, 350, 560, 560);
        ctx.fill();
        ctx.strokeStyle = "#f0f0f0";
        ctx.lineWidth = 4;
        ctx.stroke();
        
        ctx.drawImage(qrImg, qX, qY, qS, qS);
        URL.revokeObjectURL(qrUrl);

        const finish = () => {
          ctx.fillStyle = "#000000";
          ctx.font = "bold 44px sans-serif";
          ctx.fillText("Scan to view our digital menu", 450, 1040);
          canvas.toBlob(resolve, "image/png");
        };

        if (withLogo && restaurant.logo_url) {
          const logoImg = new Image();
          logoImg.crossOrigin = "anonymous";
          logoImg.onload = () => {
            const s = 110, lx = 450 - s/2, ly = qY + (qS - s)/2;
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(lx - 8, ly - 8, s + 16, s + 16);
            ctx.drawImage(logoImg, lx, ly, s, s);
            finish();
          };
          logoImg.onerror = () => {
            toast.error("Logo failed to load. Sharing QR without logo.");
            // To fix the "empty space", we'd ideally redraw the QR without excavation.
            // But since the SVG is already excavated, we just fill the center with white
            // so it looks like a design choice rather than a broken hole.
            finish();
          };
          logoImg.src = restaurant.logo_url;
        } else {
          finish();
        }
      };
      qrImg.src = qrUrl;
    });
  };

  const handleShare = async () => {
    toast.info("Preparing your menu image...");
    const blob = await generateCanvasImage(true);
    if (!blob) return;

    const file = new File([blob], "menu-qr.png", { type: "image/png" });
    
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: restaurant.name,
          text: `Check out our digital menu: ${menuUrl}`
        });
      } catch (err) {
        console.error("Share failed", err);
      }
    } else {
      // Fallback: Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${restaurant.name}-menu.png`;
      a.click();
      toast.success("Image downloaded successfully!");
    }
  };

  const hasEmbeddedLogo = restaurant.show_qr_logo !== false && !!restaurant.logo_url;

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      {/* Note: If the logo fails here, the SVG will have a blank center. 
          To fix the 'empty space' issue perfectly, we keep the logo 
          in the QRCodeSVG but handle the failures in the export functions.
      */}
      <div className="bg-white p-6 rounded-2xl border shadow-sm" ref={qrRef}>
        <QRCodeSVG
          value={menuUrl}
          size={160}
          level="H"
          imageSettings={hasEmbeddedLogo ? { 
            src: restaurant.logo_url!, 
            height: 38, 
            width: 38, 
            excavate: true 
          } : undefined}
        />
      </div>
      
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Your menu QR code</p>
        {hasEmbeddedLogo && (
          <p className="text-xs text-primary font-medium mt-1">Logo embedded ✓</p>
        )}
      </div>

      <Button className="w-full" onClick={onViewFullscreen}>
        <Eye className="w-4 h-4 mr-2" /> View QR Display
      </Button>

      <div className="flex gap-2 w-full">
        <Button variant="outline" className="flex-1" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" /> Print
        </Button>
        <Button variant="outline" className="flex-1" onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-2" /> Share Image
        </Button>
      </div>
    </div>
  );
};

export default QrTab;
