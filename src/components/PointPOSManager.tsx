import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Store, Plus, Trash2, Settings } from "lucide-react";

interface POS {
  id: string;
  name: string;
  category: string;
  external_store_id?: string;
  store?: {
    id: string;
    name: string;
  };
}

interface PointPOSManagerProps {
  selectedPosId: string;
  onPosSelect: (posId: string) => void;
}

export const PointPOSManager = ({ selectedPosId, onPosSelect }: PointPOSManagerProps) => {
  const [posList, setPosList] = useState<POS[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPosName, setNewPosName] = useState('');
  const [newPosCategory, setNewPosCategory] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadPOSList();
  }, []);

  const loadPOSList = async () => {
    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('point-pos-manager', {
        body: { action: 'list' }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setPosList(response.data?.results || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load POS list",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createPOS = async () => {
    if (!newPosName.trim() || !newPosCategory.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('point-pos-manager', {
        body: {
          action: 'create',
          name: newPosName,
          category: newPosCategory,
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: "Success",
        description: "POS created successfully",
      });

      setNewPosName('');
      setNewPosCategory('');
      setShowCreateForm(false);
      loadPOSList();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create POS",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deletePOS = async (posId: string) => {
    if (!confirm('Are you sure you want to delete this POS?')) return;

    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('point-pos-manager', {
        body: {
          action: 'delete',
          posId
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: "Success",
        description: "POS deleted successfully",
      });

      if (selectedPosId === posId) {
        onPosSelect('');
      }
      loadPOSList();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete POS",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-lg bg-coffee-gold/10 flex items-center justify-center">
          <Store className="h-5 w-5 text-coffee-gold" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Point of Sale Management</h3>
          <p className="text-sm text-muted-foreground">Manage your MercadoPago Point POS</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* POS Selection */}
        <div>
          <Label htmlFor="posSelect">Selected POS</Label>
          <Select value={selectedPosId} onValueChange={onPosSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Select a POS" />
            </SelectTrigger>
            <SelectContent>
              {posList.map((pos) => (
                <SelectItem key={pos.id} value={pos.id}>
                  {pos.name} - {pos.category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* POS List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Available POS</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create POS
            </Button>
          </div>

          {/* Create Form */}
          {showCreateForm && (
            <Card className="p-4 bg-muted/50">
              <div className="space-y-3">
                <div>
                  <Label>POS Name</Label>
                  <Input
                    value={newPosName}
                    onChange={(e) => setNewPosName(e.target.value)}
                    placeholder="Enter POS name"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={newPosCategory} onValueChange={setNewPosCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FOOD_AND_DRINKS">Food & Drinks</SelectItem>
                      <SelectItem value="RETAIL">Retail</SelectItem>
                      <SelectItem value="SERVICES">Services</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={createPOS} disabled={isLoading}>
                    Create
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* POS List */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {posList.map((pos) => (
              <div
                key={pos.id}
                className="flex items-center justify-between p-3 border border-border rounded-lg"
              >
                <div>
                  <p className="font-medium">{pos.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {pos.category} • ID: {pos.id}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deletePOS(pos.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {posList.length === 0 && !isLoading && (
            <p className="text-center text-muted-foreground py-4">
              No POS found. Create one to get started.
            </p>
          )}
        </div>

        {/* Refresh Button */}
        <Button
          variant="outline"
          onClick={loadPOSList}
          disabled={isLoading}
          className="w-full"
        >
          <Settings className="h-4 w-4 mr-2" />
          {isLoading ? 'Loading...' : 'Refresh POS List'}
        </Button>
      </div>
    </Card>
  );
};