import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, Loader2 } from "lucide-react";

interface DeleteAllInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  itemCount: number;
}

const DeleteAllInventoryDialog = ({
  open,
  onOpenChange,
  onSuccess,
  itemCount,
}: DeleteAllInventoryDialogProps) => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();
  const { user, userProfile } = useAuth();

  const handleClose = () => {
    setPassword("");
    setError("");
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!password.trim()) {
      setError("Password is required");
      return;
    }

    // Check if user is admin
    if (userProfile?.role !== "admin") {
      setError("Only administrators can perform this action");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Verify admin password by re-authenticating
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: password,
      });

      if (authError) {
        setError("Invalid password. Please try again.");
        setLoading(false);
        return;
      }

      // Delete all inventory items
      const { error: deleteError } = await supabase
        .from("inventory_items")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all rows

      if (deleteError) {
        throw deleteError;
      }

      toast({
        title: "Inventory Cleared",
        description: `Successfully deleted all ${itemCount} inventory items.`,
      });

      handleClose();
      onSuccess();
    } catch (error: any) {
      console.error("Error deleting inventory:", error);
      setError(error.message || "Failed to delete inventory items");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete inventory items. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = userProfile?.role === "admin";

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete All Inventory Items
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              This action will <strong>permanently delete</strong> all{" "}
              <strong>{itemCount}</strong> inventory items from the database.
              This cannot be undone.
            </p>
            {!isAdmin ? (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                <strong>Access Denied:</strong> Only administrators can perform
                this action. Please contact an admin if you need to clear the
                inventory.
              </div>
            ) : (
              <div className="space-y-2 pt-2">
                <Label htmlFor="admin-password">
                  Enter your password to confirm:
                </Label>
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  disabled={loading}
                  autoComplete="current-password"
                />
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          {isAdmin && (
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={loading || !password.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete All Items"
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteAllInventoryDialog;
