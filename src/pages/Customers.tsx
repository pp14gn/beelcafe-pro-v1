import { useState, useEffect } from "react";
import { Plus, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AddCustomerDialog from "@/components/AddCustomerDialog";
import CustomerDetailsDialog from "@/components/CustomerDetailsDialog";
import CustomerStatsCards from "@/components/loyalty/CustomerStatsCards";
import CustomerTable from "@/components/loyalty/CustomerTable";
import LoyaltyRewardsManager from "@/components/loyalty/LoyaltyRewardsManager";
import LoyaltyEventsManager from "@/components/loyalty/LoyaltyEventsManager";
import { calculateTier } from "@/components/loyalty/MembershipTierBadge";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  points: number;
  total_spent: number;
  visit_count: number;
  created_at: string;
  birthday: string | null;
  membership_tier: string;
}

const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("members");
  
  const { toast } = useToast();

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Update membership tiers based on total spent
      const customersWithTiers = (data || []).map(customer => ({
        ...customer,
        membership_tier: calculateTier(Number(customer.total_spent)),
      }));
      
      setCustomers(customersWithTiers);
      setFilteredCustomers(customersWithTiers);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load customers",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    const filtered = customers.filter(customer =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone?.includes(searchQuery)
    );
    setFilteredCustomers(filtered);
  }, [searchQuery, customers]);

  const handleCustomerAdded = () => {
    loadCustomers();
    setIsAddDialogOpen(false);
  };

  const handleCustomerClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailsDialogOpen(true);
  };

  const stats = {
    totalCustomers: customers.length,
    totalPoints: customers.reduce((sum, c) => sum + Number(c.points), 0),
    averageSpent: customers.length > 0
      ? customers.reduce((sum, c) => sum + Number(c.total_spent), 0) / customers.length
      : 0,
    goldMembers: customers.filter(c => c.membership_tier === 'gold').length,
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Loyalty Program</h1>
          <p className="text-sm text-muted-foreground">Manage members, rewards & events</p>
        </div>
        <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Member
        </Button>
      </div>

      <CustomerStatsCards stats={stats} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <CustomerTable
            customers={filteredCustomers}
            loading={loading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onCustomerClick={handleCustomerClick}
          />
        </TabsContent>

        <TabsContent value="rewards">
          <Card className="p-4">
            <LoyaltyRewardsManager />
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card className="p-4">
            <LoyaltyEventsManager />
          </Card>
        </TabsContent>
      </Tabs>

      <AddCustomerDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSuccess={handleCustomerAdded}
      />

      {selectedCustomer && (
        <CustomerDetailsDialog
          isOpen={isDetailsDialogOpen}
          onClose={() => {
            setIsDetailsDialogOpen(false);
            setSelectedCustomer(null);
          }}
          customer={selectedCustomer}
          onUpdate={loadCustomers}
        />
      )}
    </div>
  );
};

export default Customers;