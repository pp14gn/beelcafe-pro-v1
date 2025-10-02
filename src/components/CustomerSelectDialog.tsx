import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AddCustomerDialog from "./AddCustomerDialog";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  points: number;
}

interface CustomerSelectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (customer: Customer) => void;
}

const CustomerSelectDialog = ({
  isOpen,
  onClose,
  onSelect,
}: CustomerSelectDialogProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email, phone, points')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
      setFilteredCustomers(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load customers",
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCustomers();
      setSearchQuery("");
    }
  }, [isOpen]);

  useEffect(() => {
    const filtered = customers.filter(customer =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone?.includes(searchQuery)
    );
    setFilteredCustomers(filtered);
  }, [searchQuery, customers]);

  const handleSelect = (customer: Customer) => {
    onSelect(customer);
    onClose();
  };

  const handleCustomerAdded = () => {
    loadCustomers();
    setIsAddDialogOpen(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Customer</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No customers found</p>
                </div>
              ) : (
                filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => handleSelect(customer)}
                    className="w-full p-3 border rounded-lg hover:bg-muted/50 text-left transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        {customer.email && (
                          <p className="text-xs text-muted-foreground">{customer.email}</p>
                        )}
                        {customer.phone && (
                          <p className="text-xs text-muted-foreground">{customer.phone}</p>
                        )}
                      </div>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Gift className="h-3 w-3" />
                        {Number(customer.points).toFixed(0)}
                      </Badge>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(true)}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Customer
              </Button>
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddCustomerDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSuccess={handleCustomerAdded}
      />
    </>
  );
};

export default CustomerSelectDialog;
