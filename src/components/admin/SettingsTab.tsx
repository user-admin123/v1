import { RestaurantInfo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  restaurant: RestaurantInfo;
  onUpdate: (info: RestaurantInfo) => void;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  markChanged: () => void;
}

const MAX_LIMITS = {
  NAME: 40,
  TAGLINE: 60
};

const SettingsTab = ({ restaurant, onUpdate, onLogoUpload, markChanged }: Props) => {
  const update = (partial: Partial<RestaurantInfo>) => {
    onUpdate({ ...restaurant, ...partial });
    markChanged();
  };

  const isLogoAvailable = !!restaurant.logo_url;

  return (
    <div className="space-y-5 mt-3 max-w-full overflow-hidden">
      {/* Restaurant Name */}
      <div className="space-y-2">
        <div className="flex justify-between items-center gap-2">
          <Label className="truncate shrink">Restaurant Name</Label>
          <span className={cn(
            "text-[10px] tabular-nums shrink-0",
            restaurant.name.length >= MAX_LIMITS.NAME ? "text-destructive font-bold" : "text-muted-foreground"
          )}>
            {restaurant.name.length}/{MAX_LIMITS.NAME}
          </span>
        </div>
        <Input
          value={restaurant.name}
          maxLength={MAX_LIMITS.NAME}
          onChange={(e) => update({ name: e.target.value })}
          className="bg-muted/50 w-full"
          placeholder="Enter restaurant name"
        />
      </div>

      {/* Tagline */}
      <div className="space-y-2">
        <div className="flex justify-between items-center gap-2">
          <Label className="truncate shrink">Tagline</Label>
          <span className={cn(
            "text-[10px] tabular-nums shrink-0",
            (restaurant.tagline?.length || 0) >= MAX_LIMITS.TAGLINE ? "text-destructive font-bold" : "text-muted-foreground"
          )}>
            {restaurant.tagline?.length || 0}/{MAX_LIMITS.TAGLINE}
          </span>
        </div>
        <Input
          value={restaurant.tagline || ""}
          maxLength={MAX_LIMITS.TAGLINE}
          onChange={(e) => update({ tagline: e.target.value })}
          className="bg-muted/50 w-full"
          placeholder="e.g. Traditional Italian Cuisine"
        />
      </div>

      {/* Logo Section */}
      <div className="space-y-3">
        <Label>Logo</Label>
        {restaurant.logo_url && (
          <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg border border-border/20">
            <img 
              src={restaurant.logo_url} 
              alt="Logo" 
              className="w-12 h-12 rounded-full object-cover border shadow-sm" 
            />
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-xs text-destructive hover:bg-destructive/10" 
              onClick={() => update({ logo_url: "", show_qr_logo: false })}
            >
              <X className="w-3 h-3 mr-1" /> Remove
            </Button>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <label className="flex items-center justify-center gap-2 cursor-pointer bg-muted/50 border border-dashed border-input rounded-md px-3 py-3 text-sm text-muted-foreground hover:text-foreground transition-all">
            <Upload className="w-4 h-4" />
            <span>Upload image file</span>
            <input type="file" accept="image/*" onChange={onLogoUpload} className="hidden" />
          </label>
          
          <Input
            value={restaurant.logo_url?.startsWith("data:") ? "" : (restaurant.logo_url || "")}
            onChange={(e) => update({ logo_url: e.target.value })}
            className="bg-muted/50"
            placeholder="Or paste logo URL..."
          />
        </div>
      </div>

      {/* Customer View Settings */}
      <div className="border-t border-border/30 pt-4 mt-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-4 px-1">Display Features</p>
        <div className="space-y-4">
          {[
            { key: "show_veg_filter" as const, label: "Veg/Non-Veg Filter", desc: "Dietary toggles for menu items" },
            { key: "show_sold_out" as const, label: "Sold Out Items", desc: "Show items even when unavailable" },
            { key: "show_search" as const, label: "Menu Search", desc: "Display search bar to customers" },
            { 
              key: "show_qr_logo" as const, 
              label: "Show Logo in QR", 
              desc: isLogoAvailable ? "Embed logo in QR center" : "Upload a logo to enable",
              disabled: !isLogoAvailable 
            },
          ].map(({ key, label, desc, disabled }) => (
            <div key={key} className={cn("flex items-center justify-between gap-4 px-1", disabled && "opacity-40")}>
              <div className="min-w-0 flex-1">
                <Label className="text-sm font-medium block truncate" htmlFor={key}>{label}</Label>
                <p className="text-[11px] text-muted-foreground truncate leading-tight">{desc}</p>
              </div>
              <Switch
                id={key}
                disabled={disabled}
                // Fallback logic: Existing items default to true, QR logo defaults to false if empty
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
