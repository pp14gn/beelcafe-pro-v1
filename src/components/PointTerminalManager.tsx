import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Monitor, Settings, Wifi, WifiOff } from "lucide-react";

interface Terminal {
  id: string;
  name: string;
  status: string;
  pos_id?: string;
}

interface PointTerminalManagerProps {
  selectedPosId: string;
  selectedTerminalId: string;
  onTerminalSelect: (terminalId: string) => void;
}

export const PointTerminalManager = ({ selectedPosId, selectedTerminalId, onTerminalSelect }: PointTerminalManagerProps) => {
  const [terminalList, setTerminalList] = useState<Terminal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedPosId) {
      loadTerminalList();
    }
  }, [selectedPosId]);

  const loadTerminalList = async () => {
    if (!selectedPosId) return;

    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('point-terminal-manager', {
        body: { 
          action: 'list',
          posId: selectedPosId
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setTerminalList(response.data?.results || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load terminal list",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const assignTerminal = async (terminalId: string) => {
    if (!selectedPosId) {
      toast({
        title: "Error",
        description: "Please select a POS first",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('point-terminal-manager', {
        body: {
          action: 'assign',
          terminalId,
          posId: selectedPosId,
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: "Success",
        description: "Terminal assigned successfully",
      });

      loadTerminalList();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign terminal",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const unassignTerminal = async (terminalId: string) => {
    if (!confirm('Are you sure you want to unassign this terminal?')) return;

    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('point-terminal-manager', {
        body: {
          action: 'unassign',
          terminalId
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: "Success",
        description: "Terminal unassigned successfully",
      });

      if (selectedTerminalId === terminalId) {
        onTerminalSelect('');
      }
      loadTerminalList();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unassign terminal",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'online':
      case 'available':
        return <Wifi className="h-4 w-4 text-pos-success" />;
      case 'offline':
      case 'unavailable':
        return <WifiOff className="h-4 w-4 text-destructive" />;
      default:
        return <Monitor className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-lg bg-pos-info/10 flex items-center justify-center">
          <Monitor className="h-5 w-5 text-pos-info" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Terminal Management</h3>
          <p className="text-sm text-muted-foreground">Manage Point payment terminals</p>
        </div>
      </div>

      <div className="space-y-4">
        {!selectedPosId ? (
          <div className="text-center py-6">
            <Monitor className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Please select a POS first</p>
          </div>
        ) : (
          <>
            {/* Terminal Selection */}
            <div>
              <Label htmlFor="terminalSelect">Selected Terminal</Label>
              <Select value={selectedTerminalId} onValueChange={onTerminalSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a terminal" />
                </SelectTrigger>
                <SelectContent>
                  {terminalList
                    .filter(terminal => terminal.pos_id === selectedPosId)
                    .map((terminal) => (
                      <SelectItem key={terminal.id} value={terminal.id}>
                        {terminal.name} - {terminal.status}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Available Terminals */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Available Terminals</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={loadTerminalList}
                  disabled={isLoading}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {terminalList.map((terminal) => (
                  <div
                    key={terminal.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(terminal.status)}
                      <div>
                        <p className="font-medium">{terminal.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Status: {terminal.status} • ID: {terminal.id}
                        </p>
                        {terminal.pos_id && (
                          <p className="text-xs text-muted-foreground">
                            Assigned to POS: {terminal.pos_id}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {terminal.pos_id === selectedPosId ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => unassignTerminal(terminal.id)}
                          disabled={isLoading}
                        >
                          Unassign
                        </Button>
                      ) : !terminal.pos_id ? (
                        <Button
                          size="sm"
                          onClick={() => assignTerminal(terminal.id)}
                          disabled={isLoading}
                        >
                          Assign
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" disabled>
                          Assigned
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {terminalList.length === 0 && !isLoading && (
                <p className="text-center text-muted-foreground py-4">
                  No terminals found for this POS.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
};