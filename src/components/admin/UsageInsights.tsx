import { useState, useEffect } from "react";
import { Loader2, Database, Zap, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchAdminUsage } from "@/lib/database";
import { Label } from "@/components/ui/label";

export const UsageInsights = ({ restaurantId }: { restaurantId: string }) => {
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const data = await fetchAdminUsage(restaurantId);
        setUsage(data);
      } catch (err) {
        console.error("Usage fetch failed:", err);
      } finally {
        setLoading(false);
      }
    }
    if (restaurantId) loadStats();
  }, [restaurantId]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 bg-muted/5 rounded-xl border border-dashed">
      <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
      <p className="text-xs text-muted-foreground mt-2 font-medium">Loading metrics...</p>
    </div>
  );

  return (
    <div className="space-y-6 mt-4 animate-in fade-in slide-in-from-bottom-2">
      {/* 7-Day Chart Section */}
      <div className="space-y-3">
        <div className="flex justify-between items-end px-1">
          <div>
            <Label className="text-sm font-bold flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" /> Recent Activity
            </Label>
            <p className="text-[10px] text-muted-foreground">Menu scans (Last 7 days)</p>
          </div>
        </div>

        <div className="bg-muted/20 p-4 rounded-xl border border-border/40 flex justify-between items-end h-28 gap-2">
          {Array.from({ length: 7 }).map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
            const count = usage?.weekly_data_obj?.[dayLabel] ?? 0;
            const isToday = i === 6;

            return (
              <div key={dayLabel} className="flex flex-col items-center gap-2 flex-1 group">
                <div 
                  className={cn(
                    "w-full rounded-t-sm transition-all relative group-hover:brightness-110",
                    count > 0 ? "bg-primary" : "bg-muted/40",
                    isToday && "ring-2 ring-primary/20 ring-offset-1 ring-offset-background"
                  )} 
                  style={{ height: `${Math.max((count / 50) * 100, 4)}%` }} // Scaled to 50 max
                >
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-slate-900 text-white px-1.5 py-0.5 rounded shadow-xl">
                    {count} scans
                  </span>
                </div>
                <span className={cn("text-[8px] font-bold uppercase", isToday ? "text-primary" : "text-muted-foreground/60")}>
                  {dayLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resource Usage - One by One (Full Width) */}
      <div className="space-y-3">
        <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">System Resources</Label>
        
        {/* Storage */}
        <div className="p-4 bg-muted/20 rounded-xl border border-border/40 hover:bg-muted/30 transition-colors">
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-xs font-semibold flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-primary" /> Media Storage
            </span>
            <span className="text-xs font-bold text-primary">
              {(usage?.storage_mb || 0).toFixed(1)} <span className="text-[10px] text-muted-foreground">/ 512 MB</span>
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="bg-primary h-full transition-all duration-1000" 
              style={{ width: `${Math.min(((usage?.storage_mb || 0) / 512) * 100, 100)}%` }} 
            />
          </div>
        </div>

        {/* Traffic */}
        <div className="p-4 bg-muted/20 rounded-xl border border-border/40 hover:bg-muted/30 transition-colors">
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-xs font-semibold flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-blue-500" /> Network Traffic
            </span>
            <span className="text-xs font-bold text-blue-500">
              {(usage?.egress_gb || 0).toFixed(2)} <span className="text-[10px] text-muted-foreground">/ 5.0 GB</span>
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="bg-blue-500 h-full transition-all duration-1000 shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
              style={{ width: `${Math.min(((usage?.egress_gb || 0) / 5) * 100, 100)}%` }} 
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 italic">* Usage resets monthly</p>
        </div>
      </div>
    </div>
  );
};
