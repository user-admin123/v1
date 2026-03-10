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
    
    // We use computed styles to grab your actual theme colors for the print-out
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary');

    printWindow.document.write(`
      <html><head><title>Menu QR - ${restaurant.name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;
          font-family:'Inter',sans-serif;background-color: hsl(${primaryColor} / 0.05);}
        .card{background:white;border-radius:24px;padding:48px 40px;text-align:center;
          box-shadow:0 20px 60px rgba(0,0,0,0.1);max-width:400px;width:90%;border: 1px solid hsl(${primaryColor} / 0.1);}
        .logo{width:64px;height:64px;border-radius:50%;object-fit:cover;margin:0 auto 12px;border:3px solid hsl(${primaryColor})}
        h2{font-size:28px;color:#1a1a2e;margin-bottom:4px;font-weight:700}
        .tagline{color:#666;font-size:14px;margin-bottom:20px}
        .qr-wrap{display:inline-block;padding:16px;border-radius:16px;background:hsl(${primaryColor} / 0.05);margin:16px 0}
        .scan-text{margin-top:20px;font-size:16px;font-weight:600;color:hsl(${primaryColor});}
        .url{font-size:11px;color:#aaa;margin-top:8px;word-break:break-all}
        .footer{margin-top:16px;padding-top:12px;border-top:1px solid #eee;font-size:10px;color:#bbb}
        @media print { body { background: white; } .card { box-shadow: none; border: 1px solid #eee; } }
      </style></head>
      <body><div class="card">
        ${restaurant.logo_url ? `<img src="${restaurant.logo_url}" class="logo" alt="logo"/>` : ""}
        <h2>${restaurant.name}</h2>
        ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
        <div class="qr-wrap">${svgData}</div>
        <p class="scan-text">📱 Scan to view menu</p>
        <p class="url">${menuUrl}</p>
        <p class="footer">Powered by Your Brand</p>
      </div>
      <script>setTimeout(()=>{window.print();window.close();},500);</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const handleShare = async () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    try {
      // 1. Convert SVG to Canvas to File
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new Image();
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      img.onload = async () => {
        canvas.width = svg.clientWidth * 2; // Higher quality
        canvas.height = svg.clientHeight * 2;
        ctx?.scale(2, 2);
        ctx?.drawImage(img, 0, 0);
        
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        URL.revokeObjectURL(url);

        if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], 'qr.png', { type: 'image/png' })] })) {
          const file = new File([blob], `${restaurant.name}-QR.png`, { type: 'image/png' });
          
          await navigator.share({
            title: `${restaurant.name} Menu`,
            text: `Check out our digital menu here: ${menuUrl}`,
            files: [file],
          });
        } else if (navigator.share) {
          // Fallback if file sharing isn't supported but text sharing is
          await navigator.share({
            title: `${restaurant.name} Menu`,
            text: `Check out our digital menu: ${menuUrl}`,
          });
        }
      };
      img.src = url;
    } catch (error) {
      toast({ 
        title: "Sharing failed", 
        description: "Your browser might not support image sharing.",
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      {/* Container for QR - uses theme border/bg */}
      <div className="bg-white p-6 rounded-2xl border-2 border-primary/10 shadow-sm" ref={qrRef}>
        <QRCodeSVG
          value={menuUrl}
          size={160}
          level="H"
          // Ensures the QR code itself matches the primary theme color
          fgColor="hsl(var(--primary))"
          imageSettings={
            restaurant.show_qr_logo !== false && restaurant.logo_url
              ? { src: restaurant.logo_url, height: 32, width: 32, excavate: true }
              : undefined
          }
        />
      </div>
      
      <div className="text-center space-y-1">
        <p className="text-sm font-medium">Your menu QR code</p>
        {restaurant.show_qr_logo !== false && restaurant.logo_url && (
          <span className="text-[10px] uppercase tracking-wider font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            Logo embedded
          </span>
        )}
      </div>

      <Button className="w-full shadow-md" onClick={onViewFullscreen}>
        <Eye className="w-4 h-4 mr-2" />View QR Display
      </Button>

      <div className="grid grid-cols-2 gap-3 w-full">
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />Print
        </Button>
        <Button variant="outline" onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-2" />Share
        </Button>
      </div>
    </div>
  );
};

export default QrTab;
