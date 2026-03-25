import { useState } from "react";
import { RestaurantInfo } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ImageUploader } from "./ImageUploader";

interface Props {
  restaurant: RestaurantInfo;
  isUploading: boolean;
  onUpdate: (info: RestaurantInfo) => void;
  // UPDATED: Removed currentUrl from signatures
  onFileSelect: (file: File, type: 'logo' | 'item', name: string, setter: (url: string) => void) => void;
  onUrlChange: (newUrl: string, setter: (url: string) => void) => void;
  markChanged: () => void;
}

const MAX_LIMITS = {
  NAME: 40,
  TAGLINE: 60,
};

const CharCounter = ({ current, max }: { current: number; max: number }) => {
  const isAtLimit = current >= max;
  return (
    <div className="flex items-center gap-1.5 select-none">
      <span className={cn("text-[10px] tabular-nums font-medium transition-all", 
        isAtLimit ? "text-destructive scale-105" : "text-muted-foreground/40")}>
        {current} / {max}
      </span>
    </div>
  );
};

const SettingsTab = ({ 
  restaurant, 
  isUploading, 
  onUpdate, 
  onFileSelect,
  onUrlChange,
  markChanged 
}: Props) => {

  const update = (partial: Partial<RestaurantInfo>) => {
    const field = Object.keys(partial)[0] as keyof RestaurantInfo;
    const newValue = partial[field];
    
    if (typeof newValue === "string") {
      if (field === "name" && newValue.length > MAX_LIMITS.NAME) return;
      if (field === "tagline" && newValue.length > MAX_LIMITS.TAGLINE) return;
    }
    
    onUpdate({ ...restaurant, ...partial });
    markChanged();
  };

  const isLogoAvailable = !!restaurant.logo_url;

  return (
    <div className="space-y-8 mt-4 max-w-full pb-4 px-1 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* Identity Section */}
      <div className="space-y-6">
        <div className="space-y-2.5 w-full">
          <div className="flex justify-between items-end gap-4 px-0.5">
            <Label className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground/70">Restaurant Name</Label>
            <CharCounter current={restaurant.name?.length || 0} max={MAX_LIMITS.NAME} />
          </div>
          <Input
            value={restaurant.name || ""}
            onChange={(e) => update({ name: e.target.value })}
            className="bg-muted/30 border-muted focus:bg-background h-10 shadow-sm"
            disabled={isUploading}
          />
        </div>

        <div className="space-y-2.5 w-full">
          <div className="flex justify-between items-end gap-4 px-0.5">
            <Label className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground/70">Tagline</Label>
            <CharCounter current={restaurant.tagline?.length || 0} max={MAX_LIMITS.TAGLINE} />
          </div>
          <Input
            value={restaurant.tagline || ""}
            onChange={(e) => update({ tagline: e.target.value })}
            className="bg-muted/30 border-muted focus:bg-background h-10 shadow-sm"
            disabled={isUploading}
          />
        </div>

        {/* Branding Section */}
        <ImageUploader 
          label="Restaurant Branding (Logo)"
          value={restaurant.logo_url || ""}
          isUploading={isUploading}
          aspect="square"
          // UPDATED: Removed restaurant.logo_url from arguments
          onFileSelect={(file) => onFileSelect(
            file, 
            'logo', 
            restaurant.name || "restaurant", 
            (url) => update({ logo_url: url })
          )}
          // UPDATED: Removed restaurant.logo_url from arguments
          onUrlChange={(newUrl) => onUrlChange(
            newUrl,
            (url) => update({ logo_url: url })
          )}
        />
      </div>

      {/* Experience Section */}
      <div className="pt-6 border-t border-border/50 mt-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary/60 mb-6 px-1">Storefront Experience</p>
        <div className="grid gap-6">
          {[
            { key: "show_veg_filter" as const, label: "Dietary Filters", desc: "Show Veg/Non-Veg toggles to users" },
            { key: "show_sold_out" as const, label: "Inventory Visibility", desc: "Display items currently out of stock" },
            { key: "show_search" as const, label: "Smart Search", desc: "Allow users to filter menu via keywords" },
            { key: "show_qr_logo" as const, label: "QR Branding", desc: isLogoAvailable ? "Embed logo in generated QR codes" : "Requires a logo to enable", disabled: !isLogoAvailable },
          ].map(({ key, label, desc, disabled }) => (
            <div key={key} className={cn("flex items-start justify-between gap-4 px-1 group transition-opacity", disabled && "opacity-30 grayscale pointer-events-none")}>
              <div className="space-y-1 flex-1 min-w-0">
                <Label className="text-sm font-semibold cursor-pointer block truncate group-hover:text-primary transition-colors" htmlFor={key}>{label}</Label>
                <p className="text-[11px] text-muted-foreground/80 leading-relaxed">{desc}</p>
              </div>
              <Switch
                id={key}
                disabled={disabled || isUploading}
                checked={disabled ? false : (restaurant[key] ?? (key === "show_qr_logo" ? false : true))}
                onCheckedChange={(v) => update({ [key]: v })}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
