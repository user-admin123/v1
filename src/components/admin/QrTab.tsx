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

    // Using a cleaner, neutral professional style for the printout
    printWindow.document.write(`
      <html><head><title>${restaurant.name} - QR Menu</title>
      <style>
        body { 
          margin: 0; padding: 40px; display: flex; justify-content: center; 
          font-family: system-ui, -apple-system, sans-serif; background: #fafafa;
        }
        .card { 
          background: white; border: 1px solid #e5e7eb; border-radius: 16px; 
          padding: 32px; text-align: center; max-width: 350px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
        .logo { width: 80px; height: 80px; border-radius: 9999px; object-fit: cover; margin-bottom: 16px; }
        h2 { margin: 0; color: #111827; font-size: 24px; font-weight: 700; }
        p { color: #6b7280; margin: 4px 0 20px 0; font-size: 14px; }
        .qr-container { background: #f9fafb; padding: 20px; border-radius: 12px; display: inline-block; }
        .footer { margin-top: 24px; font-size: 12px; color: #9ca3af; font-weight: 500; }
      </style></head>
      <body>
        <div class="card">
          ${restaurant.logo_url ? `<img src="${restaurant.logo_url}" class="logo" />` : ""}
          <h2>${restaurant.name}</h2>
          ${restaurant.tagline ? `<p>${restaurant.tagline}</p>` : "<p>Scan to view our menu</p>"}
          <div class="qr-container">${svgData}</div>
          <div class="footer">Scan with phone camera</div>
        </div>
        <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const handleShare = async () => {
    // We target the SVG specifically. To remove the center logo for share, 
    // we use a clone and manually remove the image element if it exists.
    const svgEl = qrRef.current?.querySelector("svg")?.cloneNode(true) as SVGSVGElement;
    if (!svgEl) return;

    // Remove the embedded logo image from the SVG clone for the Share version
    const embeddedImg = svgEl.querySelector("image");
    if (embeddedImg) embeddedImg.remove();

    try {
      const canvas = document.createElement("canvas");
      const size = 1024;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const svgData = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) return;

      const file = new File([blob], `menu-${restaurant.name}.png`, { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: restaurant.name,
          text: `Check out the menu for ${restaurant.name} here: ${menuUrl}`,
        });
      }
      URL.revokeObjectURL(url);
    } catch (error: any) {
      // Ignore "AbortError" (user closed the share sheet)
      if (error.name !== "AbortError") {
        console.error("Share failed", error);
      }
    }
  };

  return (
    <div className="mt-3 flex flex-col items-center gap-4">
      {/* Visual QR container in the UI */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-border" ref={qrRef}>
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

      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground">
          Your Menu QR Code
        </p>
        <p className="text-xs text-muted-foreground max-w-[200px]">
          Customers can scan this to view your digital menu instantly.
        </p>
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
          Share
        </Button>
      </div>
    </div>
  );
};

export default QrTab;
