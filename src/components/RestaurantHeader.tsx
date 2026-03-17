import React from "react";
import { RestaurantInfo } from "@/lib/types";
import { UtensilsCrossed } from "lucide-react";

interface Props {
  restaurant: RestaurantInfo;
  onTripleTap?: () => void;
}

const RestaurantHeader = ({ restaurant, onTripleTap }: Props) => {
  const tapCount = React.useRef(0);
  const tapTimer = React.useRef<ReturnType<typeof setTimeout>>();

  const handleLogoTap = () => {
    tapCount.current += 1;
    if (tapCount.current === 3) {
      tapCount.current = 0;
      clearTimeout(tapTimer.current);
      onTripleTap?.();
      return;
    }
    clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 600);
  };
  return (
    <header className="relative pt-12 pb-8 px-6 text-center overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10 max-w-4xl mx-auto px-4">
       
        <div 
          onClick={handleLogoTap} 
          className="cursor-pointer select-none active:scale-95 transition-transform"
        >
          {restaurant.logo_url ? (
            <img
              src={restaurant.logo_url}
              alt={`${restaurant.name} logo`}
              className="w-20 h-20 mx-auto mb-4 rounded-full object-cover border-2 border-primary/30 shadow-sm"
            />
          ) : (
            <div className="w-20 h-20 mx-auto mb-4 rounded-full glass-card flex items-center justify-center">
              <UtensilsCrossed className="w-9 h-9 text-primary" />
            </div>
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground 
                 tracking-tight leading-[1.15] 
                 [overflow-wrap:anywhere] break-words
                 max-w-[20ch] sm:max-w-none mx-auto">
    {restaurant.name}
  </h1>

  {/* Tagline: Optimized for 1-2 lines at 60 chars */}
  {restaurant.tagline && (
    <p className="mt-3 text-muted-foreground text-base md:text-lg 
                  italic tracking-wide leading-snug
                  [overflow-wrap:anywhere] break-words 
                  max-w-[45ch] md:max-w-[60ch] mx-auto"> 
      {restaurant.tagline}
    </p>
  )}
      </div>
    </header>
  );
};

export default RestaurantHeader;
