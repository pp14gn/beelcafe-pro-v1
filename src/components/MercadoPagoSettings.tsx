import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreateStoreDialog } from "@/components/CreateStoreDialog";
import { 
  Store, 
  Monitor, 
  CreditCard, 
  ShoppingCart, 
  Plus, 
  Trash2, 
  Settings as SettingsIcon, 
  RefreshCw,
  X 
} from "lucide-react";

interface MercadoPagoSettingsProps {
  settings: any;
  updateSettings: (settings: any) => void;
}

export const MercadoPagoSettings = ({ settings, updateSettings }: MercadoPagoSettingsProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateStore, setShowCreateStore] = useState(false);
  const [showCreatePOS, setShowCreatePOS] = useState(false);
  const [stores, setStores] = useState<any[]>([]);
  const [posList, setPosList] = useState<any[]>([]);
  const [terminals, setTerminals] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  
  const { toast } = useToast();

  // POS form data
  const [posForm, setPosForm] = useState({
    name: '',
    external_store_id: '',
    category: 'FOOD_AND_DRINKS'
  });

  const createStore = async (storeData: any) => {
    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('mercadopago-store-manager', {
        body: {
          action: 'create',
          store: storeData
        }
      });

      if (response.error) throw new Error(response.error.message);

      toast({
        title: "Success",
        description: "Store created successfully",
      });

      setShowCreateStore(false);
      loadStores();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create store",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadStores = async () => {
    try {
      const response = await supabase.functions.invoke('mercadopago-store-manager', {
        body: { action: 'list' }
      });
      if (!response.error) {
        setStores(response.data?.results || []);
      }
    } catch (error) {
      console.error('Failed to load stores:', error);
    }
  };

  const loadPOS = async () => {
    try {
      const response = await supabase.functions.invoke('point-pos-manager', {
        body: { action: 'list' }
      });
      if (!response.error) {
        setPosList(response.data?.results || []);
      }
    } catch (error) {
      console.error('Failed to load POS:', error);
    }
  };

  const loadTerminals = async () => {
    if (!settings.selectedPosId) return;
    
    try {
      const response = await supabase.functions.invoke('point-terminal-manager', {
        body: { 
          action: 'list',
          posId: settings.selectedPosId
        }
      });
      if (!response.error) {
        setTerminals(response.data?.results || []);
      }
    } catch (error) {
      console.error('Failed to load terminals:', error);
    }
  };

  const loadOrders = async () => {
    try {
      const response = await supabase.functions.invoke('mercadopago-order-manager', {
        body: { action: 'list' }
      });
      if (!response.error) {
        setOrders(response.data?.results || []);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
    }
  };

  const deleteStore = async (storeId: string) => {
    if (!confirm('Are you sure you want to delete this store?')) return;
    
    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('mercadopago-store-manager', {
        body: {
          action: 'delete',
          storeId
        }
      });

      if (response.error) throw new Error(response.error.message);

      toast({
        title: "Success",
        description: "Store deleted successfully",
      });
      loadStores();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete store",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const cancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    
    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('mercadopago-order-manager', {
        body: {
          action: 'cancel',
          orderId
        }
      });

      if (response.error) throw new Error(response.error.message);

      toast({
        title: "Success",
        description: "Order cancelled successfully",
      });
      loadOrders();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel order",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
          {/* Stores Section */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-coffee-gold/10 flex items-center justify-center">
                <Store className="h-5 w-5 text-coffee-gold" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Stores Management</h3>
                <p className="text-sm text-muted-foreground">Manage your MercadoPago stores</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCreateStore(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Store
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={loadStores}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            {/* Create Store Dialog */}
            <CreateStoreDialog
              open={showCreateStore}
              onOpenChange={setShowCreateStore}
              onSubmit={createStore}
              isLoading={isLoading}
            />

            {/* Selected Store */}
            <div className="space-y-4">
              <div>
                <Label>Selected Store</Label>
                <Select value={settings.selectedStoreId || ''} onValueChange={(value) => updateSettings({ selectedStoreId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a store" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Stores List */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {stores.map((store) => (
                  <div
                    key={store.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{store.name}</p>
                      <p className="text-sm text-muted-foreground">ID: {store.id}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteStore(store.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                {stores.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No stores found. Create one to get started.
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* POS Section */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-coffee-gold/10 flex items-center justify-center">
                <Monitor className="h-5 w-5 text-coffee-gold" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">POS Management</h3>
                <p className="text-sm text-muted-foreground">Manage your Point of Sale systems</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCreatePOS(!showCreatePOS)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create POS
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={loadPOS}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            {/* Create POS Form */}
            {showCreatePOS && (
              <Card className="p-4 mb-4 bg-muted/50">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>POS Name</Label>
                      <Input
                        value={posForm.name}
                        onChange={(e) => setPosForm({...posForm, name: e.target.value})}
                        placeholder="Enter POS name"
                      />
                    </div>
                    <div>
                      <Label>Store</Label>
                      <Select value={posForm.external_store_id} onValueChange={(value) => setPosForm({...posForm, external_store_id: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select store" />
                        </SelectTrigger>
                        <SelectContent>
                          {stores.map((store) => (
                            <SelectItem key={store.id} value={store.id}>
                              {store.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Category</Label>
                    <Select value={posForm.category} onValueChange={(value) => setPosForm({...posForm, category: value})}>
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
                    <Button onClick={() => {/* createPOS logic */}} disabled={isLoading}>
                      Create POS
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowCreatePOS(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Selected POS */}
            <div className="space-y-4">
              <div>
                <Label>Selected POS</Label>
                <Select value={settings.selectedPosId || ''} onValueChange={(value) => updateSettings({ selectedPosId: value })}>
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
                      onClick={() => {/* deletePOS logic */}}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Terminals Section */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-pos-info/10 flex items-center justify-center">
                <Monitor className="h-5 w-5 text-pos-info" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Terminals Management</h3>
                <p className="text-sm text-muted-foreground">Manage Point payment terminals</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={loadTerminals}
                disabled={!settings.selectedPosId}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Terminals
              </Button>
            </div>

            {!settings.selectedPosId ? (
              <div className="text-center py-6">
                <Monitor className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Please select a POS first</p>
              </div>
            ) : (
              <>
                {/* Selected Terminal */}
                <div className="space-y-4">
                  <div>
                    <Label>Selected Terminal</Label>
                    <Select value={settings.selectedTerminalId || ''} onValueChange={(value) => updateSettings({ selectedTerminalId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a terminal" />
                      </SelectTrigger>
                      <SelectContent>
                        {terminals
                          .filter(terminal => terminal.pos_id === settings.selectedPosId)
                          .map((terminal) => (
                            <SelectItem key={terminal.id} value={terminal.id}>
                              {terminal.name} - {terminal.status}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Terminals List */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {terminals.map((terminal) => (
                      <div
                        key={terminal.id}
                        className="flex items-center justify-between p-3 border border-border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{terminal.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Status: {terminal.status} • ID: {terminal.id}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {terminal.pos_id === settings.selectedPosId ? (
                            <Button size="sm" variant="outline" disabled>
                              Assigned
                            </Button>
                          ) : (
                            <Button size="sm">
                              Assign
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </Card>

          {/* Orders Section */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-pos-warning/10 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-pos-warning" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Orders Management</h3>
                <p className="text-sm text-muted-foreground">View and manage Point orders</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={loadOrders}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Orders
              </Button>
            </div>

            {/* Orders List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg"
                >
                  <div>
                    <p className="font-medium">Order #{order.id}</p>
                    <p className="text-sm text-muted-foreground">
                      Status: {order.status} • Amount: ${order.amount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {order.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => cancelOrder(order.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    )}
                    {order.status === 'paid' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {/* refund logic */}}
                      >
                        Refund
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              
              {orders.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No orders found.
                </p>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};