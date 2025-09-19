import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, X } from "lucide-react";

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
    picture_url?: string;
  } | null;
}

const EditStaffDialog = ({ isOpen, onClose, onSuccess, staffMember }: EditStaffDialogProps) => {
  const [fullName, setFullName] = useState(staffMember?.name || "");
  const [username, setUsername] = useState(staffMember?.username || "");
  const [role, setRole] = useState(staffMember?.role || "cashier");
  const [isActive, setIsActive] = useState(staffMember?.status === "active");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const [currentPictureUrl, setCurrentPictureUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Update state when staffMember changes
  useEffect(() => {
    if (staffMember) {
      setFullName(staffMember.name);
      setUsername(staffMember.username);
      setRole(staffMember.role);
      setIsActive(staffMember.status === "active");
      setCurrentPictureUrl(staffMember.picture_url || null);
      setPicturePreview(null);
      setProfilePicture(null);
    }
  }, [staffMember]);

  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onload = (e) => setPicturePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removePicture = () => {
    setProfilePicture(null);
    setPicturePreview(null);
    setCurrentPictureUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffMember) return;
    
    setLoading(true);
    
    try {
      let pictureUrl = currentPictureUrl;

      // Upload new profile picture if provided
      if (profilePicture) {
        const fileExt = profilePicture.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('inventory-photos')
          .upload(`profiles/${fileName}`, profilePicture);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('inventory-photos')
          .getPublicUrl(`profiles/${fileName}`);
        
        pictureUrl = publicUrl;
      }

      const { error } = await supabase
        .from('users')
        .update({
          full_name: fullName,
          username: username,
          role: role,
          is_active: isActive,
          picture_url: pictureUrl
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
          {/* Profile Picture */}
          <div className="space-y-2">
            <Label>Profile Picture</Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                {picturePreview ? (
                  <AvatarImage src={picturePreview} alt="Profile preview" />
                ) : currentPictureUrl ? (
                  <AvatarImage src={currentPictureUrl} alt="Current profile picture" />
                ) : (
                  <AvatarFallback className="bg-coffee-gold/20 text-coffee-bean text-lg">
                    {fullName ? fullName.split(' ').map(n => n[0]).join('').slice(0, 2) : 'U'}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => document.getElementById('picture-upload-edit')?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    {currentPictureUrl ? 'Change Picture' : 'Upload Picture'}
                  </Button>
                  {(picturePreview || currentPictureUrl) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={removePicture}
                    >
                      <X className="h-4 w-4" />
                      Remove
                    </Button>
                  )}
                </div>
                <input
                  id="picture-upload-edit"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePictureChange}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended: Square image, max 2MB
                </p>
              </div>
            </div>
          </div>

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