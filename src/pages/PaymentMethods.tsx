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

interface PaymentMethod {
  id: number;
  code: string;
  description: string;
}

type PaymentMethodFormData = Omit<PaymentMethod, 'id' | 'code'>;

export default function PaymentMethods() {
  const { user } = useAuth();
  const isAdmin = user?.perfil === 'admin';
  const [open, setOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [formData, setFormData] = useState<Partial<PaymentMethodFormData>>({});

  const queryClient = useQueryClient();

  const { data: paymentMethods, isLoading } = useQuery<PaymentMethod[]>({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const response = await api.get("/payment-methods");
      return response.data;
    },
  });

  const mutationOptions = {
    onSuccess: (data: { message?: string }) => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      toast.success(data.message || "Operação realizada com sucesso!");
      handleClose();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error(`Erro: ${errorMessage}`);
    },
  };

  const createMutation = useMutation({ mutationFn: (newMethod: Partial<PaymentMethodFormData>) => api.post("/payment-methods", newMethod).then(res => res.data), ...mutationOptions });
  const updateMutation = useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<PaymentMethodFormData> }) => api.put(`/payment-methods/${id}`, data).then(res => res.data), ...mutationOptions });
  const deleteMutation = useMutation({ mutationFn: (id: number) => api.delete(`/payment-methods/${id}`).then(res => res.data), ...mutationOptions });

  const handleClose = () => {
    setOpen(false);
    setEditingMethod(null);
    setFormData({});
  };

  const handleEdit = (method: PaymentMethod) => {
    setEditingMethod(method);
    setFormData({ description: method.description });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description) {
      toast.error("A descrição é obrigatória.");
      return;
    }
    if (editingMethod) {
      updateMutation.mutate({ id: editingMethod.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-6">
      <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); else setOpen(true); }}>
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-foreground">Formas de Pagamento</h2>
          <div className="flex items-center gap-4">
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nova Forma de Pagamento</Button>
            </DialogTrigger>
          </div>
        </div>

        <DialogContent>
          <DialogHeader><DialogTitle>{editingMethod ? "Editar Forma de Pagamento" : "Nova Forma de Pagamento"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div>
              <Label htmlFor="description">Descrição*</Label>
              <Input
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ description: e.target.value })}
                required
                placeholder="Ex: Dinheiro, Cartão de Crédito, PIX..."
              />
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{(createMutation.isPending || updateMutation.isPending) ? "Salvando..." : (editingMethod ? "Atualizar" : "Criar")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={3} className="text-center">Carregando...</TableCell></TableRow>
            ) : paymentMethods && paymentMethods.length > 0 ? (
              paymentMethods.map((method) => (
                <TableRow key={method.id}>
                  <TableCell className="font-medium">{method.code}</TableCell>
                  <TableCell>{method.description}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(method)}><Pencil className="h-4 w-4" /></Button>
                      {isAdmin && (
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Tem certeza que deseja excluir a forma de pagamento "${method.description}"?`)) { deleteMutation.mutate(method.id); } }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={3} className="text-center">Nenhuma forma de pagamento cadastrada</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
