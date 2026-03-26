import { useState, useEffect } from "react";
import { 
  Loader2, Database, Zap, Image, Info, Lightbulb, 
  RefreshCcw, AlertTriangle, Sparkles, Clock, HardDrive 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchAdminUsage } from "@/lib/database";
import { logger } from "@/lib/logger";
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
        logger.info("UsageInsights: Raw Response", data);
        setUsage(data);
      } catch (err: any) {
        logger.error("UsageInsights: Load failed", err.message || err);
      } finally {
        setLoading(false);
      }
    }
    if (restaurantId) loadStats();
  }, [restaurantId]);

  const formatLastUpdated = (dateString: string) => {
    if (!dateString) return "Syncing...";
    try {
      const date = new Date(dateString);
      return date.toLocaleString(undefined, { 
        day: 'numeric', 
        month: 'short', 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
    } catch (e) {
      return "Updated Recently";
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 bg-muted/5 rounded-xl border border-dashed border-border/40">
      <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
      <p className="text-[10px] text-muted-foreground mt-2 font-medium uppercase tracking-widest">Analyzing Systems...</p>
    </div>
  );

  const dbLimit = 512; 
  const bucketLimit = 1024; 
  const dbUsed = Number(usage?.db_mb ?? 0.01);
  const bucketUsed = Number(usage?.media_mb ?? 0);
  
  const dbPct = Math.min((dbUsed / dbLimit) * 100, 100);
  const bucketPct = Math.min((bucketUsed / bucketLimit) * 100, 100);

  const weeklyData = usage?.weekly_chart || {};
  const counts = Object.values(weeklyData).map(v => Number(v || 0));
  const maxCount = Math.max(...counts, 10);

  const showWarning = dbPct > 90 || bucketPct > 90;

  return (
    <div className="space-y-6 mt-2 pb-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* 1. Global Alert Header */}
      {showWarning && (
        <div className="mx-1 flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg animate-pulse">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <p className="text-[10px] font-bold text-destructive uppercase tracking-tight">
            Storage almost full. Try removing unused old menu items.
          </p>
        </div>
      )}

      {/* 2. Menu Activity Section */}
      <div className="space-y-3">
        <div className="px-1 flex justify-between items-end">
          <div>
            <Label className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" /> Customer Reach
            </Label>
            <p className="text-[10px] text-muted-foreground font-medium">Menu views over the past 7 days, including today.</p>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 bg-secondary/50 rounded-md border border-border/40">
             <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
             </span>
             <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider">Live</span>
          </div>
        </div>

        <div className="bg-muted/30 p-4 rounded-xl border border-border/40 flex justify-between items-end h-32 gap-1 shadow-inner relative" 
          onMouseLeave={() => setSelectedDay(null)}>
          {Array.from({ length: 7 }).map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const dayLabel = days[date.getDay()]; 
            const count = Number(weeklyData[dayLabel] || 0);
            const isToday = i === 6;
            const isSelected = selectedDay === dayLabel;
            const barHeight = count > 0 ? Math.max((count / maxCount) * 100, 12) : 4;

            return (
              <div key={dayLabel} className="flex flex-col items-center gap-2 flex-1 h-full cursor-pointer group" onClick={() => setSelectedDay(isSelected ? null : dayLabel)}>
                <div className="relative w-full flex-1 flex items-end justify-center">
                  <div className={cn("w-full max-w-[16px] sm:max-w-[24px] transition-all duration-500 rounded-t-sm", count > 0 ? "bg-primary/80" : "bg-muted-foreground/10", isToday && count > 0 && "bg-primary", isSelected && "bg-primary brightness-125 scale-x-110")} style={{ height: `${barHeight}%` }} />
                  <div className={cn("absolute -top-8 transition-all z-20 pointer-events-none", (isSelected || "group-hover:scale-100 scale-0"), isSelected && "scale-100")}>
                    <div className="bg-slate-900 text-white text-[9px] font-bold px-2 py-1 rounded shadow-2xl">{count.toLocaleString()} views</div>
                  </div>
                </div>
                <span className={cn("text-[9px] font-bold uppercase", isToday ? "text-primary" : "text-muted-foreground/40")}>{dayLabel}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Resource Metrics */}
      <div className="space-y-4">
        <div className="px-1 flex justify-between items-center">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cloud Resources</Label>
          <div className="flex items-center gap-1.5 text-muted-foreground/40 select-none">
            <Clock className="w-2.5 h-2.5" />
            <span className="text-[9px] font-bold uppercase tabular-nums">Updated: {formatLastUpdated(usage?.last_audit))}</span>
          </div>
        </div>
        
        {/* Gallery Storage */}
        <div className="group relative p-4 bg-muted/20 rounded-xl border border-border/40 transition-colors hover:bg-muted/30">
          <div className="absolute bottom-full left-0 mb-2 w-full max-w-[240px] scale-0 group-hover:scale-100 transition-all z-30 bg-slate-900 text-white p-3 rounded-lg text-[10px] border border-white/10 shadow-2xl pointer-events-none">
              <p className="font-bold text-amber-400 mb-1 uppercase flex items-center gap-1"><Sparkles className="w-3 h-3" /> System Info</p>
              <p className="opacity-90 leading-relaxed font-medium">Images are optimized for fast loading. Unused photos are automatically cleared daily after items are removed.</p>
          </div>

          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold flex items-center gap-2"><Image className="w-4 h-4 text-primary" /> Gallery Storage</span>
            <span className={cn("text-xs font-bold tabular-nums", bucketPct > 90 ? "text-destructive" : "text-primary")}>{bucketPct.toFixed(1)}%</span>
          </div>
          <p className="text-[10px] text-muted-foreground mb-3 px-0.5 font-medium italic">Space used by menu images and restaurant branding.</p>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div className={cn("h-full transition-all duration-1000", bucketPct > 90 ? "bg-destructive" : "bg-primary")} style={{ width: `${bucketPct}%` }} />
          </div>
          <div className="flex justify-between items-center mt-2.5">
            <p className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-tighter tabular-nums flex items-center gap-1.5">
              <HardDrive className="w-2.5 h-2.5" /> {bucketUsed.toFixed(1)} MB / 1,024 MB
            </p>
            {/* Added Info Icon next to Allocation */}
            <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
               <Info className="w-2.5 h-2.5 text-muted-foreground" />
               <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-tight">Allocation: 1GB</span>
            </div>
          </div>
        </div>

        {/* Menu Details */}
        <div className="group relative p-4 bg-muted/20 rounded-xl border border-border/40 transition-colors hover:bg-muted/30">
          <div className="absolute bottom-full left-0 mb-2 w-full max-w-[240px] scale-0 group-hover:scale-100 transition-all z-30 bg-slate-900 text-white p-3 rounded-lg text-[10px] border border-white/10 shadow-2xl pointer-events-none">
              <p className="font-bold text-blue-400 mb-1 uppercase flex items-center gap-1"><Lightbulb className="w-3 h-3" /> Data Info</p>
              <p className="opacity-90 leading-relaxed font-medium">Text storage is highly efficient. Your menu content and settings use very little space.</p>
          </div>

          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold flex items-center gap-2"><Database className="w-4 h-4 text-blue-500" /> Menu Details</span>
            <span className="text-xs font-bold text-blue-500 tabular-nums">{dbPct.toFixed(1)}%</span>
          </div>
          <p className="text-[10px] text-muted-foreground mb-3 px-0.5 font-medium italic">Space used by prices, descriptions, and categories.</p>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${dbPct}%` }} />
          </div>
          <div className="flex justify-between items-center mt-2.5">
            <p className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-tighter tabular-nums flex items-center gap-1.5">
              <HardDrive className="w-2.5 h-2.5 text-blue-500/50" /> {dbUsed.toFixed(1)} MB / 512 MB
            </p>
            {/* Added Info Icon next to Allocation */}
            <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
               <Info className="w-2.5 h-2.5 text-muted-foreground" />
               <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-tight">Allocation: 0.5GB</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsageInsights;
