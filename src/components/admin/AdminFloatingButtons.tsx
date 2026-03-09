import { Edit, Loader2, LogOut, Save } from "lucide-react";

interface Props {
  hasChanges: boolean;
  saving: boolean;
  onSave: () => void;
  onOpenPanel: () => void;
  onLogout: () => void;
}

const AdminFloatingButtons = ({ hasChanges, saving, onSave, onOpenPanel, onLogout }: Props) => (
  <div className="fixed top-4 right-4 z-40 flex gap-2">
    {hasChanges && (
      <button
        onClick={onSave}
        disabled={saving}
        className="h-10 px-4 rounded-full bg-green-600 text-white flex items-center gap-2 shadow-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? "Saving..." : "Update Changes"}
      </button>
    )}
    <button
      onClick={onOpenPanel}
      className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
      aria-label="Admin panel"
    >
      <Edit className="w-4 h-4" />
    </button>
    <button
      onClick={onLogout}
      className="w-10 h-10 rounded-full glass-card flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
      aria-label="Logout"
    >
      <LogOut className="w-4 h-4" />
    </button>
  </div>
);

export default AdminFloatingButtons;
