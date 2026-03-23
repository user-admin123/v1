import React, { useState } from "react";
import { Upload, Link as LinkIcon, X, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  value: string;
  onUrlChange: (url: string) => void;
  onFileSelect: (file: File) => Promise<void>;
  isUploading: boolean;
  label: string;
  aspect?: "video" | "square";
}

export const ImageUploader = ({ value, onUrlChange, onFileSelect, isUploading, label, aspect = "video" }: ImageUploaderProps) => {
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [tempUrl, setTempUrl] = useState("");

  const handleApplyUrl = () => {
    if (tempUrl.trim()) {
      onUrlChange(tempUrl.trim());
      setTempUrl("");
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 px-0.5">{label}</Label>
      
      {value ? (
        <div className={cn(
          "relative rounded-2xl overflow-hidden bg-muted border-2 border-background shadow-md group",
          aspect === "video" ? "aspect-video" : "aspect-square"
        )}>
          <img src={value} alt="Preview" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
           <Button 
  type="button" // Add this
  variant="destructive" 
  size="sm" 
  className="rounded-full h-9 shadow-xl" 
  onClick={() => onUrlChange("")} 
  disabled={isUploading}
>
  <X className="w-4 h-4 mr-2" /> Remove Image
</Button>
          </div>
          {isUploading && (
            <div className="absolute inset-0 bg-background/60 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-muted/20 rounded-2xl border border-border/40 p-1">
          <div className="flex p-1 bg-muted/60 rounded-xl mb-1">
            <button type="button" onClick={() => setMode("upload")} className={cn("flex-1 py-2 text-[10px] font-bold rounded-lg transition-all", mode === "upload" ? "bg-background shadow-sm text-primary" : "text-muted-foreground")}>UPLOAD</button>
            <button type="button" onClick={() => setMode("url")} className={cn("flex-1 py-2 text-[10px] font-bold rounded-lg transition-all", mode === "url" ? "bg-background shadow-sm text-primary" : "text-muted-foreground")}>IMAGE URL</button>
          </div>
          <div className="p-1">
            {mode === "upload" ? (
              <label className={cn("flex flex-col items-center justify-center py-10 border-2 border-dashed rounded-xl cursor-pointer transition-all", isUploading ? "opacity-50 cursor-not-allowed" : "hover:bg-background/50 hover:border-primary/30")}>
                <ImageIcon className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <span className="text-xs font-semibold">Click to upload</span>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])} disabled={isUploading} />
              </label>
            ) : (
              <div className="flex gap-2 p-1">
                <Input value={tempUrl} onChange={(e) => setTempUrl(e.target.value)} placeholder="Paste image link..." className="h-10 text-xs bg-background/50" />
                <Button size="sm" onClick={handleApplyUrl} disabled={!tempUrl.trim()}>Apply</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
