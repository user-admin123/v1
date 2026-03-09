import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  deleteConfirm: { type: "category" | "item"; id: string; name: string } | null;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteConfirmDialog = ({ deleteConfirm, onClose, onConfirm }: Props) => (
  <AlertDialog open={!!deleteConfirm} onOpenChange={(o) => !o && onClose()}>
    <AlertDialogContent className="glass-card border-border/30">
      <AlertDialogHeader>
        <AlertDialogTitle>
          Delete {deleteConfirm?.type === "category" ? "Category" : "Item"}
        </AlertDialogTitle>
        <AlertDialogDescription>
          Are you sure you want to delete "{deleteConfirm?.name}"?
          {deleteConfirm?.type === "category" &&
            " All items in this category will also be deleted."}
          {" "}This action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          onClick={onConfirm}
        >
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default DeleteConfirmDialog;
