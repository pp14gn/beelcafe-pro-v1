import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettings } from "@/hooks/useSettings";
import { useTranslation } from "@/hooks/useTranslation";
import { receiptPrinter } from "@/utils/receiptPrinter";
import { useToast } from "@/hooks/use-toast";
import { MercadoPagoSettings } from "@/components/MercadoPagoSettings";
import { CategoryManagement } from "@/components/CategoryManagement";
import { 
  Settings as SettingsIcon, 
  Store, 
  Bell, 
  Database,
  Shield,
  Printer,
  Wifi,
  CreditCard,
  Clock,
  Tags,
  Languages
} from "lucide-react";

const Settings = () => {
  const { settings, updateSettings, resetToDefaults, isLoading } = useSettings();
  const { t } = useTranslation();
  const { toast } = useToast();

  const handleSaveChanges = () => {
    // Update receipt printer settings
    receiptPrinter.setAutoPrint(settings.autoPrintReceipts);
    
    toast({
      title: t('settings.saved'),
      description: t('settings.saved.desc'),
    });
  };

  const handleResetDefaults = () => {
    resetToDefaults();
    receiptPrinter.setAutoPrint(true);
    
    toast({
      title: t('settings.reset'),
      description: t('settings.reset.desc'),
    });
  };

  const handleSetupPrinter = async () => {
    try {
      // Test printer connection
      const testReceiptData = {
        storeName: settings.storeName,
        storeAddress: settings.storeAddress,
        storePhone: settings.storePhone,
        receiptNumber: 'TEST-001',
        timestamp: new Date(),
        items: [
          {
            name: 'Test Print Item',
            quantity: 1,
            price: 0.00
          }
        ],
        total: 0.00,
        paymentMethod: 'cash' as const,
        cashier: 'Test User'
      };

      // Print test receipt
      receiptPrinter.printReceipt(testReceiptData);

      toast({
        title: "Printer Setup",
        description: "Test receipt sent to printer. Check if it printed correctly.",
      });
    } catch (error) {
      toast({
        title: "Printer Setup Error",
        description: "Failed to setup printer. Please check connection and try again.",
        variant: "destructive",
      });
    }
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
        <h1 className="text-2xl font-bold text-foreground">{t('settings.title')}</h1>
        <p className="text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">{t('settings.general')}</TabsTrigger>
          <TabsTrigger value="categories">{t('settings.categories')}</TabsTrigger>
          <TabsTrigger value="hours">{t('settings.hours')}</TabsTrigger>
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
              <h3 className="font-semibold text-foreground">{t('settings.store.info')}</h3>
              <p className="text-sm text-muted-foreground">{t('settings.store.details')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="storeName">{t('settings.store.name')}</Label>
              <Input 
                id="storeName" 
                value={settings.storeName}
                onChange={(e) => updateSettings({ storeName: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="storeAddress">{t('settings.store.address')}</Label>
              <Input 
                id="storeAddress" 
                value={settings.storeAddress}
                onChange={(e) => updateSettings({ storeAddress: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="storePhone">{t('settings.store.phone')}</Label>
                <Input 
                  id="storePhone" 
                  value={settings.storePhone}
                  onChange={(e) => updateSettings({ storePhone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="storeEmail">{t('settings.store.email')}</Label>
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

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-muted-foreground" />
                <Label>Language / Idioma</Label>
              </div>
              <p className="text-sm text-muted-foreground">Select your preferred language</p>
              <Select 
                value={settings.language} 
                onValueChange={(value: 'en' | 'es') => updateSettings({ language: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                  <SelectItem value="es">🇪🇸 Español</SelectItem>
                </SelectContent>
              </Select>
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-pos-info/10 flex items-center justify-center">
                <Printer className="h-5 w-5 text-pos-info" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Hardware</h3>
                <p className="text-sm text-muted-foreground">Connected devices and peripherals</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleSetupPrinter()}
            >
              <Printer className="h-4 w-4 mr-2" />
              Setup Printer
            </Button>
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

        <TabsContent value="categories" className="space-y-6">
          <CategoryManagement />
        </TabsContent>

        <TabsContent value="hours" className="space-y-6">
          {/* Operating Hours Settings */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Operating Hours</h3>
                <p className="text-sm text-muted-foreground">Set your store's business hours</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="openTime">Opening Time</Label>
                  <Input 
                    id="openTime" 
                    type="time"
                    value={settings.openTime}
                    onChange={(e) => updateSettings({ openTime: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="closeTime">Closing Time</Label>
                  <Input 
                    id="closeTime" 
                    type="time"
                    value={settings.closeTime}
                    onChange={(e) => updateSettings({ closeTime: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label className="text-base font-medium">Operating Days</Label>
                <p className="text-sm text-muted-foreground mb-3">Select which days your store is open</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'monday', label: 'Monday' },
                    { id: 'tuesday', label: 'Tuesday' },
                    { id: 'wednesday', label: 'Wednesday' },
                    { id: 'thursday', label: 'Thursday' },
                    { id: 'friday', label: 'Friday' },
                    { id: 'saturday', label: 'Saturday' },
                    { id: 'sunday', label: 'Sunday' }
                  ].map((day) => (
                    <div key={day.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={day.id}
                        checked={settings.operatingDays.includes(day.id)}
                        onCheckedChange={(checked) => {
                          const updatedDays = checked
                            ? [...settings.operatingDays, day.id]
                            : settings.operatingDays.filter(d => d !== day.id);
                          updateSettings({ operatingDays: updatedDays });
                        }}
                      />
                      <Label htmlFor={day.id} className="text-sm font-normal">
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium text-foreground mb-2">Automatic Features</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Notification 5 minutes before closing time</li>
                  <li>• Automatic shift closure 15 minutes after closing time</li>
                  <li>• Store status display in POS system</li>
                </ul>
              </div>
            </div>
          </Card>
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
          {t('settings.reset.defaults')}
        </Button>
        <Button className="bg-gradient-coffee hover:opacity-90" onClick={handleSaveChanges}>
          {t('settings.save.changes')}
        </Button>
      </div>
    </div>
  );
};

export default Settings;