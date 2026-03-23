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
  aspect?: "video" | "square" | "logo"; // Added logo option
}

export const ImageUploader = ({ 
  value, 
  onUrlChange, 
  onFileSelect, 
  isUploading, 
  label, 
  aspect = "video" 
}: ImageUploaderProps) => {
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [tempUrl, setTempUrl] = useState("");

  const handleApplyUrl = () => {
    if (tempUrl.trim()) {
      onUrlChange(tempUrl.trim());
      setTempUrl("");
    }
  };

  // Helper to determine aspect ratio classes
  const getAspectClass = () => {
    if (aspect === "video") return "aspect-video";
    if (aspect === "square" || aspect === "logo") return "aspect-square max-w-[150px]"; // Constrain logo size
    return "aspect-video";
  };

  return (
    <div className="space-y-3">
      <Label className="text-[11px] font-bold uppercase tracking-widest text-primary/70 px-0.5">
        {label}
      </Label>
      
      {value ? (
        <div className={cn(
          "relative rounded-2xl overflow-hidden bg-muted border border-border shadow-sm group",
          getAspectClass()
        )}>
          {/* Image Preview */}
          <img 
            src={value} 
            alt="Preview" 
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              isUploading ? "opacity-40" : "opacity-100"
            )} 
          />

          {/* Professional Top-Right Remove Button */}
          {!isUploading && (
            <button
              type="button"
              onClick={() => onUrlChange("")}
              className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500 text-white rounded-full transition-colors shadow-lg z-10"
              title="Remove image"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Centered Loading Spinner - Overlayed without blur */}
          {isUploading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/20">
              <div className="p-3 bg-background/80 rounded-full shadow-xl backdrop-blur-sm">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
              <span className="text-[10px] font-bold mt-2 text-primary uppercase tracking-tighter">Uploading...</span>
            </div>
          )}
        </div>
      ) : (
        /* Empty State / Input Controls */
        <div className="bg-muted/20 rounded-2xl border border-border/40 p-1">
          <div className="flex p-1 bg-muted/60 rounded-xl mb-1">
            <button 
              type="button" 
              onClick={() => setMode("upload")} 
              className={cn(
                "flex-1 py-2 text-[10px] font-bold rounded-lg transition-all", 
                mode === "upload" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"
              )}
            >
              UPLOAD
            </button>
            <button 
              type="button" 
              onClick={() => setMode("url")} 
              className={cn(
                "flex-1 py-2 text-[10px] font-bold rounded-lg transition-all", 
                mode === "url" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"
              )}
            >
              IMAGE URL
            </button>
          </div>

          <div className="p-1">
            {mode === "upload" ? (
              <label className={cn(
                "flex flex-col items-center justify-center py-10 border-2 border-dashed rounded-xl cursor-pointer transition-all", 
                isUploading ? "opacity-50 cursor-not-allowed" : "hover:bg-background/50 hover:border-primary/30"
              )}>
                {isUploading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/40 mb-2" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-muted-foreground/30 mb-2" />
                )}
                <span className="text-xs font-semibold">
                  {isUploading ? "Uploading..." : "Click to upload"}
                </span>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])} 
                  disabled={isUploading} 
                />
              </label>
            ) : (
              <div className="flex gap-2 p-1">
                <Input 
                  value={tempUrl} 
                  onChange={(e) => setTempUrl(e.target.value)} 
                  placeholder="Paste image link..." 
                  className="h-10 text-xs bg-background/50" 
                  disabled={isUploading}
                />
                <Button 
                  type="button"
                  size="sm" 
                  onClick={handleApplyUrl} 
                  disabled={!tempUrl.trim() || isUploading}
                >
                  Apply
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
