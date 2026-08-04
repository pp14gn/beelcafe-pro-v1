import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Users, Receipt } from "lucide-react";

export interface OrderTab {
  id: string;
  name: string;
  items: any[];
  total_amount: number;
  status: string;
}

interface POSTabsBarProps {
  tabs: OrderTab[];
  activeTabId: string | null;
  onSelect: (tabId: string | null) => void;
  onCreate: (name: string) => Promise<void> | void;
  disabled?: boolean;
}

const POSTabsBar = ({ tabs, activeTabId, onSelect, onCreate, disabled }: POSTabsBarProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onCreate(name.trim());
      setName("");
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
      <Button
        variant={activeTabId === null ? "default" : "outline"}
        onClick={() => onSelect(null)}
        className="gap-2 shrink-0"
        size="sm"
      >
        <Receipt className="h-4 w-4" />
        Quick sale
      </Button>

      {tabs.map((tab) => (
        <Button
          key={tab.id}
          variant={activeTabId === tab.id ? "default" : "outline"}
          onClick={() => onSelect(tab.id)}
          className="gap-2 shrink-0"
          size="sm"
        >
          <Users className="h-4 w-4" />
          {tab.name}
          <Badge variant="secondary" className="ml-1">
            ${Number(tab.total_amount || 0).toFixed(2)}
          </Badge>
        </Button>
      ))}

      <Button
        variant="outline"
        size="sm"
        className="gap-2 shrink-0 border-coffee-gold/30"
        onClick={() => setDialogOpen(true)}
        disabled={disabled}
      >
        <Plus className="h-4 w-4" />
        New tab
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open a new tab</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Table 4, John, Bar seat 2..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!name.trim() || saving}>
              Open tab
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSTabsBar;
