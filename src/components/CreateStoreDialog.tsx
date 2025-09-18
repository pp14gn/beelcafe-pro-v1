import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

interface CreateStoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (storeData: any) => void;
  isLoading: boolean;
}

export const CreateStoreDialog = ({ open, onOpenChange, onSubmit, isLoading }: CreateStoreDialogProps) => {
  const [storeForm, setStoreForm] = useState({
    name: '',
    external_id: '',
    business_hours: {
      monday: [{ open: '08:00', close: '18:00' }],
      tuesday: [{ open: '08:00', close: '18:00' }],
      wednesday: [{ open: '08:00', close: '18:00' }],
      thursday: [{ open: '08:00', close: '18:00' }],
      friday: [{ open: '08:00', close: '18:00' }],
      saturday: [{ open: '09:00', close: '17:00' }],
      sunday: []
    },
    location: {
      street_number: '',
      street_name: '',
      city_name: '',
      state_name: '',
      latitude: 0,
      longitude: 0,
      reference: ''
    }
  });

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabels = {
    monday: 'Monday',
    tuesday: 'Tuesday', 
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  };

  const handleSubmit = () => {
    onSubmit(storeForm);
  };

  const updateBusinessHours = (day: string, index: number, field: 'open' | 'close', value: string) => {
    setStoreForm(prev => ({
      ...prev,
      business_hours: {
        ...prev.business_hours,
        [day]: prev.business_hours[day as keyof typeof prev.business_hours].map((hours, i) => 
          i === index ? { ...hours, [field]: value } : hours
        )
      }
    }));
  };

  const addBusinessHours = (day: string) => {
    setStoreForm(prev => ({
      ...prev,
      business_hours: {
        ...prev.business_hours,
        [day]: [...prev.business_hours[day as keyof typeof prev.business_hours], { open: '08:00', close: '18:00' }]
      }
    }));
  };

  const removeBusinessHours = (day: string, index: number) => {
    setStoreForm(prev => ({
      ...prev,
      business_hours: {
        ...prev.business_hours,
        [day]: prev.business_hours[day as keyof typeof prev.business_hours].filter((_, i) => i !== index)
      }
    }));
  };

  const resetForm = () => {
    setStoreForm({
      name: '',
      external_id: '',
      business_hours: {
        monday: [{ open: '08:00', close: '18:00' }],
        tuesday: [{ open: '08:00', close: '18:00' }],
        wednesday: [{ open: '08:00', close: '18:00' }],
        thursday: [{ open: '08:00', close: '18:00' }],
        friday: [{ open: '08:00', close: '18:00' }],
        saturday: [{ open: '09:00', close: '17:00' }],
        sunday: []
      },
      location: {
        street_number: '',
        street_name: '',
        city_name: '',
        state_name: '',
        latitude: 0,
        longitude: 0,
        reference: ''
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      onOpenChange(newOpen);
      if (!newOpen) resetForm();
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Store</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="location">Location</TabsTrigger>
            <TabsTrigger value="hours">Business Hours</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Store Name *</Label>
                <Input
                  id="name"
                  value={storeForm.name}
                  onChange={(e) => setStoreForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter store name"
                />
              </div>
              <div>
                <Label htmlFor="external_id">External ID</Label>
                <Input
                  id="external_id"
                  value={storeForm.external_id}
                  onChange={(e) => setStoreForm(prev => ({ ...prev, external_id: e.target.value }))}
                  placeholder="Enter external ID (optional)"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="location" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="street_number">Street Number</Label>
                <Input
                  id="street_number"
                  value={storeForm.location.street_number}
                  onChange={(e) => setStoreForm(prev => ({
                    ...prev,
                    location: { ...prev.location, street_number: e.target.value }
                  }))}
                  placeholder="Enter street number"
                />
              </div>
              <div>
                <Label htmlFor="street_name">Street Name</Label>
                <Input
                  id="street_name"
                  value={storeForm.location.street_name}
                  onChange={(e) => setStoreForm(prev => ({
                    ...prev,
                    location: { ...prev.location, street_name: e.target.value }
                  }))}
                  placeholder="Enter street name"
                />
              </div>
              <div>
                <Label htmlFor="city_name">City</Label>
                <Input
                  id="city_name"
                  value={storeForm.location.city_name}
                  onChange={(e) => setStoreForm(prev => ({
                    ...prev,
                    location: { ...prev.location, city_name: e.target.value }
                  }))}
                  placeholder="Enter city name"
                />
              </div>
              <div>
                <Label htmlFor="state_name">State</Label>
                <Input
                  id="state_name"
                  value={storeForm.location.state_name}
                  onChange={(e) => setStoreForm(prev => ({
                    ...prev,
                    location: { ...prev.location, state_name: e.target.value }
                  }))}
                  placeholder="Enter state name"
                />
              </div>
              <div>
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={storeForm.location.latitude}
                  onChange={(e) => setStoreForm(prev => ({
                    ...prev,
                    location: { ...prev.location, latitude: parseFloat(e.target.value) || 0 }
                  }))}
                  placeholder="Enter latitude"
                />
              </div>
              <div>
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={storeForm.location.longitude}
                  onChange={(e) => setStoreForm(prev => ({
                    ...prev,
                    location: { ...prev.location, longitude: parseFloat(e.target.value) || 0 }
                  }))}
                  placeholder="Enter longitude"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="reference">Reference</Label>
              <Input
                id="reference"
                value={storeForm.location.reference}
                onChange={(e) => setStoreForm(prev => ({
                  ...prev,
                  location: { ...prev.location, reference: e.target.value }
                }))}
                placeholder="Enter location reference"
              />
            </div>
          </TabsContent>

          <TabsContent value="hours" className="space-y-4">
            <div className="space-y-4">
              {daysOfWeek.map((day) => (
                <Card key={day} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-medium">
                      {dayLabels[day as keyof typeof dayLabels]}
                    </Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addBusinessHours(day)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Hours
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {storeForm.business_hours[day as keyof typeof storeForm.business_hours].map((hours, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="flex-1">
                          <Label className="text-sm">Open</Label>
                          <Input
                            type="time"
                            value={hours.open}
                            onChange={(e) => updateBusinessHours(day, index, 'open', e.target.value)}
                          />
                        </div>
                        <div className="flex-1">
                          <Label className="text-sm">Close</Label>
                          <Input
                            type="time"
                            value={hours.close}
                            onChange={(e) => updateBusinessHours(day, index, 'close', e.target.value)}
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeBusinessHours(day, index)}
                          className="text-destructive hover:text-destructive mt-5"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    {storeForm.business_hours[day as keyof typeof storeForm.business_hours].length === 0 && (
                      <p className="text-sm text-muted-foreground">Closed</p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || !storeForm.name}
          >
            {isLoading ? 'Creating...' : 'Create Store'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};