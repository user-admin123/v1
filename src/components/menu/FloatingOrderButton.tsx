import { ClipboardList } from "lucide-react"; // Changed from ShoppingBag

interface Props {
  totalItems: number;
  onClick: () => void;
}

const FloatingOrderButton = ({ totalItems, onClick }: Props) => {
  if (totalItems <= 0) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-lg hover:bg-primary/90 transition-all active:scale-95 animate-in fade-in slide-in-from-bottom-4"
    >
      {/* Updated Icon */}
      <ClipboardList className="w-5 h-5" />
      
      <span className="font-semibold text-sm">Summary</span>
      
      <span className="bg-primary-foreground text-primary text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
        {totalItems}
      </span>
    </button>
  );
};

export default FloatingOrderButton;
