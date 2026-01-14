import { useState, useEffect } from "react";
import { Plus, Sparkles, Edit2, Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface LoyaltyEvent {
  id: string;
  name: string;
  multiplier: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  event_type: string;
}

const LoyaltyEventsManager = () => {
  const [events, setEvents] = useState<LoyaltyEvent[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<LoyaltyEvent | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    multiplier: 2,
    start_date: "",
    end_date: "",
    event_type: "multiplier",
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from('loyalty_events')
      .select('*')
      .order('start_date', { ascending: false });

    if (!error && data) {
      setEvents(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        multiplier: formData.multiplier,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        event_type: formData.event_type,
      };

      if (editingEvent) {
        const { error } = await supabase
          .from('loyalty_events')
          .update(payload)
          .eq('id', editingEvent.id);

        if (error) throw error;
        toast({ title: "Event updated successfully" });
      } else {
        const { error } = await supabase
          .from('loyalty_events')
          .insert(payload);

        if (error) throw error;
        toast({ title: "Event created successfully" });
      }

      loadEvents();
      closeDialog();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleEventActive = async (event: LoyaltyEvent) => {
    const { error } = await supabase
      .from('loyalty_events')
      .update({ is_active: !event.is_active })
      .eq('id', event.id);

    if (!error) {
      loadEvents();
    }
  };

  const deleteEvent = async (id: string) => {
    const { error } = await supabase
      .from('loyalty_events')
      .delete()
      .eq('id', id);

    if (!error) {
      loadEvents();
      toast({ title: "Event deleted" });
    }
  };

  const openEditDialog = (event: LoyaltyEvent) => {
    setEditingEvent(event);
    setFormData({
      name: event.name,
      multiplier: event.multiplier,
      start_date: format(new Date(event.start_date), "yyyy-MM-dd'T'HH:mm"),
      end_date: format(new Date(event.end_date), "yyyy-MM-dd'T'HH:mm"),
      event_type: event.event_type,
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingEvent(null);
    setFormData({ name: "", multiplier: 2, start_date: "", end_date: "", event_type: "multiplier" });
  };

  const isEventActive = (event: LoyaltyEvent) => {
    const now = new Date();
    return event.is_active && new Date(event.start_date) <= now && new Date(event.end_date) >= now;
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'multiplier': return 'Points Multiplier';
      case 'birthday': return 'Birthday Bonus';
      case 'bonus': return 'Bonus Points';
      default: return type;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Points Events</h3>
        <Button size="sm" onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Event
        </Button>
      </div>

      <div className="grid gap-3">
        {events.length === 0 ? (
          <Card className="p-4 text-center text-muted-foreground">
            No events configured. Create double points days or special promotions.
          </Card>
        ) : (
          events.map((event) => (
            <Card key={event.id} className={`p-3 ${!event.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isEventActive(event) ? 'bg-green-500/20' : 'bg-primary/10'}`}>
                    <Sparkles className={`h-4 w-4 ${isEventActive(event) ? 'text-green-500' : 'text-primary'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{event.name}</p>
                      {isEventActive(event) && (
                        <Badge variant="default" className="bg-green-500">Active Now</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{event.multiplier}x Points</Badge>
                      <span>{getEventTypeLabel(event.event_type)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      {format(new Date(event.start_date), 'MMM dd, yyyy')} - {format(new Date(event.end_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={event.is_active}
                    onCheckedChange={() => toggleEventActive(event)}
                  />
                  <Button size="icon" variant="ghost" onClick={() => openEditDialog(event)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteEvent(event.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Add Event'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Event Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Double Points Tuesday"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Event Type</Label>
              <Select value={formData.event_type} onValueChange={(v) => setFormData({ ...formData, event_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiplier">Points Multiplier</SelectItem>
                  <SelectItem value="birthday">Birthday Bonus</SelectItem>
                  <SelectItem value="bonus">Bonus Points</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="multiplier">Points Multiplier *</Label>
              <Input
                id="multiplier"
                type="number"
                min={1}
                max={10}
                step={0.5}
                value={formData.multiplier}
                onChange={(e) => setFormData({ ...formData, multiplier: parseFloat(e.target.value) || 2 })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date *</Label>
                <Input
                  id="end_date"
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={closeDialog} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {editingEvent ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoyaltyEventsManager;