import { useState } from "react";
import { RestaurantInfo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Upload, X, Loader2, Link as LinkIcon, Image as ImageIcon } from "lucide-react"; 
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

      {/* Professional Image Handling Section (Matched to ItemForm UI) */}
      <div className="space-y-3 pt-2 border-t border-border/40">
        <Label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 px-0.5">Restaurant Branding</Label>
        
        {restaurant.logo_url ? (
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-muted border-2 border-background shadow-lg group">
            <img 
              src={restaurant.logo_url} 
              alt="Logo Preview" 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
              <Button 
                type="button" 
                variant="destructive" 
                size="sm" 
                className="h-9 shadow-xl rounded-full px-4"
                onClick={() => { onRemoveLogo(); setUrlInput(""); }}
                disabled={isUploading}
              >
                <X className="w-4 h-4 mr-2" /> Replace Logo
              </Button>
            </div>
            {isUploading && (
              <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse">Processing Image</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3 p-1 bg-muted/30 rounded-2xl border border-border/40">
            {/* Tab Mode Toggles */}
            <div className="flex p-1 bg-muted/60 rounded-xl">
              <button
                type="button"
                onClick={() => setTabMode("upload")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all",
                  tabMode === "upload" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"
                )}
              >
                <Upload className="w-3.5 h-3.5" /> Upload File
              </button>
              <button
                type="button"
                onClick={() => setTabMode("url")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all",
                  tabMode === "url" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"
                )}
              >
                <LinkIcon className="w-3.5 h-3.5" /> Image URL
              </button>
            </div>

            {/* Tab Content */}
            <div className="px-1 pb-1">
              {tabMode === "upload" ? (
                <label className={cn(
                  "flex flex-col items-center justify-center gap-3 cursor-pointer border-2 border-dashed rounded-xl py-10 transition-all",
                  isUploading ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/40 hover:border-primary/30"
                )}>
                  {isUploading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <ImageIcon className="w-6 h-6 text-muted-foreground/60" />}
                  <div className="text-center">
                    <span className="text-xs font-semibold block">Choose branding asset</span>
                    <span className="text-[10px] text-muted-foreground">PNG, JPG or WebP supported</span>
                  </div>
                  <input type="file" accept="image/*" onChange={onLogoUpload} className="hidden" disabled={isUploading} />
                </label>
              ) : (
                <div className="flex flex-col gap-2 p-1">
                  <div className="flex gap-2">
                    <Input 
                      value={urlInput} 
                      onChange={(e) => setUrlInput(e.target.value)} 
                      placeholder="Paste image address (https://...)" 
                      className="text-xs h-10 bg-muted/40 border-muted pl-4"
                      disabled={isUploading}
                    />
                    <Button 
                      size="sm" 
                      onClick={handleUrlApply} 
                      disabled={!urlInput.trim() || isUploading}
                      className="h-10 px-4"
                    >
                      Apply
                    </Button>
                  </div>
                  <p className="text-[9px] text-muted-foreground/60 px-1 italic">* Ensure the link is public and direct to an image file.</p>
                </div>
              )}
            </div>
          </div>
        )}
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
