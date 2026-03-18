import { useState, useEffect } from "react";
import { Loader2, Database, Zap, Globe, Info, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchAdminUsage } from "@/lib/database";
import { Label } from "@/components/ui/label";

interface Props {
  restaurantId: string;
}

const UsageInsights = ({ restaurantId }: Props) => {
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const data = await fetchAdminUsage(restaurantId);
        setUsage(data);
      } catch (err) {
        if (import.meta.env.DEV) console.error("Usage Insights Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    }
    if (restaurantId) loadStats();
  }, [restaurantId]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 bg-muted/5 rounded-xl border border-dashed border-border/40">
      <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
      <p className="text-[10px] text-muted-foreground mt-2 font-medium uppercase tracking-widest text-center">Gathering Metrics...</p>
    </div>
  );

  const storagePct = Math.min(((usage?.storage_mb || 0) / 512) * 100, 100);
  const trafficPct = Math.min(((usage?.egress_gb || 0) / 5) * 100, 100);

  const weeklyData = usage?.weekly_data_obj || {};
  const maxCount = Math.max(...Object.values(weeklyData).map(Number), 10);

  return (
    <div className="space-y-6 mt-2 pb-4 animate-in fade-in duration-500">
      {/* 7-Day Activity Section */}
      <div className="space-y-3">
        <div className="px-1 text-left">
          <Label className="text-sm font-bold flex items-center gap-2 text-foreground">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" /> Recent Reach
          </Label>
          <p className="text-[10px] text-muted-foreground">How many people looked at your menu in the last 7 days.</p>
        </div>

        <div className="bg-muted/30 p-4 rounded-xl border border-border/40 flex justify-between items-end h-32 gap-1 shadow-inner relative" 
          onMouseLeave={() => setSelectedDay(null)}>
          {Array.from({ length: 7 }).map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
            
            const count = usage?.weekly_data_obj?.[dayLabel] ?? 0;
            const isToday = i === 6;
            const isSelected = selectedDay === dayLabel;
            const barHeight = (count / maxCount) * 100;

            return (
              <div 
                key={dayLabel} 
                className="flex flex-col items-center gap-2 flex-1 h-full cursor-pointer group"
                onClick={() => setSelectedDay(isSelected ? null : dayLabel)}
              >
                <div className="relative w-full flex-1 flex items-end justify-center">
                  {/* The Bar - Professional Rectangular Shape */}
                  <div 
                    className={cn(
                      "w-full max-w-[16px] sm:max-w-[28px] transition-all duration-500 ease-out",
                      count > 0 ? "bg-primary/80" : "bg-muted-foreground/10",
                      isToday && "bg-primary",
                      // No color change on selection for the bar itself per your request
                    )} 
                    style={{ height: `${Math.max(barHeight, 6)}%` }} 
                  />
                  
                  {/* Tooltip - Always centered above bar */}
                  <div className={cn(
                    "absolute -top-10 transition-all z-20 pointer-events-none",
                    isSelected || "group-hover:scale-100 scale-0",
                    isSelected && "scale-105"
                  )}>
                    <div className="bg-slate-900 text-white text-[9px] font-bold px-2 py-1 rounded shadow-2xl border border-white/10 whitespace-nowrap">
                       {count.toLocaleString()} scans
                    </div>
                  </div>
                </div>
                
                {/* Day Label - Turns White when selected */}
                <span className={cn(
                  "text-[9px] font-bold uppercase transition-colors duration-300", 
                  isSelected ? "text-white" : (isToday ? "text-primary" : "text-muted-foreground/40")
                )}>
                  {dayLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resource Metrics */}
      <div className="space-y-4">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Cloud Resources</Label>
        
        {/* Storage Bar */}
        <div className="group relative p-4 bg-muted/20 rounded-xl border border-border/40 transition-colors hover:bg-muted/30">
          <div className="absolute bottom-full left-0 mb-2 w-full max-w-[220px] scale-0 group-hover:scale-100 transition-all z-30 bg-slate-900 text-white p-3 rounded-lg text-[10px] border border-white/10 shadow-2xl pointer-events-none">
              <p className="font-bold text-primary mb-1 uppercase flex items-center gap-1">
                <Lightbulb className="w-3 h-3 text-amber-400" /> Maintenance Tip
              </p>
              <p className="opacity-90 leading-relaxed">
                Delete unused menu items or old photos to keep this space free.
              </p>
          </div>

          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-semibold flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" /> Menu & Photos Storage
            </span>
            <span className="text-xs font-bold tabular-nums text-primary">
              {storagePct.toFixed(1)}%
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mb-3 px-0.5">Space used by your menu items and photos on the cloud.</p>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className="bg-primary h-full transition-all duration-1000" style={{ width: `${storagePct}%` }} />
          </div>
          <p className="mt-2 text-[9px] font-medium text-muted-foreground/70 tabular-nums">
            Used: {(usage?.storage_mb || 0).toFixed(1)} MB / 512 MB
          </p>
        </div>

        {/* Traffic Bar */}
        <div className="group relative p-4 bg-muted/20 rounded-xl border border-border/40 transition-colors hover:bg-muted/30">
          <div className="absolute bottom-full left-0 mb-2 w-full max-w-[220px] scale-0 group-hover:scale-100 transition-all z-30 bg-slate-900 text-white p-3 rounded-lg text-[10px] border border-white/10 shadow-2xl pointer-events-none">
              <p className="font-bold text-blue-400 mb-1 uppercase flex items-center gap-1">
                <Lightbulb className="w-3 h-3 text-amber-400" /> Speed Tip
              </p>
              <p className="opacity-90 leading-relaxed">
                Optimized images help your menu load faster on customers' phones.
              </p>
          </div>

          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-500" /> Monthly Traffic
            </span>
            <span className="text-xs font-bold text-blue-500 tabular-nums">
              {trafficPct.toFixed(1)}%
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mb-3 px-0.5">Data used when customers scan and browse your menu.</p>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${trafficPct}%` }} />
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-[9px] font-medium text-muted-foreground/70 tabular-nums">
              Approx: {(usage?.egress_gb || 0).toFixed(2)} GB / 5 GB
            </p>
            <span className="text-[8px] text-muted-foreground/50 italic flex items-center gap-1">
              <Info className="w-3 h-3" /> Resets 1st of month
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsageInsights;
