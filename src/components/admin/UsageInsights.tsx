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

  return (
    <div className="space-y-6 mt-2 pb-4 animate-in fade-in duration-500">
      {/* 7-Day Activity Section */}
      <div className="space-y-3">
        <div className="px-1">
          <Label className="text-sm font-bold flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" /> Recent Reach
          </Label>
          <p className="text-[10px] text-muted-foreground">Unique menu scans over the last 7 days</p>
        </div>

        <div className="bg-muted/30 p-4 rounded-xl border border-border/40 flex justify-between items-end h-32 gap-2 shadow-inner">
          {Array.from({ length: 7 }).map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
            const count = usage?.weekly_data_obj?.[dayLabel] ?? 0;
            const isToday = i === 6;
            // Bar maxes at 50 for visual logic, but allows any number
            const barHeight = Math.min((count / 50) * 100, 100);

            return (
              <div key={dayLabel} className="flex flex-col items-center gap-2 flex-1 group relative">
                <div className="w-full relative flex items-end justify-center h-full">
                  <div 
                    className={cn(
                      "w-full rounded-t-md transition-all duration-500",
                      count > 0 ? "bg-primary/80" : "bg-muted-foreground/10",
                      isToday && "bg-primary ring-2 ring-primary/20"
                    )} 
                    style={{ height: `${Math.max(barHeight, 5)}%` }}
                  />
                  <span className="absolute -top-8 scale-0 group-hover:scale-100 transition-all text-[9px] font-bold bg-slate-900 text-white px-2 py-1 rounded shadow-xl z-20 whitespace-nowrap border border-white/10">
                    {count.toLocaleString()} scans
                  </span>
                </div>
                <span className={cn("text-[8px] sm:text-[9px] font-bold uppercase", isToday ? "text-primary" : "text-muted-foreground/50")}>
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
               <Lightbulb className="w-3 h-3 text-amber-400" /> Storage Tip
             </p>
             <p className="opacity-90 leading-relaxed">
               Keep storage low by removing unused items. <br/>
               Used: <span className="text-primary font-bold">{(usage?.storage_mb || 0).toFixed(2)}MB</span> / 512MB
             </p>
          </div>

          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" /> Assets Storage <Info className="w-3 h-3 opacity-40" />
            </span>
            <span className="text-xs font-bold tabular-nums text-primary">
              {storagePct.toFixed(1)}%
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className="bg-primary h-full transition-all duration-1000" style={{ width: `${storagePct}%` }} />
          </div>
        </div>

        {/* Traffic Bar */}
        <div className="group relative p-4 bg-muted/20 rounded-xl border border-border/40 transition-colors hover:bg-muted/30">
          <div className="absolute bottom-full left-0 mb-2 w-full max-w-[220px] scale-0 group-hover:scale-100 transition-all z-30 bg-slate-900 text-white p-3 rounded-lg text-[10px] border border-white/10 shadow-2xl pointer-events-none">
             <p className="font-bold text-blue-400 mb-1 uppercase flex items-center gap-1">
               <Lightbulb className="w-3 h-3 text-amber-400" /> Traffic Tip
             </p>
             <p className="opacity-90 leading-relaxed">
               Optimized images allow more scans per month. <br/>
               Used: <span className="text-blue-400 font-bold">{(usage?.egress_gb || 0).toFixed(3)}GB</span> / 5GB
             </p>
          </div>

          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-500" /> Monthly Bandwidth <Info className="w-3 h-3 opacity-40" />
            </span>
            <span className="text-xs font-bold text-blue-500 tabular-nums">
              {trafficPct.toFixed(1)}%
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${trafficPct}%` }} />
          </div>
          <p className="mt-3 text-[9px] text-muted-foreground italic flex items-center gap-1 opacity-70">
            <Info className="w-3 h-3" /> Resets on the 1st of every month
          </p>
        </div>
      </div>
    </div>
  );
};

export default UsageInsights;
