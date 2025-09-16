import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EditStaffDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  staffMember: {
    id: string;
    name: string;
    username: string;
    role: string;
    status: "active" | "inactive";
  } | null;
}

const EditStaffDialog = ({ isOpen, onClose, onSuccess, staffMember }: EditStaffDialogProps) => {
  const [fullName, setFullName] = useState(staffMember?.name || "");
  const [username, setUsername] = useState(staffMember?.username || "");
  const [role, setRole] = useState(staffMember?.role || "cashier");
  const [isActive, setIsActive] = useState(staffMember?.status === "active");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Update state when staffMember changes
  useState(() => {
    if (staffMember) {
      setFullName(staffMember.name);
      setUsername(staffMember.username);
      setRole(staffMember.role);
      setIsActive(staffMember.status === "active");
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffMember) return;
    
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: fullName,
          username: username,
          role: role,
          is_active: isActive
        })
        .eq('id', staffMember.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Staff member updated successfully",
      });
      
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update staff member",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Staff Member</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="shift_lead">Shift Lead</SelectItem>
                <SelectItem value="cashier">Cashier</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="isActive">Active</Label>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Staff"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditStaffDialog;