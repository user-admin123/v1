import { useState, useEffect, useRef, useCallback } from "react";
import { useMenuData } from "@/hooks/useMenuData";
import { useCart } from "@/hooks/useCart";
import RestaurantHeader from "@/components/RestaurantHeader";
import CategoryTabs from "@/components/CategoryTabs";
import MenuItemCard from "@/components/MenuItemCard";
import ItemDetailDrawer from "@/components/ItemDetailDrawer";
import LoginModal from "@/components/LoginModal";
import AdminPanel from "@/components/AdminPanel";
import SearchBar from "@/components/SearchBar";
import OrderSummaryDrawer from "@/components/OrderSummaryDrawer";
import VegFilterBar from "@/components/menu/VegFilterBar";
import FloatingOrderButton from "@/components/menu/FloatingOrderButton";
import { MenuItem, ItemType } from "@/lib/types";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const {
    categories, items, restaurant, authed, login, logout,
    loading, error, updateCategories, updateItems, updateRestaurant, saveAll, refresh,
  } = useMenuData();
  const { cartItems, totalItems, totalPrice, addItem, removeItem, getQuantity, clearCart } = useCart(items);

  const [activeCat, setActiveCat] = useState("");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [vegFilter, setVegFilter] = useState<ItemType | "all">("all");
  const [orderOpen, setOrderOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const isManualScroll = useRef(false);

  // Filtered items per category
  const getItemsForCategory = useCallback(
    (catId: string) =>
      items
        .filter((i) => i.category_id === catId)
        .filter((i) => vegFilter === "all" || i.item_type === vegFilter)
        .filter((i) => restaurant.show_sold_out !== false || i.available)
        .sort((a, b) => (a.available === b.available ? 0 : a.available ? -1 : 1)),
    [items, vegFilter, restaurant.show_sold_out]
  );

  const visibleCategories = categories.filter((cat) => getItemsForCategory(cat.id).length > 0);

  // Set initial active category
  useEffect(() => {
    if (visibleCategories.length > 0 && !visibleCategories.find((c) => c.id === activeCat)) {
      setActiveCat(visibleCategories[0].id);
    }
  }, [visibleCategories, activeCat]);

  // Scroll-based category highlighting
  useEffect(() => {
    const handleScroll = () => {
      if (isManualScroll.current) return;
      const scrollTop = window.scrollY + 120;
      let currentCat = visibleCategories[0]?.id || "";
      for (const cat of visibleCategories) {
        const el = sectionRefs.current[cat.id];
        if (el && el.offsetTop <= scrollTop) currentCat = cat.id;
      }
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 50) {
        currentCat = visibleCategories[visibleCategories.length - 1]?.id || currentCat;
      }
      setActiveCat(currentCat);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [visibleCategories]);

  const scrollToCategory = useCallback((id: string) => {
    isManualScroll.current = true;
    setActiveCat(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => { isManualScroll.current = false; }, 800);
  }, []);

  const allVisibleItems = items.filter((i) => restaurant.show_sold_out !== false || i.available);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground text-sm font-medium">Loading menu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <span className="text-2xl">⚠️</span>
        </div>
        <h2 className="text-lg font-semibold text-foreground">We'll be right back</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          We're having trouble loading the menu right now. Please try again in a moment.
        </p>
        {import.meta.env.DEV && (
          <p className="text-xs text-destructive/70 max-w-sm font-mono bg-destructive/5 p-2 rounded">{error}</p>
        )}
        <Button onClick={refresh} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" /> Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto pb-24">
        {authed ? (
          <AdminPanel
            categories={categories}
            items={items}
            restaurant={restaurant}
            onUpdateCategories={updateCategories}
            onUpdateItems={updateItems}
            onUpdateRestaurant={updateRestaurant}
            onSaveAll={saveAll}
            onLogout={() => { logout(); setShowLogin(false); }}
          />
        ) : (
          <LoginModal onLogin={login} visible={showLogin} />
        )}

        <RestaurantHeader restaurant={restaurant} onTripleTap={() => setShowLogin((prev) => !prev)} />

        {restaurant.show_search && (
          <SearchBar items={allVisibleItems} onSelect={setSelectedItem} vegFilter={vegFilter} />
        )}

        {restaurant.show_veg_filter && (
          <VegFilterBar vegFilter={vegFilter} onFilterChange={setVegFilter} />
        )}

        {visibleCategories.length > 0 && (
          <CategoryTabs categories={visibleCategories} activeId={activeCat} onSelect={scrollToCategory} />
        )}

        <main className="px-4 mt-4 space-y-8">
          {visibleCategories.map((cat) => {
            const catItems = getItemsForCategory(cat.id);
            return (
              <section
                key={cat.id}
                ref={(el: HTMLDivElement | null) => { sectionRefs.current[cat.id] = el; }}
                className="scroll-mt-20"
              >
                <h2 className="text-xl font-bold text-foreground mb-3 tracking-tight">{cat.name}</h2>
                <div className="space-y-3">
                  {catItems.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      onSelect={setSelectedItem}
                      quantity={getQuantity(item.id)}
                      onAdd={() => addItem({ id: item.id, name: item.name, price: item.price, image_url: item.image_url })}
                      onRemove={() => removeItem(item.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          {visibleCategories.length === 0 && items.length > 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-lg">No items available</p>
              <p className="text-sm mt-1">
                {vegFilter !== "all"
                  ? `No ${vegFilter === "veg" ? "vegetarian" : "non-vegetarian"} items found. Try changing the filter.`
                  : "Currently no items are available."}
              </p>
            </div>
          )}

          {items.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-lg">No menu items yet.</p>
              <p className="text-sm mt-1">Login as owner to add categories and items.</p>
            </div>
          )}
        </main>

        <ItemDetailDrawer item={selectedItem} onClose={() => setSelectedItem(null)} />
        <OrderSummaryDrawer
          open={orderOpen}
          onClose={() => setOrderOpen(false)}
          cartItems={cartItems}
          totalPrice={totalPrice}
          onAdd={(item) => addItem(item)}
          onRemove={(id) => removeItem(id)}
          onClear={clearCart}
        />
      </div>

      <FloatingOrderButton totalItems={totalItems} onClick={() => setOrderOpen(true)} />
    </div>
  );
};

export default Index;
