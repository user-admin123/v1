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
            { key: "show_veg_filter" as const, label: "Show Veg/Non-Veg Filter", desc: "Let customers filter by dietary type" },
            { key: "show_sold_out" as const, label: "Show Sold Out Items", desc: "Display unavailable items to customers" },
            { key: "show_search" as const, label: "Enable Menu Search", desc: "Let customers search items by name" },
            { 
              key: "show_qr_logo" as const, 
              label: "Show Logo in QR Code", 
              desc: isLogoAvailable ? "Embed restaurant logo inside QR" : "Add a logo to enable this",
              disabled: !isLogoAvailable 
            },
          ].map(({ key, label, desc, disabled }) => (
            <div key={key} className={cn("flex items-center justify-between", disabled && "opacity-50 transition-opacity")}>
              <div>
                <Label className={cn("text-sm", !disabled && "cursor-pointer")} htmlFor={key}>{label}</Label>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch
                id={key}
                disabled={disabled}
                checked={disabled ? false : (restaurant[key] ?? false)}
                onCheckedChange={(v) => update({ [key]: v })}
              />
            </div>
          ))}
        </div>
      </div>
      {/* --- SYSTEM INSIGHTS SECTION --- */}
      <div className="border-t border-border/30 pt-6 mt-6 space-y-5">
        <div>
          <Label className="text-base font-bold">App Health & Performance</Label>
          <p className="text-xs text-muted-foreground">Insights and limits for your digital menu</p>
        </div>

        {/* 1. WEEKLY INSIGHTS (Rounded Day-Bubbles) */}
        <div className="bg-muted/30 p-4 rounded-2xl border border-border/50">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Weekly Traffic</span>
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Live Insights</span>
          </div>
          
          <div className="flex justify-between items-center">
            {[
              { d: 'M', v: 45, s: 'yellow' },
              { d: 'T', v: 12, s: 'red' },
              { d: 'W', v: 88, s: 'green' },
              { d: 'T', v: 65, s: 'green' },
              { d: 'F', v: 120, s: 'green' },
              { d: 'S', v: 0, s: 'upcoming' },
              { d: 'S', v: 0, s: 'upcoming' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-medium text-muted-foreground">{item.d}</span>
                <div 
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all border-2",
                    item.s === 'green' && "bg-green-500/10 text-green-600 border-green-500/20",
                    item.s === 'yellow' && "bg-amber-500/10 text-amber-600 border-amber-500/20",
                    item.s === 'red' && "bg-destructive/10 text-destructive border-destructive/20",
                    item.s === 'upcoming' && "bg-transparent text-muted-foreground/20 border-dashed border-muted-foreground/20"
                  )}
                >
                  {item.s !== 'upcoming' ? item.v : ''}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-4 text-center italic">
            Tap a day to see detailed customer interactions
          </p>
        </div>

        {/* 2 & 3. HEALTH BARS (Storage & Egress) */}
        <div className="grid gap-3">
          {/* STORAGE (Menu Capacity) */}
          <div className="bg-muted/30 p-4 rounded-2xl border border-border/50">
            <div className="flex justify-between items-end mb-2">
              <div>
                <Label className="text-xs font-semibold">Menu Capacity</Label>
                <p className="text-[10px] text-muted-foreground">Photos and dish data storage</p>
              </div>
              <span className="text-xs font-bold text-primary">12%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: '12%' }} />
            </div>
          </div>

          {/* EGRESS (Monthly Data Traffic) */}
          <div className="bg-muted/30 p-4 rounded-2xl border border-border/50">
            <div className="flex justify-between items-end mb-2">
              <div>
                <Label className="text-xs font-semibold">Monthly Data Traffic</Label>
                <p className="text-[10px] text-muted-foreground">Data used by customer phones</p>
              </div>
              <span className="text-xs font-bold text-blue-500">5%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: '5%' }} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 flex justify-between">
              <span>Used: 2.4GB</span>
              <span className="font-medium text-foreground">Limit: 50GB Free</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
