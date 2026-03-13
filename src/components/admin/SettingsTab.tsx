import { RestaurantInfo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Upload, X, Info, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { fetchAdminUsage } from "@/lib/database";

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
  // --- ADMIN USAGE INTEGRATION ---
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const data = await fetchAdminUsage(restaurant.id);
        setUsage(data);
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error("Admin Usage Dashboard Fetch Error:", err);
        }
      } finally {
        setLoading(false);
      }
    }
    if (restaurant.id) loadStats();
  }, [restaurant.id]);

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

      {/* Logo Section - RESTORED ORIGINAL LOGIC */}
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

      {/* --- PRODUCTION INSIGHTS DASHBOARD --- */}
      <div className="border-t border-border/30 pt-6 mt-6 space-y-4">
        <div className="flex justify-between items-end px-0.5">
          <div>
            <Label className="text-sm font-bold">Insights</Label>
            <p className="text-[10px] text-muted-foreground font-medium">Daily scans (Last 7 days)</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 bg-muted/5 rounded-xl border border-dashed border-border/40">
            <Loader2 className="w-5 h-5 animate-spin text-primary/40" />
          </div>
        ) : (
          <>
            <div className="bg-muted/20 p-3 rounded-xl border border-border/40 shadow-inner">
              <div className="flex justify-between items-center px-1">
                {Array.from({ length: 7 }).map((_, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() - (6 - i)); 
                  const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
                  const count = usage?.weekly_data_obj?.[dayLabel] ?? 0;
                  const isToday = i === 6;

                  return (
                    <div key={dayLabel} className="group relative flex flex-col items-center gap-1">
                      <div className="absolute -top-8 scale-0 group-hover:scale-100 transition-all z-10 bg-slate-900 text-white text-[9px] px-2 py-1 rounded-md shadow-xl border border-white/10">
                        {count} scans
                      </div>
                      <span className={cn("text-[8px] font-bold uppercase", isToday ? "text-primary" : "text-muted-foreground/60")}>
                        {dayLabel}
                      </span>
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all",
                        count > 0 ? "bg-green-500/10 text-green-600 border-green-500/20 shadow-sm" : "border-dashed border-muted-foreground/10 text-muted-foreground/20",
                        isToday && "ring-2 ring-primary/30 ring-offset-1 ring-offset-background"
                      )}>
                        {count}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Storage with Owner Tips */}
              <div className="group relative bg-muted/20 p-3 rounded-xl border border-border/40 hover:bg-muted/30 transition-colors">
                <div className="absolute bottom-full left-0 mb-2 w-56 scale-0 group-hover:scale-100 transition-all z-20 bg-slate-900 text-white p-3 rounded-lg text-[9px] border border-white/10 shadow-2xl">
                  <p className="font-bold text-primary mb-1 uppercase flex items-center gap-1">
                    <Lightbulb className="w-3 h-3 text-amber-400" /> Storage Tip
                  </p>
                  <p className="leading-relaxed opacity-90">
                    Keep your storage low by removing unused menu items. Current: {(usage?.storage_mb || 0).toFixed(2)}MB/512MB
                  </p>
                </div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[9px] font-bold uppercase text-muted-foreground/70 flex items-center gap-1">
                    Storage <Info className="w-3 h-3 text-primary" />
                  </span>
                  <span className="text-[10px] font-bold text-primary">
                    {Math.min(((usage?.storage_mb || 0) / 512) * 100, 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-700" 
                    style={{ width: `${Math.min(((usage?.storage_mb || 0) / 512) * 100, 100)}%` }} 
                  />
                </div>
              </div>

              {/* Traffic with Owner Tips */}
              <div className="group relative bg-muted/20 p-3 rounded-xl border border-border/40 hover:bg-muted/30 transition-colors">
                <div className="absolute bottom-full right-0 mb-2 w-56 scale-0 group-hover:scale-100 transition-all z-20 bg-slate-900 text-white p-3 rounded-lg text-[9px] border border-white/10 shadow-2xl text-right">
                  <p className="font-bold text-blue-400 mb-1 uppercase flex items-center justify-end gap-1">
                    Traffic Tip <Lightbulb className="w-3 h-3 text-amber-400" />
                  </p>
                  <p className="leading-relaxed opacity-90">
                    Using compressed and low size images allows more scans every month. Current: {(usage?.egress_gb || 0).toFixed(3)}GB/5GB
                  </p>
                </div>
                <div className="flex justify-between items-center mb-1.5">
                   <span className="text-[10px] font-bold text-blue-500">
                    {Math.min(((usage?.egress_gb || 0) / 5) * 100, 100).toFixed(1)}%
                   </span>
                   <span className="text-[9px] font-bold uppercase text-muted-foreground/70 flex items-center gap-1">
                    <Info className="w-3 h-3 text-blue-500" /> Traffic
                  </span>
                </div>
                <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-500 h-full transition-all duration-700" 
                    style={{ width: `${Math.min(((usage?.egress_gb || 0) / 5) * 100, 100)}%` }} 
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SettingsTab;
