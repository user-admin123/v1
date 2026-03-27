import { useEffect, useRef, useState } from "react";
import { Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface Props {
  categories: Category[];
  activeId: string;
  onSelect: (id: string) => void;
}

const CategoryTabs = ({ categories, activeId, onSelect }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsSticky(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Auto-scroll active tab into view
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const activeBtn = container.querySelector(`[data-cat-id="${activeId}"]`) as HTMLElement;
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeId]);

  return (
    <>
      <div ref={sentinelRef} className="h-0" />
      <nav
        className={cn(
          "sticky top-0 z-30 transition-all duration-300",
          isSticky ? "bg-background/80 backdrop-blur-xl shadow-lg border-b border-border/30" : ""
        )}
      >
        <div
          ref={scrollRef}
          className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide"
        >
          {categories.map((cat) => {
            // Determine active state once per item
            const isActive = activeId === cat.id;

            return (
              <button
                key={cat.id}
                data-cat-id={cat.id}
                onClick={() => onSelect(cat.id)}
                className="relative px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors outline-none"
                style={{
                  color: isActive ? "var(--primary-foreground)" : "rgba(255, 255, 255, 0.7)"
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeCategoryTab"
                    className="absolute inset-0 bg-primary rounded-full shadow-sm"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default CategoryTabs;
