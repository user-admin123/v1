import { RestaurantInfo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Upload, X, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  restaurant: RestaurantInfo;
  onUpdate: (info: RestaurantInfo) => void;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  markChanged: () => void;
}

const MAX_LIMITS = {
  NAME: 40,
  TAGLINE: 60,
};

const CharCounter = ({ current, max }: { current: number; max: number }) => {
  const isAtLimit = current >= max;
  const isWarning = current >= max * 0.85;

  return (
    <div className="flex items-center gap-1.5 select-none">
      <span
        className={cn(
          "text-[10px] tabular-nums font-medium transition-all duration-300",
          isAtLimit
            ? "text-destructive scale-105"
            : isWarning
            ? "text-orange-500"
            : "text-muted-foreground/40"
        )}
      >
        {current}
        <span className="mx-0.5 opacity-30">/</span>
        {max}
      </span>
      {isAtLimit && (
        <CheckCircle2 className="w-2.5 h-2.5 text-destructive animate-in fade-in zoom-in" />
      )}
    </div>
  );
};

const SettingsTab = ({ restaurant, onUpdate, onLogoUpload, markChanged }: Props) => {
  
  const update = (partial: Partial<RestaurantInfo>) => {
  // Since we slice in the onChange now, this function is 100% safe
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
            <Label className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground/70 truncate min-w-0">
              Restaurant Name
            </Label>
            <div className="shrink-0">
              <CharCounter current={restaurant.name.length} max={MAX_LIMITS.NAME} />
            </div>
          </div>
          <Input
  // 1. Use || "" to ensure it never becomes null
  value={restaurant.name || ""} 
  
  // 2. The Browser-level limit
  maxLength={MAX_LIMITS.NAME} 
  
  onChange={(e) => {
    // 3. Force the value to be sliced BEFORE it goes to the state
    const val = e.target.value.slice(0, MAX_LIMITS.NAME);
    update({ name: val });
  }}
  className="bg-muted/30 border-muted focus:bg-background h-10 w-full"
/>
        </div>

        <div className="space-y-2.5 w-full">
          <div className="flex justify-between items-end gap-4 px-0.5">
            <Label className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground/70 truncate min-w-0">
              Tagline
            </Label>
            <div className="shrink-0">
              <CharCounter current={restaurant.tagline?.length || 0} max={MAX_LIMITS.TAGLINE} />
            </div>
          </div>
          <Input
            value={restaurant.tagline || ""} 
  maxLength={MAX_LIMITS.TAGLINE}
  onChange={(e) => update({ tagline: e.target.value })}
  className="bg-muted/30 border-muted focus:bg-background h-10 w-full"
            placeholder="e.g. Authentic Wood-Fired Pizza"
          />
        </div>
      </div>

      {/* Branding Section */}
      <div className="space-y-4 pt-2">
        <Label className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground/70 px-0.5">
          Branding & Logo
        </Label>
        
        <div className="grid gap-4">
          {restaurant.logo_url && (
            <div className="flex items-center gap-4 p-3 bg-secondary/20 rounded-xl border border-border/50 backdrop-blur-sm group">
              <img
                src={restaurant.logo_url}
                alt="Logo"
                className="w-14 h-14 rounded-full object-cover border-2 border-background shadow-md"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate italic opacity-60">Brand identity active</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[11px] text-destructive hover:bg-destructive/10 -ml-2 transition-colors"
                  onClick={() => update({ logo_url: "", show_qr_logo: false })}
                >
                  <X className="w-3 h-3 mr-1" /> Discard Logo
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <label className="flex flex-col items-center justify-center gap-2 cursor-pointer bg-muted/20 border-2 border-dashed border-muted-foreground/20 rounded-xl py-6 hover:bg-muted/40 hover:border-muted-foreground/40 transition-all group">
              <div className="p-2 bg-background rounded-full shadow-sm group-hover:scale-110 transition-transform">
                <Upload className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Upload Image File</span>
              <input type="file" accept="image/*" onChange={onLogoUpload} className="hidden" />
            </label>

            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <span className="text-[10px] font-bold text-muted-foreground/40 uppercase">URL</span>
              </div>
              <Input
                value={restaurant.logo_url?.startsWith("data:") ? "" : restaurant.logo_url || ""}
                onChange={(e) => update({ logo_url: e.target.value })}
                className="bg-muted/30 pl-11 text-xs h-9"
                placeholder="https://example.com/logo.png"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Experience Section */}
      <div className="pt-6 border-t border-border/50 mt-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary/60 mb-6 px-1">
          Storefront Experience
        </p>
        <div className="grid gap-6">
          {[
            { key: "show_veg_filter" as const, label: "Dietary Filters", desc: "Show Veg/Non-Veg toggles to users" },
            { key: "show_sold_out" as const, label: "Inventory Visibility", desc: "Display items currently out of stock" },
            { key: "show_search" as const, label: "Smart Search", desc: "Allow users to filter menu via keywords" },
            {
              key: "show_qr_logo" as const,
              label: "QR Branding",
              desc: isLogoAvailable ? "Embed logo in generated QR codes" : "Requires a logo to enable",
              disabled: !isLogoAvailable,
            },
          ].map(({ key, label, desc, disabled }) => (
            <div
              key={key}
              className={cn(
                "flex items-start justify-between gap-4 px-1 group transition-opacity",
                disabled && "opacity-30 grayscale pointer-events-none"
              )}
            >
              <div className="space-y-1 flex-1 min-w-0">
                <Label
                  className="text-sm font-semibold cursor-pointer block truncate group-hover:text-primary transition-colors"
                  htmlFor={key}
                >
                  {label}
                </Label>
                <p className="text-[11px] text-muted-foreground/80 leading-relaxed truncate">
                  {desc}
                </p>
              </div>
              <Switch
                id={key}
                disabled={disabled}
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
