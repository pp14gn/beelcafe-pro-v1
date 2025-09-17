import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Users, Eye, EyeOff } from "lucide-react";

interface AddStaffDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddStaffDialog = ({ isOpen, onClose, onSuccess }: AddStaffDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    username: "",
    email: "",
    password: "",
    role: "",
  });
  const [permissions, setPermissions] = useState<string[]>([]);

  const { signUp } = useAuth();
  const { toast } = useToast();

  const roles = [
    { value: "cashier", label: "Cashier" },
    { value: "manager", label: "Manager" },
    { value: "admin", label: "Admin" },
  ];

  const availablePermissions = [
    { id: "pos", label: "Point of Sale" },
    { id: "inventory", label: "Inventory Management" },
    { id: "recipes", label: "Recipe Management" },
    { id: "staff", label: "Staff Management" },
    { id: "analytics", label: "Analytics & Reports" },
    { id: "settings", label: "System Settings" },
  ];

  const rolePermissions = {
    cashier: ["pos"],
    manager: ["pos", "inventory", "recipes", "staff", "analytics"],
    admin: ["pos", "inventory", "recipes", "staff", "analytics", "settings"],
  };

  const handleRoleChange = (role: string) => {
    setFormData(prev => ({ ...prev, role }));
    setPermissions(rolePermissions[role as keyof typeof rolePermissions] || []);
  };

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    if (checked) {
      setPermissions(prev => [...prev, permissionId]);
    } else {
      setPermissions(prev => prev.filter(p => p !== permissionId));
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create auth user and profile
      const { error } = await signUp(formData.email, formData.password, {
        username: formData.username,
        full_name: formData.full_name,
        role: formData.role as any,
      });

      if (error) throw error;

      // User profile creation completed successfully
      // Email is managed through Supabase Auth automatically

      toast({
        title: "Staff Member Added",
        description: `${formData.full_name} has been added successfully with login credentials.`,
      });

      resetForm();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error adding staff member:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add staff member. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      username: "",
      email: "",
      password: "",
      role: "",
    });
    setPermissions([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Add New Staff Member
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="john.doe"
                  required
                />
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john.doe@company.com"
                required
              />
            </div>
          </Card>

          {/* Role & Access */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Role & Access</h3>
            <div className="space-y-2 mb-4">
              <Label htmlFor="role">Role</Label>
              <Select 
                value={formData.role} 
                onValueChange={handleRoleChange}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Permissions</Label>
              <div className="grid grid-cols-2 gap-3">
                {availablePermissions.map((permission) => (
                  <div key={permission.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={permission.id}
                      checked={permissions.includes(permission.id)}
                      onCheckedChange={(checked) => 
                        handlePermissionChange(permission.id, checked as boolean)
                      }
                    />
                    <Label htmlFor={permission.id} className="text-sm">
                      {permission.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Login Credentials */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Login Credentials</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generatePassword}
                >
                  Generate Password
                </Button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter or generate password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share these credentials securely with the staff member.
              </p>
            </div>
          </Card>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                "Add Staff Member"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddStaffDialog;