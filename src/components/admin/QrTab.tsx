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
        
        html, body { 
          height: 100%; 
          width: 100%;
        }

        body {
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Inter', sans-serif;
          background: linear-gradient(135deg,#667eea 0%,#764ba2 50%,#f093fb 100%);
        }

        .card {
          background: white;
          border-radius: 32px;
          padding: 60px 40px;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          max-width: 420px;
          width: 90%;
          /* Ensures centering on physical paper */
          margin: auto;
        }

        .logo { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin: 0 auto 16px; border: 4px solid #764ba2; }
        h2 { font-family: 'Playfair Display', serif; font-size: 32px; color: #1a1a2e; margin-bottom: 6px; }
        .tagline { color: #666; font-size: 16px; font-style: italic; margin-bottom: 24px; }
        
        .qr-wrap { 
          display: inline-block; 
          padding: 24px; 
          border-radius: 24px; 
          background: #f8fafc; 
          border: 1px solid #f1f5f9;
          margin: 10px 0;
        }
        
        .scan-text {
          margin-top: 24px;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: #764ba2;
        }

        /* Print Specific Logic */
        @media print {
          @page { margin: 0; }
          body { 
            background: white !important; 
            height: 99vh; /* Prevents blank 2nd page while keeping center */
          }
          .card { 
            box-shadow: none !important; 
            border: none;
            /* Force center alignment on the printed page */
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
          }
        }
      </style></head>
      <body>
        <div class="card">
          ${restaurant.logo_url ? `<img src="${restaurant.logo_url}" class="logo" alt="logo"/>` : ""}
          <h2>${restaurant.name}</h2>
          ${restaurant.tagline ? `<p class="tagline">${restaurant.tagline}</p>` : ""}
          <div class="qr-wrap">${svgData}</div>
          <p class="scan-text">Scan to explore our digital menu</p>
        </div>
        <script>
          // Wait for fonts/images to load before printing
          window.onload = () => {
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          };
        </script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${restaurant.name} Menu`,
          text: "Scan to view our menu",
          url: menuUrl,
        });
        return; 
      } catch { 
        return; 
      }
    }
    navigator.clipboard.writeText(menuUrl);
    toast({ title: "Menu URL copied to clipboard!" });
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
