import { useState, useEffect } from "react";
import { Loader2, Database, Zap, Image, Info, Lightbulb, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
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
        // Fetching directly from your new Admin View
        const { data, error } = await supabase
          .from('admin_usage_dashboard')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .single();

        if (error) throw error;
        setUsage(data);
      } catch (err) {
        console.error("Usage fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    if (restaurantId) loadStats();
  }, [restaurantId]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 bg-muted/5 rounded-xl border border-dashed border-border/40">
      <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
      <p className="text-[10px] text-muted-foreground mt-2 font-medium uppercase tracking-widest">Analyzing Storage...</p>
    </div>
  );

  // Limits based on your Free Plan requirements
  const dbLimit = 512; // 0.5 GB in MB
  const bucketLimit = 1024; // 1 GB in MB

  const dbPct = Math.min(((usage?.storage_db_mb || 0) / dbLimit) * 100, 100);
  const bucketPct = Math.min(((usage?.storage_bucket_mb || 0) / bucketLimit) * 100, 100);

  const weeklyData = usage?.last_7_days_chart || {};
  const maxCount = Math.max(...Object.values(weeklyData).map(Number), 10);

  return (
    <div className="space-y-6 mt-2 pb-4 animate-in fade-in duration-500">
      {/* 1. Midnight Sync Badge */}
      <div className="flex justify-end px-1">
        <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 border border-primary/20 rounded-full">
          <RefreshCcw className="w-3 h-3 text-primary animate-pulse" />
          <span className="text-[9px] font-bold text-primary uppercase tracking-tight">Daily Auto-Clean: 2:00 AM</span>
        </div>
      </div>

      {/* 2. 7-Day Activity Section */}
      <div className="space-y-3">
        <div className="px-1 text-left">
          <Label className="text-sm font-bold flex items-center gap-2 text-foreground">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" /> Customer Reach
          </Label>
          <p className="text-[10px] text-muted-foreground font-medium">Unique menu scans across the last 7 days.</p>
        </div>

        <div className="bg-muted/30 p-4 rounded-xl border border-border/40 flex justify-between items-end h-32 gap-1 shadow-inner relative" 
          onMouseLeave={() => setSelectedDay(null)}>
          {Array.from({ length: 7 }).map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
            
            const count = usage?.last_7_days_chart?.[dayLabel] ?? 0;
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
                  <div 
                    className={cn(
                      "w-full max-w-[16px] sm:max-w-[24px] transition-all duration-500 rounded-t-sm",
                      count > 0 ? "bg-primary/80" : "bg-muted-foreground/10",
                      isToday && "bg-primary",
                      isSelected && "bg-primary brightness-125 scale-x-110"
                    )} 
                    style={{ height: `${Math.max(barHeight, 6)}%` }} 
                  />
                  <div className={cn(
                    "absolute -top-8 transition-all z-20 pointer-events-none",
                    isSelected || "group-hover:scale-100 scale-0",
                    isSelected && "scale-100"
                  )}>
                    <div className="bg-slate-900 text-white text-[9px] font-bold px-2 py-1 rounded shadow-2xl whitespace-nowrap">
                       {count} scans
                    </div>
                  </div>
                </div>
                <span className={cn(
                  "text-[9px] font-bold uppercase", 
                  isToday ? "text-primary" : "text-muted-foreground/40"
                )}>
                  {dayLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Resource Metrics */}
      <div className="space-y-4">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Storage Usage</Label>
        
        {/* Photo Storage (Bucket) */}
        <div className="group relative p-4 bg-muted/20 rounded-xl border border-border/40 transition-colors hover:bg-muted/30">
          <div className="absolute bottom-full left-0 mb-2 w-full max-w-[240px] scale-0 group-hover:scale-100 transition-all z-30 bg-slate-900 text-white p-3 rounded-lg text-[10px] border border-white/10 shadow-2xl pointer-events-none">
              <p className="font-bold text-amber-400 mb-1 uppercase flex items-center gap-1">
                <Lightbulb className="w-3 h-3" /> Photo Manager
              </p>
              <p className="opacity-90 leading-relaxed font-medium">
                Our Janitor removes "orphan" photos every night to keep your space free. To save more, delete items you no longer sell.
              </p>
          </div>

          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold flex items-center gap-2">
              <Image className="w-4 h-4 text-primary" /> Photo Storage
            </span>
            <span className="text-xs font-bold tabular-nums text-primary">
              {bucketPct.toFixed(1)}%
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mb-3 px-0.5 font-medium">Space used by your menu images and logos.</p>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className="bg-primary h-full transition-all duration-1000" style={{ width: `${bucketPct}%` }} />
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-[9px] font-bold text-muted-foreground/70 tabular-nums uppercase">
              Used: {(usage?.storage_bucket_mb || 0).toFixed(1)} MB / 1,024 MB
            </p>
            <span className="text-[8px] text-muted-foreground/50 italic flex items-center gap-1">
              <Info className="w-2.5 h-2.5" /> 1 GB Max
            </span>
          </div>
        </div>

        {/* Database Storage (DB) */}
        <div className="group relative p-4 bg-muted/20 rounded-xl border border-border/40 transition-colors hover:bg-muted/30">
          <div className="absolute bottom-full left-0 mb-2 w-full max-w-[240px] scale-0 group-hover:scale-100 transition-all z-30 bg-slate-900 text-white p-3 rounded-lg text-[10px] border border-white/10 shadow-2xl pointer-events-none">
              <p className="font-bold text-blue-400 mb-1 uppercase flex items-center gap-1">
                <Lightbulb className="w-3 h-3" /> Data Manager
              </p>
              <p className="opacity-90 leading-relaxed font-medium">
                This covers your text settings and prices. It grows very slowly, so you likely won't ever run out of space here!
              </p>
          </div>

          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-500" /> Menu Data (Text)
            </span>
            <span className="text-xs font-bold text-blue-500 tabular-nums">
              {dbPct.toFixed(1)}%
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mb-3 px-0.5 font-medium">Space used by your menu text, prices, and settings.</p>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${dbPct}%` }} />
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-[9px] font-bold text-muted-foreground/70 tabular-nums uppercase">
              Used: {(usage?.storage_db_mb || 0).toFixed(1)} MB / 512 MB
            </p>
            <span className="text-[8px] text-muted-foreground/50 italic flex items-center gap-1">
              <Info className="w-2.5 h-2.5" /> 0.5 GB Max
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsageInsights;
