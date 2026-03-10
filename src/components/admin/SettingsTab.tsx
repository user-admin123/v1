import { RestaurantInfo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Upload, X } from "lucide-react";

interface Props {
  restaurant: RestaurantInfo;
  onUpdate: (info: RestaurantInfo) => void;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  markChanged: () => void;
}

const SettingsTab = ({ restaurant, onUpdate, onLogoUpload, markChanged }: Props) => {
  const update = (partial: Partial<RestaurantInfo>) => {
    onUpdate({ ...restaurant, ...partial });
    markChanged();
  };

  return (
    <div className="space-y-4 mt-3">
      <div className="space-y-2">
        <Label>Restaurant Name</Label>
        <Input
          value={restaurant.name}
          onChange={(e) => update({ name: e.target.value })}
          className="bg-muted/50"
        />
      </div>
      <div className="space-y-2">
        <Label>Tagline</Label>
        <Input
          value={restaurant.tagline}
          onChange={(e) => update({ tagline: e.target.value })}
          className="bg-muted/50"
        />
      </div>
      <div className="space-y-2">
        <Label>Logo</Label>
        {restaurant.logo_url && (
          <div className="flex items-center gap-3 mb-2">
            <img
              src={restaurant.logo_url}
              alt="Logo preview"
              className="w-16 h-16 rounded-full object-cover border-2 border-border/30"
            />
            <Button size="sm" variant="ghost" onClick={() => update({ logo_url: "" })}>
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
            { key: "show_veg_filter" as const, label: "Show Veg/Non-Veg Filter", desc: "Let customers filter by dietary type", defaultVal: false },
            { key: "show_sold_out" as const, label: "Show Sold Out Items", desc: "Display unavailable items to customers", defaultVal: true },
            { key: "show_search" as const, label: "Enable Menu Search", desc: "Let customers search items by name", defaultVal: false },
            { key: "show_qr_logo" as const, label: "Show Logo in QR Code", desc: "Embed restaurant logo inside QR", defaultVal: true },
          ].map(({ key, label, desc, defaultVal }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <Label className="text-sm">{label}</Label>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch
                checked={restaurant[key] ?? defaultVal}
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
