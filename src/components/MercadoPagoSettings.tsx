import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Store, 
  Monitor, 
  CreditCard
} from "lucide-react";

interface MercadoPagoSettingsProps {
  settings: any;
  updateSettings: (settings: any) => void;
}

export const MercadoPagoSettings = ({ settings, updateSettings }: MercadoPagoSettingsProps) => {
  return (
    <div className="space-y-6">
      {/* API Configuration */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-coffee-cream/10 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-coffee-cream" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">API Configuration</h3>
            <p className="text-sm text-muted-foreground">Configure MercadoPago Point API credentials</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pointUserId">Point User ID</Label>
              <Input 
                id="pointUserId" 
                value={settings.pointUserId || ''}
                onChange={(e) => updateSettings({ pointUserId: e.target.value })}
                placeholder="Enter your MercadoPago User ID"
              />
            </div>
            <div>
              <Label htmlFor="pointClientId">Point Client ID</Label>
              <Input 
                id="pointClientId" 
                value={settings.pointClientId || ''}
                onChange={(e) => updateSettings({ pointClientId: e.target.value })}
                placeholder="Enter your Point Client ID"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Point Integration</Label>
              <p className="text-sm text-muted-foreground">Enable MercadoPago Point for card payments</p>
            </div>
            <Switch 
              checked={settings.pointEnabled || false}
              onCheckedChange={(checked) => updateSettings({ pointEnabled: checked })}
            />
          </div>
        </div>
      </Card>

      {settings.pointEnabled && (
        <>
          {/* Store Configuration */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-coffee-gold/10 flex items-center justify-center">
                <Store className="h-5 w-5 text-coffee-gold" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Store Configuration</h3>
                <p className="text-sm text-muted-foreground">Configure your store details for MercadoPago Point</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="storeId">Store ID</Label>
                <Input 
                  id="storeId" 
                  value={settings.selectedStoreId || ''}
                  onChange={(e) => updateSettings({ selectedStoreId: e.target.value })}
                  placeholder="Enter your MercadoPago Store ID"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  You can find this in your MercadoPago dashboard
                </p>
              </div>
            </div>
          </Card>

          {/* POS Configuration */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-coffee-gold/10 flex items-center justify-center">
                <Monitor className="h-5 w-5 text-coffee-gold" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">POS Configuration</h3>
                <p className="text-sm text-muted-foreground">Configure your Point of Sale system</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="posId">POS ID</Label>
                <Input 
                  id="posId" 
                  value={settings.selectedPosId || ''}
                  onChange={(e) => updateSettings({ selectedPosId: e.target.value })}
                  placeholder="Enter your MercadoPago POS ID"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  You can find this in your MercadoPago Point dashboard
                </p>
              </div>
            </div>
          </Card>

          {/* Terminal Configuration */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-pos-info/10 flex items-center justify-center">
                <Monitor className="h-5 w-5 text-pos-info" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Terminal Configuration</h3>
                <p className="text-sm text-muted-foreground">Configure your Point payment terminal</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="terminalId">Terminal ID</Label>
                <Input 
                  id="terminalId" 
                  value={settings.selectedTerminalId || ''}
                  onChange={(e) => updateSettings({ selectedTerminalId: e.target.value })}
                  placeholder="Enter your MercadoPago Terminal ID"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  You can find this in your MercadoPago Point dashboard
                </p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};