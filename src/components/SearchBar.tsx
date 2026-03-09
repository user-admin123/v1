import { useState, useRef, useEffect } from "react";
import { MenuItem, ItemType } from "@/lib/types";
import { Search, X } from "lucide-react";
import VegBadge from "@/components/VegBadge";
import { cn } from "@/lib/utils";

interface Props {
  items: MenuItem[];
  onSelect: (item: MenuItem) => void;
  vegFilter?: ItemType | "all";
}

const SearchBar = ({ items, onSelect, vegFilter = "all" }: Props) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query.trim().length > 0
    ? items
        .filter((i) => vegFilter === "all" || i.item_type === vegFilter)
        .filter((i) =>
          i.name.toLowerCase().includes(query.toLowerCase()) ||
          i.description.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 8)
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (item: MenuItem) => {
    setQuery("");
    setOpen(false);

    // Scroll to the card and highlight it
    const el = document.getElementById(`menu-item-${item.id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background");
      }, 2000);
    }
  };

  return (
    <div ref={ref} className="relative px-4 py-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search menu items..."
          className="w-full h-10 pl-10 pr-10 rounded-full glass-surface border border-border/30 bg-card/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {query && (
          <button onClick={() => { setQuery(""); setOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute left-4 right-4 top-full mt-1 z-50 glass-card rounded-xl overflow-hidden shadow-xl max-h-64 overflow-y-auto">
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/10 last:border-0",
                !item.available && "opacity-50"
              )}
            >
              <VegBadge type={item.item_type || "veg"} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate font-sans">{item.name}</p>
              </div>
              <span className="text-sm font-semibold text-primary font-sans">${item.price.toFixed(2)}</span>
            </button>
          ))}
        </div>
      )}
      {open && query.trim().length > 0 && filtered.length === 0 && (
        <div className="absolute left-4 right-4 top-full mt-1 z-50 glass-card rounded-xl p-4 text-center text-sm text-muted-foreground shadow-xl">
          No items found for "{query}"
        </div>
      )}
    </div>
  );
};

export default SearchBar;
