import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, History } from "lucide-react";
import { toast } from "sonner";

// --- Interfaces ---
interface Customer {
  id: number;
  code: string;
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  address_street?: string;
  address_number?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_zipcode?: string;
  birth_date?: string;
}
type CustomerFormData = Omit<Customer, 'id' | 'code'>;

interface SaleItem {
  quantity: number;
  unit_price: number;
  subtotal: number;
  description: string;
}

interface Purchase {
  id: number;
  sale_code: string;
  created_at: string;
  total_amount: number;
  items: SaleItem[];
}

interface PurchaseProfile {
  mostPurchased: {
    description: string;
    total_quantity: number;
  }[];
  purchaseCount: number;
  frequency: string;
}

// --- Sub-componentes para o Modal de Detalhes ---

function PurchaseHistoryTab({ customerId }: { customerId: number }) {
  const { data: history, isLoading, error } = useQuery<Purchase[]>({
    queryKey: ["purchaseHistory", customerId],
    queryFn: async () => api.get(`/customers/${customerId}/purchase-history`).then(res => res.data),
    enabled: !!customerId,
  });

  if (isLoading) return <div className="text-center p-4">Carregando histórico...</div>;
  if (error) return <div className="text-center p-4 text-red-500">Erro ao carregar o histórico.</div>;
  if (!history || history.length === 0) return <div className="text-center p-4">Nenhuma compra encontrada.</div>;

  return (
    <div className="space-y-4 max-h-[400px] overflow-y-auto p-1">
      {history.map(purchase => (
        <div key={purchase.id} className="border rounded-md p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold">{purchase.sale_code}</span>
            <span className="text-sm text-muted-foreground">{new Date(purchase.created_at).toLocaleDateString('pt-BR')}</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Qtd.</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchase.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{item.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="text-right font-bold mt-2">Total do Pedido: {purchase.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
        </div>
      ))}
    </div>
  );
}

function PurchaseProfileTab({ customerId }: { customerId: number }) {
  const { data: profile, isLoading, error } = useQuery<PurchaseProfile>({
    queryKey: ["purchaseProfile", customerId],
    queryFn: async () => api.get(`/customers/${customerId}/purchase-profile`).then(res => res.data),
    enabled: !!customerId,
  });

  if (isLoading) return <div className="text-center p-4">Carregando perfil...</div>;
  if (error) return <div className="text-center p-4 text-red-500">Erro ao carregar o perfil.</div>;
  if (!profile) return <div className="text-center p-4">Não foi possível gerar o perfil.</div>;

  return (
    <div className="space-y-4 p-4">
      <div><span className="font-semibold">Frequência de Compra:</span> {profile.frequency}</div>
      <div><span className="font-semibold">Total de Compras:</span> {profile.purchaseCount}</div>
      <div className="mt-4">
        <h4 className="font-semibold mb-2">Produtos Mais Comprados:</h4>
        {profile.mostPurchased.length > 0 ? (
          <ul className="list-disc list-inside">
            {profile.mostPurchased.map((item, index) => (
              <li key={index}>{item.description} ({item.total_quantity} unidades)</li>
            ))}
          </ul>
        ) : (
          <p>Nenhum produto para exibir.</p>
        )}
      </div>
    </div>
  );
}

// --- Componente Principal ---

export default function Customers() {
  const { user } = useAuth();
  const isAdmin = user?.perfil === 'admin';
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<Partial<CustomerFormData>>({});

  const queryClient = useQueryClient();

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: async () => api.get("/customers").then(res => res.data),
  });

  const mutationOptions = {
    onSuccess: (data: { message?: string }) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success(data.message || "Operação realizada com sucesso!");
      handleFormClose();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error(`Erro: ${errorMessage}`);
    },
  };

  const createMutation = useMutation({ mutationFn: (newCustomer: Partial<CustomerFormData>) => api.post("/customers", newCustomer).then(res => res.data), ...mutationOptions });
  const updateMutation = useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<CustomerFormData> }) => api.put(`/customers/${id}`, data).then(res => res.data), ...mutationOptions });
  const deleteMutation = useMutation({ mutationFn: (id: number) => api.delete(`/customers/${id}`).then(res => res.data), ...mutationOptions });

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingCustomer(null);
    setFormData({});
  };

  const handleDetailsClose = () => {
    setDetailsOpen(false);
    setSelectedCustomer(null);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    // CORREÇÃO FINAL: Mapeia explicitamente cada campo para o estado do formulário
    setFormData({
        name: customer.name,
        document: customer.document,
        phone: customer.phone,
        email: customer.email,
        address_street: customer.address_street,
        address_number: customer.address_number,
        address_neighborhood: customer.address_neighborhood,
        address_city: customer.address_city,
        address_state: customer.address_state,
        address_zipcode: customer.address_zipcode,
        birth_date: customer.birth_date,
    });
    setFormOpen(true);
  };

  const handleOpenDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("O nome do cliente é obrigatório.");
      return;
    }
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-foreground">Clientes</h2>
        <Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4 mr-2" />Novo Cliente</Button>
      </div>

      {/* --- Modal de Criar/Editar Cliente --- */}
      <Dialog open={formOpen} onOpenChange={(isOpen) => { if (!isOpen) handleFormClose(); else setFormOpen(true); }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>{editingCustomer ? "Editar Cliente" : "Novo Cliente"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="grid grid-cols-4 gap-4 py-4">
            <div className="col-span-4 sm:col-span-2"><Label htmlFor="name">Nome*</Label><Input id="name" value={formData.name || ''} onChange={handleInputChange} required /></div>
            <div className="col-span-4 sm:col-span-2"><Label htmlFor="document">CPF/CNPJ</Label><Input id="document" value={formData.document || ''} onChange={handleInputChange} /></div>
            <div className="col-span-4 sm:col-span-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={formData.email || ''} onChange={handleInputChange} /></div>
            <div className="col-span-4 sm:col-span-2"><Label htmlFor="phone">Telefone</Label><Input id="phone" value={formData.phone || ''} onChange={handleInputChange} /></div>
            <div className="col-span-4 sm:col-span-2"><Label htmlFor="birth_date">Data de Nascimento</Label><Input id="birth_date" type="date" value={formData.birth_date ? formData.birth_date.split('T')[0] : ''} onChange={handleInputChange} /></div>
            <div className="col-span-4 border-t pt-4 mt-4"><h3 className="text-lg font-medium">Endereço</h3></div>
            <div className="col-span-4 sm:col-span-3"><Label htmlFor="address_street">Rua/Avenida</Label><Input id="address_street" value={formData.address_street || ''} onChange={handleInputChange} /></div>
            <div className="col-span-4 sm:col-span-1"><Label htmlFor="address_number">Número</Label><Input id="address_number" value={formData.address_number || ''} onChange={handleInputChange} /></div>
            <div className="col-span-4 sm:col-span-2"><Label htmlFor="address_neighborhood">Bairro</Label><Input id="address_neighborhood" value={formData.address_neighborhood || ''} onChange={handleInputChange} /></div>
            <div className="col-span-4 sm:col-span-2"><Label htmlFor="address_city">Cidade</Label><Input id="address_city" value={formData.address_city || ''} onChange={handleInputChange} /></div>
            <div className="col-span-4 sm:col-span-2"><Label htmlFor="address_state">Estado</Label><Input id="address_state" value={formData.address_state || ''} onChange={handleInputChange} /></div>
            <div className="col-span-4 sm:col-span-2"><Label htmlFor="address_zipcode">CEP</Label><Input id="address_zipcode" value={formData.address_zipcode || ''} onChange={handleInputChange} /></div>
            <DialogFooter className="col-span-4 mt-4">
              <Button type="button" variant="outline" onClick={handleFormClose}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{(createMutation.isPending || updateMutation.isPending) ? "Salvando..." : (editingCustomer ? "Atualizar" : "Criar")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- Modal de Detalhes do Cliente --- */}
      <Dialog open={detailsOpen} onOpenChange={(isOpen) => { if (!isOpen) handleDetailsClose(); else setDetailsOpen(true); }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Detalhes de {selectedCustomer?.name}</DialogTitle></DialogHeader>
          {selectedCustomer && (
            <Tabs defaultValue="history" className="py-4">
              <TabsList>
                <TabsTrigger value="history">Histórico de Compras</TabsTrigger>
                <TabsTrigger value="profile">Perfil de Compra</TabsTrigger>
              </TabsList>
              <TabsContent value="history">
                <PurchaseHistoryTab customerId={selectedCustomer.id} />
              </TabsContent>
              <TabsContent value="profile">
                <PurchaseProfileTab customerId={selectedCustomer.id} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* --- Tabela de Clientes --- */}
      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Nascimento</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center">Carregando...</TableCell></TableRow>
            ) : customers && customers.length > 0 ? (
              customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.code}</TableCell>
                  <TableCell>{customer.name}</TableCell>
                  <TableCell>{customer.phone || '-'}</TableCell>
                  <TableCell>{customer.birth_date ? new Date(customer.birth_date).toLocaleDateString("pt-BR", { timeZone: 'UTC' }) : '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="ghost" onClick={() => handleOpenDetails(customer)}><History className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(customer)}><Pencil className="h-4 w-4" /></Button>
                      {isAdmin && (
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Tem certeza que deseja excluir o cliente "${customer.name}"?`)) { deleteMutation.mutate(customer.id); } }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={5} className="text-center">Nenhum cliente cadastrado</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
