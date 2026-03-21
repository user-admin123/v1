import { useState } from "react";
import { RestaurantInfo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Upload, X, CheckCircle2, Loader2, Link as LinkIcon, Image as ImageIcon } from "lucide-react"; 
import { cn } from "@/lib/utils";

interface Props {
  restaurant: RestaurantInfo;
  isUploading: boolean;
  onUpdate: (info: RestaurantInfo) => void;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveLogo: () => void;
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
  onLogoUpload, 
  onRemoveLogo, 
  markChanged 
}: Props) => {
  const [tabMode, setTabMode] = useState<"upload" | "url">("upload");
  const [urlInput, setUrlInput] = useState(restaurant.logo_url || "");

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

  const handleUrlApply = () => {
    if (urlInput.trim()) {
      update({ logo_url: urlInput.trim() });
    }
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
      </div>

      {/* Branding Section */}
      <div className="space-y-4 pt-2">
        <Label className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground/70 px-0.5">Branding & Logo</Label>
        
        <div className="grid gap-4">
          {/* Active Logo Preview */}
          {restaurant.logo_url && (
            <div className="flex items-center gap-4 p-3 bg-secondary/10 rounded-2xl border border-border/50 backdrop-blur-sm group">
              <div className="relative">
                <img src={restaurant.logo_url} alt="Logo" className="w-16 h-16 rounded-full object-cover border-2 border-background shadow-md" />
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-full">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase text-muted-foreground/50">Active Logo</p>
                <Button
                  size="sm" variant="ghost" type="button"
                  className="h-7 px-2 text-[11px] text-destructive hover:bg-destructive/10 -ml-2"
                  onClick={() => { onRemoveLogo(); setUrlInput(""); }}
                  disabled={isUploading}
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Remove Logo
                </Button>
              </div>
            </div>
          )}

          {/* Tab Selection */}
          <div className="flex flex-col gap-3 p-1 bg-muted/20 rounded-2xl border border-border/40">
            <div className="flex p-1 bg-muted/50 rounded-xl">
              <button
                type="button"
                onClick={() => setTabMode("upload")}
                className={cn("flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2",
                  tabMode === "upload" ? "bg-background shadow-sm text-primary" : "text-muted-foreground")}
              >
                <Upload className="w-3 h-3" /> Upload
              </button>
              <button
                type="button"
                onClick={() => setTabMode("url")}
                className={cn("flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2",
                  tabMode === "url" ? "bg-background shadow-sm text-primary" : "text-muted-foreground")}
              >
                <LinkIcon className="w-3 h-3" /> URL
              </button>
            </div>

            <div className="px-1 pb-1">
              {tabMode === "upload" ? (
                <label className={cn("flex flex-col items-center justify-center gap-3 cursor-pointer border-2 border-dashed rounded-xl py-8 transition-all", 
                  isUploading ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/40 hover:border-primary/30")}>
                  {isUploading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <ImageIcon className="w-6 h-6 text-muted-foreground/60" />}
                  <div className="text-center">
                    <span className="text-xs font-semibold block">{isUploading ? "Uploading..." : "Select Logo File"}</span>
                    <span className="text-[10px] text-muted-foreground">PNG, JPG or WebP</span>
                  </div>
                  <input type="file" accept="image/*" onChange={onLogoUpload} className="hidden" disabled={isUploading} />
                </label>
              ) : (
                <div className="p-2 space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                      <Input
                        disabled={isUploading}
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        className="bg-muted/30 text-xs h-10 pl-9 focus:bg-background transition-all"
                        placeholder="Paste image URL (https://...)"
                      />
                    </div>
                    <Button 
                      type="button" 
                      size="sm" 
                      onClick={handleUrlApply} 
                      disabled={!urlInput.trim() || isUploading}
                      className="h-10"
                    >
                      Apply
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 px-1 italic">
                    * Ensure the link is public and direct to an image file.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
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
