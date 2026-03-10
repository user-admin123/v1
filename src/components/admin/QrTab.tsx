import { useRef, useState } from "react";
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
  const [isSharing, setIsSharing] = useState(false); // Track if sharing is in progress

  // Handle print functionality
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

  // Handle Share functionality
  const handleShare = async () => {
    setIsSharing(true); // Indicate sharing is in progress

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${restaurant.name} Menu`,
          text: "Scan or click to view our menu",
          url: menuUrl,
        });
        setIsSharing(false); // Sharing successful, reset state
        return;
      } catch (error) {
        setIsSharing(false); // Sharing canceled or failed
        toast({ title: "Share operation canceled.", variant: "destructive" });
      }
    } else {
      // Fallback when share is not supported
      setIsSharing(false); // Reset share state
      navigator.clipboard.writeText(menuUrl);
      toast({ title: "Menu URL copied to clipboard!" });
    }
  };

  // Function to manually add the logo on top of the QR code for sharing
  const handleShareWithLogo = async () => {
    if (!restaurant.logo_url) {
      return handleShare(); // If no logo, fallback to simple share
    }

    // Create a canvas element
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // Set the canvas size (adjust this based on your QR size)
    const qrSize = 400;
    canvas.width = qrSize;
    canvas.height = qrSize;

    // Draw QR code on canvas
    const qrCode = new QRCode({
      text: menuUrl,
      width: qrSize,
      height: qrSize,
      correctLevel: QRCode.CorrectLevel.H,
    });

    // Convert the QRCode to an image (SVG → canvas)
    const qrImage = new Image();
    const qrDataUrl = qrCode.createDataURL(4);  // '4' defines the scaling factor
    qrImage.src = qrDataUrl;

    // Wait for QR image to load
    await new Promise<void>((resolve) => {
      qrImage.onload = () => {
        ctx.drawImage(qrImage, 0, 0, qrSize, qrSize); // Draw the QR code onto the canvas

        // Draw the logo manually in the center
        const logo = new Image();
        logo.src = restaurant.logo_url;

        logo.onload = () => {
          // Calculate the logo's position (centered)
          const logoSize = 48; // Adjust the size as needed
          const x = (qrSize - logoSize) / 2;
          const y = (qrSize - logoSize) / 2;

          // Add a white circle background behind the logo for better visibility
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(x + logoSize / 2, y + logoSize / 2, logoSize / 2 + 6, 0, Math.PI * 2);
          ctx.fill();

          // Draw the logo over the QR code
          ctx.drawImage(logo, x, y, logoSize, logoSize);

          // Convert the canvas to PNG (final image)
          const finalImageUrl = canvas.toDataURL("image/png");

          // Share the image via the Share API
          navigator.share({
            title: `${restaurant.name} Menu`,
            text: "Scan or click to view our menu",
            url: finalImageUrl,
          }).catch(() => {
            // In case the share fails, fallback to copying the URL
            navigator.clipboard.writeText(menuUrl);
            toast({ title: "Menu URL copied to clipboard!" });
          });
        };
      };
    });
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
        <Button variant="outline" className="flex-1" onClick={handleShareWithLogo} disabled={isSharing}>
          <Share2 className="w-4 h-4 mr-2" />
          {isSharing ? "Sharing..." : "Share"}
        </Button>
      </div>
    </div>
  );
};

export default QrTab;
