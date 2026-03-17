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

const MAX_LIMITS = { NAME: 40, TAGLINE: 60 };

const SettingsTab = ({ restaurant, onUpdate, onLogoUpload, markChanged }: Props) => {
  const update = (partial: Partial<RestaurantInfo>) => {
    onUpdate({ ...restaurant, ...partial });
    markChanged();
  };

  const isLogoAvailable = !!restaurant.logo_url && restaurant.logo_url.length > 0;

  return (
    <div className="space-y-4 mt-3 overflow-x-hidden"> {/* Prevent width expansion */}
      
      {/* Name Input with Character Count */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="truncate max-w-[200px]">Restaurant Name</Label>
          <span className={cn("text-[10px] tabular-nums", restaurant.name.length >= MAX_LIMITS.NAME ? "text-destructive font-medium" : "text-muted-foreground")}>
            {restaurant.name.length}/{MAX_LIMITS.NAME}
          </span>
        </div>
        <Input
          value={restaurant.name}
          maxLength={MAX_LIMITS.NAME}
          onChange={(e) => update({ name: e.target.value })}
          className="bg-muted/50 truncate"
          placeholder="Enter restaurant name"
        />
      </div>

      {/* Tagline Input */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="truncate max-w-[200px]">Tagline</Label>
          <span className={cn("text-[10px] tabular-nums", (restaurant.tagline?.length || 0) >= MAX_LIMITS.TAGLINE ? "text-destructive font-medium" : "text-muted-foreground")}>
            {restaurant.tagline?.length || 0}/{MAX_LIMITS.TAGLINE}
          </span>
        </div>
        <Input
          value={restaurant.tagline || ""}
          maxLength={MAX_LIMITS.TAGLINE}
          onChange={(e) => update({ tagline: e.target.value })}
          className="bg-muted/50 truncate"
          placeholder="e.g. Traditional Italian Cuisine"
        />
      </div>

      {/* Logo Section */}
      <div className="space-y-2">
        <Label>Logo</Label>
        {isLogoAvailable && (
          <div className="flex items-center gap-3 mb-2 bg-muted/30 p-2 rounded-xl border border-border/40">
            <img src={restaurant.logo_url} alt="Logo" className="w-12 h-12 rounded-lg object-cover" />
            <Button size="sm" variant="ghost" className="text-destructive h-8" onClick={() => update({ logo_url: "", show_qr_logo: false })}>
              <X className="w-3 h-3 mr-1" /> Remove
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <label className="flex-1 flex items-center justify-center gap-2 cursor-pointer bg-muted/50 border border-input rounded-md py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Upload className="w-4 h-4" />
            <span>Upload</span>
            <input type="file" accept="image/*" onChange={onLogoUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Toggle Settings */}
      <div className="border-t border-border/30 pt-4 mt-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Display Settings</p>
        <div className="space-y-4">
          {[
            { key: "show_veg_filter", label: "Veg/Non-Veg Filter", desc: "Dietary toggles for users", def: false },
            { key: "show_sold_out", label: "Sold Out Items", desc: "Display unavailable menu items", def: true },
            { key: "show_search", label: "Menu Search", desc: "Allow item name search", def: false },
            { 
              key: "show_qr_logo", 
              label: "Logo in QR", 
              desc: isLogoAvailable ? "Embed logo inside QR" : "Upload logo to enable",
              disabled: !isLogoAvailable,
              def: true 
            },
          ].map((item) => (
            <div key={item.key} className={cn("flex items-center justify-between", item.disabled && "opacity-40 transition-opacity")}>
              <div className="max-w-[75%]"> {/* Clamps text so switch doesn't move */}
                <Label className={cn("text-sm block truncate", !item.disabled && "cursor-pointer")} htmlFor={item.key}>
                  {item.label}
                </Label>
                <p className="text-[10px] text-muted-foreground truncate">{item.desc}</p>
              </div>
              <Switch
                id={item.key}
                disabled={item.disabled}
                checked={item.disabled ? false : (restaurant[item.key as keyof RestaurantInfo] ?? item.def)}
                onCheckedChange={(v) => update({ [item.key]: v })}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
