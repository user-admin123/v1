import { MenuItem, ItemType } from "@/lib/types";
import VegBadge from "@/components/VegBadge";
import { cn } from "@/lib/utils";

interface Props {
  vegFilter: ItemType | "all";
  onFilterChange: (filter: ItemType | "all") => void;
}

const VegFilterBar = ({ vegFilter, onFilterChange }: Props) => (
  <div className="flex gap-2 px-4 py-2 justify-center">
    {(["all", "veg", "nonveg"] as const).map((type) => (
      <button
        key={type}
        onClick={() => onFilterChange(type)}
        className={cn(
          "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all border",
          vegFilter === type
            ? "bg-primary text-primary-foreground border-primary"
            : "glass-surface text-foreground/70 border-border/30 hover:text-foreground"
        )}
      >
        {type === "all" ? "All" : (
          <>
            <VegBadge type={type} size="sm" />
            {type === "veg" ? "Veg" : "Non-Veg"}
          </>
        )}
      </button>
    ))}
  </div>
);

export default VegFilterBar;
