import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettings } from "@/hooks/useSettings";
import { receiptPrinter } from "@/utils/receiptPrinter";
import { useToast } from "@/hooks/use-toast";
import { MercadoPagoSettings } from "@/components/MercadoPagoSettings";
import { 
  Settings as SettingsIcon, 
  Store, 
  Bell, 
  Database,
  Shield,
  Printer,
  Wifi,
  CreditCard
} from "lucide-react";

const Settings = () => {
  const { settings, updateSettings, resetToDefaults, isLoading } = useSettings();
  const { toast } = useToast();

  const handleSaveChanges = () => {
    // Update receipt printer settings
    receiptPrinter.setAutoPrint(settings.autoPrintReceipts);
    
    toast({
      title: "Settings Saved",
      description: "Your settings have been saved successfully.",
    });
  };

  const handleResetDefaults = () => {
    resetToDefaults();
    receiptPrinter.setAutoPrint(true);
    
    toast({
      title: "Settings Reset",
      description: "Settings have been reset to defaults.",
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Configure your coffee shop POS system</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general">General Settings</TabsTrigger>
          <TabsTrigger value="mercadopago">MercadoPago Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Store Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-coffee-gold/10 flex items-center justify-center">
              <Store className="h-5 w-5 text-coffee-gold" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Store Information</h3>
              <p className="text-sm text-muted-foreground">Basic store details</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="storeName">Store Name</Label>
              <Input 
                id="storeName" 
                value={settings.storeName}
                onChange={(e) => updateSettings({ storeName: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="storeAddress">Address</Label>
              <Input 
                id="storeAddress" 
                value={settings.storeAddress}
                onChange={(e) => updateSettings({ storeAddress: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="storePhone">Phone</Label>
                <Input 
                  id="storePhone" 
                  value={settings.storePhone}
                  onChange={(e) => updateSettings({ storePhone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="storeEmail">Email</Label>
                <Input 
                  id="storeEmail" 
                  value={settings.storeEmail}
                  onChange={(e) => updateSettings({ storeEmail: e.target.value })}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* System Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-coffee-bean/10 flex items-center justify-center">
              <SettingsIcon className="h-5 w-5 text-coffee-bean" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">System Configuration</h3>
              <p className="text-sm text-muted-foreground">POS system preferences</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-print receipts</Label>
                <p className="text-sm text-muted-foreground">Automatically print receipts after payment</p>
              </div>
              <Switch 
                checked={settings.autoPrintReceipts}
                onCheckedChange={(checked) => {
                  updateSettings({ autoPrintReceipts: checked });
                  receiptPrinter.setAutoPrint(checked);
                }}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Sound notifications</Label>
                <p className="text-sm text-muted-foreground">Play sounds for orders and alerts</p>
              </div>
              <Switch 
                checked={settings.soundNotifications}
                onCheckedChange={(checked) => updateSettings({ soundNotifications: checked })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Low stock alerts</Label>
                <p className="text-sm text-muted-foreground">Alert when inventory is running low</p>
              </div>
              <Switch 
                checked={settings.lowStockAlerts}
                onCheckedChange={(checked) => updateSettings({ lowStockAlerts: checked })}
              />
            </div>
          </div>
        </Card>

        {/* Security Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-pos-warning/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-pos-warning" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Security</h3>
              <p className="text-sm text-muted-foreground">Access and security settings</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Require manager approval for refunds</Label>
                <p className="text-sm text-muted-foreground">Manager must approve all refunds</p>
              </div>
              <Switch 
                checked={settings.requireManagerApproval}
                onCheckedChange={(checked) => updateSettings({ requireManagerApproval: checked })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-logout after inactivity</Label>
                <p className="text-sm text-muted-foreground">Logout staff after 30 minutes of inactivity</p>
              </div>
              <Switch 
                checked={settings.autoLogout}
                onCheckedChange={(checked) => updateSettings({ autoLogout: checked })}
              />
            </div>

            <Separator />

            <div>
              <Label htmlFor="backupFreq">Backup Frequency</Label>
              <Input 
                id="backupFreq" 
                value={settings.backupFrequency}
                onChange={(e) => updateSettings({ backupFrequency: e.target.value })}
              />
            </div>
          </div>
        </Card>

        {/* Hardware Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-pos-info/10 flex items-center justify-center">
              <Printer className="h-5 w-5 text-pos-info" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Hardware</h3>
              <p className="text-sm text-muted-foreground">Connected devices and peripherals</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <Printer className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Receipt Printer</p>
                  <p className="text-sm text-muted-foreground">Epson TM-T88V - Connected</p>
                </div>
              </div>
              <div className="h-2 w-2 bg-pos-success rounded-full"></div>
            </div>

            <div className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <Wifi className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Network Connection</p>
                  <p className="text-sm text-muted-foreground">WiFi: CoffeeShop_5G - Strong</p>
                </div>
              </div>
              <div className="h-2 w-2 bg-pos-success rounded-full"></div>
            </div>

            <div className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Database</p>
                  <p className="text-sm text-muted-foreground">Supabase - Synchronized</p>
                </div>
              </div>
              <div className="h-2 w-2 bg-pos-success rounded-full"></div>
            </div>
          </div>
        </Card>

          </div>
        </TabsContent>

        <TabsContent value="mercadopago" className="space-y-6">
          <MercadoPagoSettings 
            settings={settings}
            updateSettings={updateSettings}
          />
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={handleResetDefaults}>
          Reset to Defaults
        </Button>
        <Button className="bg-gradient-coffee hover:opacity-90" onClick={handleSaveChanges}>
          Save Changes
        </Button>
      </div>
    </div>
  );
};

export default Settings;