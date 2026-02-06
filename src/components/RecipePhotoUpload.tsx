import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, X, Loader2 } from "lucide-react";

interface RecipePhotoUploadProps {
  photoUrl: string | null;
  onPhotoChange: (url: string | null) => void;
}

const RecipePhotoUpload = ({ photoUrl, onPhotoChange }: RecipePhotoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Error", description: "Please select an image file." });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Error", description: "Image must be under 5MB." });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("recipe-photos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("recipe-photos")
        .getPublicUrl(fileName);

      onPhotoChange(publicUrl);
    } catch (error) {
      console.error("Upload error:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to upload photo." });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    onPhotoChange(null);
  };

  return (
    <div className="space-y-2">
      <Label>Recipe Photo</Label>
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-lg border border-border bg-muted/50 flex items-center justify-center overflow-hidden shrink-0">
          {photoUrl ? (
            <img src={photoUrl} alt="Recipe" className="h-full w-full object-cover" />
          ) : (
            <Camera className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Uploading...</>
            ) : (
              <><Camera className="h-4 w-4 mr-2" />{photoUrl ? "Change Photo" : "Upload Photo"}</>
            )}
          </Button>
          {photoUrl && (
            <Button type="button" variant="ghost" size="sm" onClick={handleRemove} className="text-destructive">
              <X className="h-4 w-4 mr-1" />Remove
            </Button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
      </div>
    </div>
  );
};

export default RecipePhotoUpload;
