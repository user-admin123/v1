import { useRef } from "react";
import { RestaurantInfo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Eye, Printer, Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
    printWindow.document.write(`
      <html><head><title>Menu QR - ${restaurant.name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:'Inter',sans-serif;
          background:linear-gradient(135deg,#667eea 0%,#764ba2 50%,#f093fb 100%)}
        .card{background:white;border-radius:24px;padding:48px 40px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-width:400px;width:90%}
        .logo{width:64px;height:64px;border-radius:50%;object-fit:cover;margin:0 auto 12px;border:3px solid #764ba2}
        h2{font-family:'Playfair Display',serif;font-size:28px;color:#1a1a2e;margin-bottom:4px}
        .tagline{color:#888;font-size:14px;font-style:italic;margin-bottom:20px}
        .qr-wrap{display:inline-block;padding:16px;border-radius:16px;background:linear-gradient(135deg,#f5f7fa,#c3cfe2);margin:16px 0}
        .scan-text{margin-top:20px;font-size:16px;font-weight:600;color:#764ba2;display:flex;align-items:center;justify-content:center;gap:8px}
        .url{font-size:11px;color:#aaa;margin-top:8px}
        .footer{margin-top:16px;padding-top:12px;border-top:1px solid #eee;font-size:10px;color:#bbb}
      </style></head>
      <body><div class="card">
        ${restaurant.logo_url ? `<img src="${restaurant.logo_url}" class="logo" alt="logo"/>` : ""}
        <h2>${restaurant.name}</h2>
        ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
        <div class="qr-wrap">${svgData}</div>
        <p class="scan-text">📱 Scan me to get the live menu!</p>
        <p class="url">${menuUrl}</p>
        <p class="footer">Powered by QR Menu</p>
      </div>
      <script>setTimeout(()=>{window.print();},500);</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const handleShare = async () => {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;

    const canvas = document.createElement("canvas");
    const scale = 2;

    // Set canvas size (scaled version)
    canvas.width = 400 * scale;
    canvas.height = 560 * scale;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(scale, scale);

    // Create background gradient
    const grad = ctx.createLinearGradient(0, 0, 400, 560);
    grad.addColorStop(0, "#667eea");
    grad.addColorStop(0.5, "#764ba2");
    grad.addColorStop(1, "#f093fb");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 400, 560);

    // White card background
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.roundRect(30, 30, 340, 500, 20);
    ctx.fill();

    // Draw Restaurant Name
    ctx.fillStyle = "#1a1a2e";
    ctx.font = "bold 26px serif";
    ctx.textAlign = "center";
    ctx.fillText(restaurant.name, 200, 80);

    // Draw Tagline if available
    if (restaurant.tagline) {
      ctx.font = "italic 13px sans-serif";
      ctx.fillStyle = "#888";
      ctx.fillText(restaurant.tagline, 200, 100);
    }

    // Convert SVG to image and draw it onto the canvas
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const img = new window.Image();

    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });

    const url = URL.createObjectURL(svgBlob);

    await new Promise<void>((resolve) => {
      img.onload = () => {
        ctx.drawImage(img, 100, 120, 200, 200);
        URL.revokeObjectURL(url);
        resolve();
      };
      img.src = url;
    });

    // Optionally draw the logo manually if it exists
    if (restaurant.logo_url) {
      const logo = new Image();

      await new Promise<void>((resolve) => {
        logo.onload = () => {
          const size = 48;

          const x = 200 - size / 2;
          const y = 220 - size / 2;

          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(200, 220, size / 2 + 6, 0, Math.PI * 2);
          ctx.fill();

          ctx.drawImage(logo, x, y, size, size);

          resolve();
        };

        logo.src = restaurant.logo_url!;
      });
    }

    // Add "Scan me" text below the QR code
    ctx.fillStyle = "#764ba2";
    ctx.font = "600 15px sans-serif";
    ctx.fillText("📱 Scan me to get the live menu!", 200, 360);

    // Add the menu URL
    ctx.fillStyle = "#aaa";
    ctx.font = "11px sans-serif";
    ctx.fillText(menuUrl, 200, 385);

    // Add footer text
    ctx.fillStyle = "#ccc";
    ctx.font = "9px sans-serif";
    ctx.fillText("Powered by QR Menu", 200, 510);

    // Convert canvas to image and share
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );

    if (blob) {
      const file = new File([blob], `${restaurant.name}-QR.png`, {
        type: "image/png",
      });

      try {
        await navigator.share({
          title: `${restaurant.name} Menu`,
          text: "Scan or click to view our menu",
          url: menuUrl,
          files: [file],
        });
      } catch (err) {
        toast({ title: "Sharing is not supported on this device." });
      }
    }
  };

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      <div className="bg-white p-6 rounded-2xl" ref={qrRef}>
        <QRCodeSVG
          value={menuUrl}
          size={160}
          level="H"
          imageSettings={
            restaurant.show_qr_logo !== false && restaurant.logo_url
              ? { src: restaurant.logo_url, height: 32, width: 32, excavate: true }
              : undefined
          }
        />
      </div>
      <p className="text-sm text-muted-foreground text-center">
        Your menu QR code
        {restaurant.show_qr_logo !== false && restaurant.logo_url && (
          <>
            <br />
            <span className="text-xs text-primary">Logo embedded ✓</span>
          </>
        )}
      </p>
      <Button className="w-full" onClick={onViewFullscreen}>
        <Eye className="w-4 h-4 mr-2" /> View QR Display
      </Button>
      <div className="flex gap-2 w-full">
        <Button variant="outline" className="flex-1" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" /> Print
        </Button>
        <Button variant="outline" className="flex-1" onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-2" /> Share
        </Button>
      </div>
    </div>
  );
};

export default QrTab;
