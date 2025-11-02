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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Supplier {
  id: number;
  code: string;
  name: string;
  document?: string;
  sales_person?: string;
  email?: string;
  phone1?: string;
  phone2?: string;
  phone3?: string;
  address_street?: string;
  address_number?: string;
  address_neighborhood?: string;
  address_state?: string;
}

type SupplierFormData = Omit<Supplier, 'id' | 'code'>;

export default function Suppliers() {
  const { user } = useAuth();
  const isAdmin = user?.perfil === 'admin';
  const [open, setOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<Partial<SupplierFormData>>({});

  const queryClient = useQueryClient();

  const { data: suppliers, isLoading } = useQuery<Supplier[]>({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const response = await api.get("/suppliers");
      return response.data;
    },
  });

  const mutationOptions = {
    onSuccess: (data: { message?: string }) => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success(data.message || "Operação realizada com sucesso!");
      handleClose();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error(`Erro: ${errorMessage}`);
    },
  };

  const createMutation = useMutation({ mutationFn: (newSupplier: Partial<SupplierFormData>) => api.post("/suppliers", newSupplier).then(res => res.data), ...mutationOptions });
  const updateMutation = useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<SupplierFormData> }) => api.put(`/suppliers/${id}`, data).then(res => res.data), ...mutationOptions });
  const deleteMutation = useMutation({ mutationFn: (id: number) => api.delete(`/suppliers/${id}`).then(res => res.data), ...mutationOptions });

  const handleClose = () => {
    setOpen(false);
    setEditingSupplier(null);
    setFormData({});
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData(supplier);
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
        toast.error("O nome do fornecedor é obrigatório.");
        return;
    }
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  }

  return (
    <div className="space-y-6">
      <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); else setOpen(true); }}>
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-foreground">Fornecedores</h2>
          <div className="flex items-center gap-4">
            {/* Botão "Novo Fornecedor" visível para todos os usuários logados */}
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Novo Fornecedor</Button>
            </DialogTrigger>
          </div>
        </div>

        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{editingSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2"><Label htmlFor="name">Nome do Fornecedor*</Label><Input id="name" value={formData.name || ''} onChange={handleInputChange} required /></div>
            <div><Label htmlFor="document">CNPJ ou CPF</Label><Input id="document" value={formData.document || ''} onChange={handleInputChange} /></div>
            <div><Label htmlFor="sales_person">Nome do Vendedor</Label><Input id="sales_person" value={formData.sales_person || ''} onChange={handleInputChange} /></div>
            <div className="col-span-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={formData.email || ''} onChange={handleInputChange} /></div>
            <div><Label htmlFor="phone1">Telefone 1</Label><Input id="phone1" value={formData.phone1 || ''} onChange={handleInputChange} /></div>
            <div><Label htmlFor="phone2">Telefone 2</Label><Input id="phone2" value={formData.phone2 || ''} onChange={handleInputChange} /></div>
            <div><Label htmlFor="phone3">Telefone 3</Label><Input id="phone3" value={formData.phone3 || ''} onChange={handleInputChange} /></div>
            <div className="col-span-2"><Label htmlFor="address_street">Endereço (Rua/Av)</Label><Input id="address_street" value={formData.address_street || ''} onChange={handleInputChange} /></div>
            <div><Label htmlFor="address_number">Número</Label><Input id="address_number" value={formData.address_number || ''} onChange={handleInputChange} /></div>
            <div><Label htmlFor="address_neighborhood">Bairro</Label><Input id="address_neighborhood" value={formData.address_neighborhood || ''} onChange={handleInputChange} /></div>
            <div><Label htmlFor="address_state">Estado</Label><Input id="address_state" value={formData.address_state || ''} onChange={handleInputChange} /></div>
            <DialogFooter className="col-span-2 mt-4">
              <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{(createMutation.isPending || updateMutation.isPending) ? "Salvando..." : (editingSupplier ? "Atualizar" : "Criar")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Telefone</TableHead>
              {/* Coluna de Ações sempre visível */}
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center">Carregando...</TableCell></TableRow>
            ) : suppliers && suppliers.length > 0 ? (
              suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.code}</TableCell>
                  <TableCell>{supplier.name}</TableCell>
                  <TableCell>{supplier.sales_person || '-'}</TableCell>
                  <TableCell>{supplier.phone1 || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {/* Botão "Editar" visível para todos os usuários logados */}
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(supplier)}><Pencil className="h-4 w-4" /></Button>
                      {/* Botão "Excluir" visível apenas para administradores */}
                      {user?.perfil === 'admin' && (
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Tem certeza que deseja excluir o fornecedor "${supplier.name}"?`)) { deleteMutation.mutate(supplier.id); } }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={5} className="text-center">Nenhum fornecedor cadastrado</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
