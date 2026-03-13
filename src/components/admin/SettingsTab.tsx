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
      {/* --- DYNAMIC SYSTEM INSIGHTS V2 --- */}
      <div className="border-t border-border/30 pt-6 mt-6 space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <Label className="text-sm font-bold">Performance</Label>
            <p className="text-[10px] text-muted-foreground font-medium">Customer interactions this week</p>
          </div>
          
          {/* Pro Navigation: Step-by-Step Back/Forward */}
          <div className="flex bg-muted/50 p-0.5 rounded-lg border border-border/50 shadow-sm">
            <button 
              className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-background rounded-md transition-all active:scale-95"
              onClick={() => {/* logic: weekOffset - 1 */}}
            >
              ← Prev
            </button>
            <div className="w-[1px] h-3 bg-border/50 self-center mx-0.5" />
            <button 
              className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-background rounded-md transition-all active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent"
              disabled={true} // Disabled because we are on "Current Week"
              onClick={() => {/* logic: weekOffset + 1 */}}
            >
              Next →
            </button>
          </div>
        </div>

        {/* 1. DYNAMIC CUSTOMER VISITS (Letter Bubbles) */}
        <div className="bg-muted/20 p-3 rounded-xl border border-border/40">
          <div className="flex justify-between items-center px-1">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
              // DYNAMIC LOGIC: 0=Sun, 1=Mon...6=Sat
              const today = new Date().getDay();
              const currentDayIndex = today === 0 ? 7 : today; 
              const isUpcoming = (i + 1) > currentDayIndex;
              
              const mockValue = isUpcoming ? 0 : Math.floor(Math.random() * 60) + 10; 
              const status = isUpcoming ? 'upcoming' : mockValue > 40 ? 'green' : 'yellow';

              return (
                <div key={i} className="group relative flex flex-col items-center gap-1">
                  {/* Modern Tooltip */}
                  <div className="absolute -top-8 scale-0 group-hover:scale-100 transition-all z-10 bg-slate-900 text-white text-[9px] px-2 py-1 rounded-md font-bold shadow-xl whitespace-nowrap border border-white/10">
                    {isUpcoming ? 'Upcoming' : `${mockValue} visits`}
                  </div>
                  
                  <span className="text-[9px] font-bold text-muted-foreground/60">{day}</span>
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all",
                    status === 'green' && "bg-green-500/10 text-green-600 border-green-500/20 shadow-sm",
                    status === 'yellow' && "bg-amber-500/10 text-amber-600 border-amber-500/20",
                    status === 'upcoming' && "border-dashed border-muted-foreground/10 text-muted-foreground/20"
                  )}>
                    {day}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2 & 3. COMPACT HEALTH BARS WITH UPDATED ADVICE */}
        <div className="grid grid-cols-2 gap-3">
          {/* Storage (512MB) */}
          <div className="group relative bg-muted/20 p-3 rounded-xl border border-border/40 hover:bg-muted/30 transition-colors">
            <div className="absolute bottom-full left-0 mb-2 w-48 scale-0 group-hover:scale-100 transition-all z-20 bg-slate-900 text-white p-2.5 rounded-lg text-[9px] leading-relaxed shadow-2xl border border-white/10">
              <p className="font-bold text-primary mb-1">Menu Capacity ⓘ</p>
              Free 512MB limit. To save space: **Delete old menu items** you no longer use and clear old photos.
            </div>

            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[9px] font-bold uppercase text-muted-foreground/70">Storage</span>
              <span className="text-[10px] font-bold text-primary">12%</span>
            </div>
            <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
              <div className="bg-primary h-full rounded-full" style={{ width: '12%' }} />
            </div>
            <p className="text-[8px] text-muted-foreground mt-1.5 font-medium italic">512MB Free Limit</p>
          </div>

          {/* Traffic (5GB) */}
          <div className="group relative bg-muted/20 p-3 rounded-xl border border-border/40 hover:bg-muted/30 transition-colors">
            <div className="absolute bottom-full right-0 mb-2 w-48 scale-0 group-hover:scale-100 transition-all z-20 bg-slate-900 text-white p-2.5 rounded-lg text-[9px] leading-relaxed shadow-2xl border border-white/10 text-right">
              <p className="font-bold text-blue-400 mb-1 text-right">Visitor Data ⓘ</p>
              Resets monthly. To keep usage low: **Use smaller image files** (compress photos) before uploading.
            </div>

            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-bold text-blue-500">4%</span>
              <span className="text-[9px] font-bold uppercase text-muted-foreground/70 text-right">Traffic</span>
            </div>
            <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: '4%' }} />
            </div>
            <p className="text-[8px] text-muted-foreground mt-1.5 text-right font-medium italic">5GB Monthly Limit</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
