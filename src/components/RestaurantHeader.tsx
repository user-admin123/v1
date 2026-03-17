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
    tapTimer.current = setTimeout(() => {
      tapCount.current = 0;
    }, 600);
  };

  return (
    <header className="relative pt-12 pb-8 px-6 text-center overflow-hidden">
      {/* Decorative gradient orb */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" 
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Logo Section */}
        <div
          onClick={handleLogoTap}
          className="cursor-pointer select-none active:scale-95 transition-transform inline-block"
        >
          {restaurant.logo_url ? (
            <img
              src={restaurant.logo_url}
              alt={`${restaurant.name} logo`}
              className="w-20 h-20 mx-auto mb-4 rounded-full object-cover border-2 border-primary/30 shadow-sm"
            />
          ) : (
            <div className="w-20 h-20 mx-auto mb-4 rounded-full glass-card flex items-center justify-center border-2 border-primary/10">
              <UtensilsCrossed className="w-9 h-9 text-primary" />
            </div>
          )}
        </div>

        {/* Restaurant Name: Handles up to 40 chars, max 2-line target */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground 
                       tracking-tight leading-tight text-balance
                       [overflow-wrap:anywhere] break-words
                       max-w-[25ch] sm:max-w-none mx-auto">
          {restaurant.name}
        </h1>

        {/* Tagline: Handles up to 60 chars, max 1-2 line target */}
        {restaurant.tagline && (
          <p className="mt-2 text-sm sm:text-base md:text-lg 
                        text-muted-foreground italic tracking-wide leading-relaxed
                        [overflow-wrap:anywhere] break-words 
                        max-w-[50ch] md:max-w-[65ch] mx-auto opacity-90">
            {restaurant.tagline}
          </p>
        )}
      </div>
    </header>
  );
};

export default RestaurantHeader;
