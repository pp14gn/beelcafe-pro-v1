import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AddUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddUnitDialog = ({ open, onOpenChange, onSuccess }: AddUnitDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    abbreviation: '',
    type: 'general'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('units')
        .insert([formData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Unit added successfully",
      });

      setFormData({ name: '', abbreviation: '', type: 'general' });
      onSuccess();
    } catch (error) {
      console.error('Error adding unit:', error);
      toast({
        title: "Error",
        description: "Failed to add unit",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Unit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Unit Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="abbreviation">Abbreviation</Label>
            <Input
              id="abbreviation"
              value={formData.abbreviation}
              onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
              placeholder="Optional"
            />
          </div>
          <div>
            <Label htmlFor="type">Unit Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weight">Weight</SelectItem>
                <SelectItem value="volume">Volume</SelectItem>
                <SelectItem value="count">Count</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Unit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};