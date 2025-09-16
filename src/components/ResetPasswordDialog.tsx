import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";

interface ResetPasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  staffMember: {
    id: string;
    name: string;
    username: string;
  } | null;
}

const ResetPasswordDialog = ({ isOpen, onClose, staffMember }: ResetPasswordDialogProps) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error", 
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    if (!staffMember) return;
    
    setLoading(true);
    
    try {
      // Note: This requires admin privileges to reset another user's password
      // In a real app, you might want to send a password reset email instead
      const { error } = await supabase.auth.admin.updateUserById(
        staffMember.id,
        { password: newPassword }
      );

      if (error) throw error;

      toast({
        title: "Success",
        description: `Password reset for ${staffMember.name}`,
      });
      
      setNewPassword("");
      setConfirmPassword("");
      onClose();
    } catch (error: any) {
      // If admin update fails, try sending password reset email instead
      try {
        // Get user email from the users table first
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('id', staffMember.id)
          .single();

        if (userError) throw userError;

        // Send password reset email (this requires the user's email from auth.users)
        // Since we can't query auth.users directly, we'll show an alternative message
        toast({
          title: "Alternative Method",
          description: "Please ask the staff member to use 'Forgot Password' on the login page",
          variant: "default",
        });
        
        onClose();
      } catch (fallbackError: any) {
        toast({
          title: "Error",
          description: "Unable to reset password. Please contact system administrator.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
        </DialogHeader>
        
        <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg mb-4">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <p className="text-sm text-yellow-800">
            You are about to reset the password for <strong>{staffMember?.name}</strong>
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} variant="destructive">
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ResetPasswordDialog;