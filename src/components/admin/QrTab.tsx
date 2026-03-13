import { useRef, useState } from "react";
import { RestaurantInfo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Eye, Printer, Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";

// --- HELPERS (Kept lean) ---
const getBase64 = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url, { mode: 'cors' });
    const blob = await res.blob();
    return new Promise(r => {
      const reader = new FileReader();
      reader.onloadend = () => r(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
};

const QrTab = ({ restaurant, menuUrl, onViewFullscreen }: Props) => {
  const [loading, setLoading] = useState({ print: false, share: false });
  const qrRef = useRef<HTMLDivElement>(null);
  const fullQrRef = useRef<HTMLDivElement>(null);

  const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || "0 0% 0%";
  const hasEmbeddedLogo = restaurant.show_qr_logo !== false && !!restaurant.logo_url;

  // Shared logic to get SVG and Logo
  const prepareAssets = async () => {
    let logoData = hasEmbeddedLogo ? await getBase64(restaurant.logo_url!) : null;
    if (hasEmbeddedLogo && !logoData) {
      toast.error("Logo load failed. Using full QR code...", { position: "top-center" });
    }
    const svgNode = (logoData ? qrRef : fullQrRef).current?.querySelector("svg");
    return { logoData, svgData: new XMLSerializer().serializeToString(svgNode!) };
  };

  const handlePrint = async () => {
    setLoading(prev => ({ ...prev, print: true }));
    const { logoData, svgData } = await prepareAssets();
    const pw = window.open("", "_blank");
    if (!pw) return setLoading(prev => ({ ...prev, print: false }));

    pw.document.write(`
      <html>
        <head><style>
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;700&display=swap');
          body { margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: 'Inter'; }
          .card { border-radius: 32px; padding: 60px 40px; text-align: center; border: 8px solid hsl(${primary}); width: 450px; }
          .logo { width: 80px; height: 80px; border-radius: 16px; margin-bottom: 15px; object-fit: cover; }
          h2 { font-family: 'Playfair Display'; font-size: 32px; margin: 0; }
          .qr-wrap { margin: 20px 0; } .qr-wrap svg { width: 250px; height: 250px; }
        </style></head>
        <body>
          <div class="card">
            ${logoData ? `<img src="${logoData}" class="logo" />` : ""}
            <h2>${restaurant.name}</h2>
            ${restaurant.tagline ? `<p style="color:#666; font-style:italic">${restaurant.tagline}</p>` : ""}
            <div class="qr-wrap">${svgData}</div>
            <p style="font-weight:700; font-size:20px">Scan to view our digital menu</p>
          </div>
          <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script>
        </body>
      </html>
    `);
    pw.document.close();
    setLoading(prev => ({ ...prev, print: false }));
  };

  const handleShare = async () => {
    setLoading(prev => ({ ...prev, share: true }));
    try {
      const { logoData, svgData } = await prepareAssets();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      canvas.width = 900; canvas.height = 1200;

      // Draw Background & Border
      ctx.fillStyle = "#fff"; ctx.fillRect(0,0,900,1200);
      ctx.strokeStyle = `hsl(${primary})`; ctx.lineWidth = 16;
      ctx.strokeRect(40, 40, 820, 1120);

      // Draw Text
      ctx.textAlign = "center"; ctx.fillStyle = "#000";
      ctx.font = "bold 70px sans-serif"; ctx.fillText(restaurant.name, 450, 180);
      
      const qrImg = new Image();
      qrImg.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
      await qrImg.decode();
      ctx.drawImage(qrImg, 200, 300, 500, 500);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "menu-qr.png", { type: "image/png" });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: restaurant.name });
        } else {
          const a = document.createElement('a');
          a.href = canvas.toDataURL(); a.download = "menu-qr.png"; a.click();
        }
      });
    } catch { toast.error("Share failed", { position: "top-center" }); }
    setLoading(prev => ({ ...prev, share: false }));
  };

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      <div className="bg-white p-6 rounded-2xl border shadow-sm" ref={qrRef}>
        <QRCodeSVG value={menuUrl} size={160} level="H" 
          imageSettings={hasEmbeddedLogo ? { src: restaurant.logo_url!, height: 38, width: 38, excavate: true } : undefined} 
        />
      </div>
      <div className="hidden" ref={fullQrRef}><QRCodeSVG value={menuUrl} size={160} level="H" /></div>
      
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Your menu QR code</p>
        {hasEmbeddedLogo && <p className="text-xs text-primary font-medium mt-1">Logo embedded ✓</p>}
      </div>

      <Button className="w-full" onClick={onViewFullscreen}><Eye className="mr-2 h-4 w-4" /> View QR Display</Button>
      
      <div className="flex gap-2 w-full">
        <Button variant="outline" className="flex-1" onClick={handlePrint} disabled={loading.print}>
          {loading.print ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />} Print
        </Button>
        <Button variant="outline" className="flex-1" onClick={handleShare} disabled={loading.share}>
          {loading.share ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />} Share
        </Button>
      </div>
    </div>
  );
};
