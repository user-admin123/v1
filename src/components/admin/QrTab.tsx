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
      </style></head>
      <body><div class="card">
        ${restaurant.logo_url ? `<img src="${restaurant.logo_url}" class="logo" alt="logo"/>` : ""}
        <h2>${restaurant.name}</h2>
        ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
        <div class="qr-wrap">${svgData}</div>
        <p class="scan-text">Scan me to get the live menu!</p>
        <p class="url">${menuUrl}</p>
      </div>
      <script>setTimeout(()=>{window.print();},500);</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const handleShare = async () => {
    const svgEl = qrRef.current?.querySelector("svg");
    
    // Check if we can share files (the "Fun" way)
    if (svgEl && navigator.canShare && navigator.share) {
      try {
        const canvas = document.createElement("canvas");
        const scale = 2; // High resolution
        canvas.width = 400 * scale;
        canvas.height = 560 * scale;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          ctx.scale(scale, scale);
          
          // 1. Background Gradient
          const grad = ctx.createLinearGradient(0, 0, 400, 560);
          grad.addColorStop(0, "#667eea");
          grad.addColorStop(0.5, "#764ba2");
          grad.addColorStop(1, "#f093fb");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 400, 560);

          // 2. White Card
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(30, 30, 340, 500, 20); 
          else ctx.rect(30, 30, 340, 500); // Fallback for older browsers
          ctx.fill();

          // 3. Text Content
          ctx.fillStyle = "#1a1a2e";
          ctx.font = "bold 24px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(restaurant.name, 200, 85);

          if (restaurant.tagline) {
            ctx.font = "italic 14px sans-serif";
            ctx.fillStyle = "#888";
            ctx.fillText(restaurant.tagline, 200, 110);
          }

          // 4. Draw QR Code
          const svgData = new XMLSerializer().serializeToString(svgEl);
          const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
          const url = URL.createObjectURL(svgBlob);
          const img = new Image();

          await new Promise((resolve) => {
            img.onload = () => {
              ctx.drawImage(img, 100, 150, 200, 200);
              URL.revokeObjectURL(url);
              resolve(null);
            };
            img.src = url;
          });

          // 5. Labels
          ctx.fillStyle = "#764ba2";
          ctx.font = "bold 16px sans-serif";
          ctx.fillText("Scan for Menu", 200, 380);

          // 6. Share the actual file
          const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
          if (blob) {
            const file = new File([blob], `${restaurant.name}-Menu.png`, { type: "image/png" });
            
            // Check if file sharing is specifically supported
            if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `${restaurant.name} Menu`,
                    text: "Check out our live menu!",
                });
                return; // Success!
            }
          }
        }
      } catch (err) {
        console.error("Image share failed, falling back to link", err);
      }
    }

    // Fallback: Share just the link if image generation/sharing fails
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${restaurant.name} Menu`,
          text: "View our menu here:",
          url: menuUrl,
        });
      } catch { /* User cancelled */ }
    } else {
      navigator.clipboard.writeText(menuUrl);
      toast({ title: "Menu URL copied to clipboard!" });
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
      {/* ... rest of your UI (labels and buttons) ... */}
      <Button className="w-full" onClick={onViewFullscreen}>
        <Eye className="w-4 h-4 mr-2" />View QR Display
      </Button>
      <div className="flex gap-2 w-full">
        <Button variant="outline" className="flex-1" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />Print
        </Button>
        <Button variant="outline" className="flex-1" onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-2" />Share
        </Button>
      </div>
    </div>
  );
};

export default QrTab;
