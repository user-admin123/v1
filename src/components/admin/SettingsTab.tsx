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

  // Logic to determine if a toggle should be interactive
  const isLogoAvailable = !!restaurant.logo_url;

  return (
    <div className="space-y-4 mt-3">
      {/* Restaurant Name */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>Restaurant Name</Label>
          <span className={cn(
            "text-[10px] tabular-nums",
            restaurant.name.length >= MAX_LIMITS.NAME ? "text-destructive font-medium" : "text-muted-foreground"
          )}>
            {restaurant.name.length}/{MAX_LIMITS.NAME}
          </span>
        </div>
        <Input
          value={restaurant.name}
          maxLength={MAX_LIMITS.NAME}
          onChange={(e) => update({ name: e.target.value })}
          className="bg-muted/50"
          placeholder="Enter restaurant name"
        />
      </div>

      {/* Tagline */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>Tagline</Label>
          <span className={cn(
            "text-[10px] tabular-nums",
            (restaurant.tagline?.length || 0) >= MAX_LIMITS.TAGLINE ? "text-destructive font-medium" : "text-muted-foreground"
          )}>
            {restaurant.tagline?.length || 0}/{MAX_LIMITS.TAGLINE}
          </span>
        </div>
        <Input
          value={restaurant.tagline || ""}
          maxLength={MAX_LIMITS.TAGLINE}
          onChange={(e) => update({ tagline: e.target.value })}
          className="bg-muted/50"
          placeholder="e.g. Traditional Italian Cuisine"
        />
      </div>

      {/* Logo Section */}
      <div className="space-y-2">
        <Label>Logo</Label>
        {restaurant.logo_url && (
          <div className="flex items-center gap-3 mb-2">
            <img
              src={restaurant.logo_url}
              alt="Logo preview"
              className="w-16 h-16 rounded-full object-cover border-2 border-border/30"
            />
            <Button size="sm" variant="ghost" onClick={() => update({ logo_url: "", show_qr_logo: false })}>
              <X className="w-3 h-3 mr-1" /> Remove
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <label className="flex-1 flex items-center gap-2 cursor-pointer bg-muted/50 border border-input rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Upload className="w-4 h-4" />
            <span>Upload logo</span>
            <input type="file" accept="image/*" onChange={onLogoUpload} className="hidden" />
          </label>
        </div>
        <Input
          value={restaurant.logo_url?.startsWith("data:") ? "" : (restaurant.logo_url || "")}
          onChange={(e) => update({ logo_url: e.target.value })}
          className="bg-muted/50"
          placeholder="Or paste logo URL..."
        />
      </div>

      {/* Customer view settings */}
      <div className="border-t border-border/30 pt-4 mt-4">
        <p className="text-sm font-semibold text-foreground mb-3">Customer View Settings</p>
        <div className="space-y-3">
          {[
            { key: "show_veg_filter" as const, label: "Show Veg/Non-Veg Filter", desc: "Let customers filter by dietary type", disabled: false },
            { key: "show_sold_out" as const, label: "Show Sold Out Items", desc: "Display unavailable items to customers", disabled: false },
            { key: "show_search" as const, label: "Enable Menu Search", desc: "Let customers search items by name", disabled: false },
            { 
              key: "show_qr_logo" as const, 
              label: "Show Logo in QR Code", 
              desc: isLogoAvailable ? "Embed restaurant logo inside QR" : "Upload a logo first to enable this",
              disabled: !isLogoAvailable 
            },
          ].map(({ key, label, desc, disabled }) => (
            <div key={key} className={cn("flex items-center justify-between", disabled && "opacity-50")}>
              <div>
                <Label className={cn("text-sm", !disabled && "cursor-pointer")} htmlFor={key}>{label}</Label>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch
                id={key}
                disabled={disabled}
                checked={disabled ? false : (restaurant[key] ?? true)}
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
