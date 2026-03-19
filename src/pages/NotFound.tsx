import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Log the error for your internal tracking
    console.error("404 Error at:", location.pathname);

    // Auto-redirect timer
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    const redirect = setTimeout(() => {
      navigate("/", { replace: true });
    }, 5000);

    return () => {
      clearInterval(timer);
      clearTimeout(redirect);
    };
  }, [location.pathname, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0f172a] px-6 text-center text-white">
      {/* Subtle Gold Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-md">
        <h1 className="mb-2 text-9xl font-bold text-amber-600/20 font-serif leading-none">404</h1>
        
        <h2 className="mb-4 text-3xl font-bold font-serif tracking-tight">
          Menu Not Found
        </h2>
        
        <p className="mb-8 text-slate-400 text-lg">
          We couldn't find the page you're looking for. <br />
          Returning to the menu in <span className="text-amber-500 font-bold">{countdown}s</span>...
        </p>
        
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild className="bg-amber-600 hover:bg-amber-700 text-white border-none px-8 py-6 text-lg">
            <Link to="/">
              <Home className="mr-2 h-5 w-5" />
              Go to Menu
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
