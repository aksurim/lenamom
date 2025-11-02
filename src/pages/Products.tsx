import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Archive, Undo2, Printer } from "lucide-react";
import { toast } from "sonner";

// --- Tipos de Dados ---
interface Supplier { id: number; name: string; }
interface Product {
  id: number;
  code: string;
  barcode?: string;
  description: string;
  unit: "UND" | "PCT" | "CX";
  cost_price: number | string;
  sale_price: number | string;
  stock_quantity: number;
  min_quantity: number | string;
  supplier_id: number | string;
  supplier_name?: string;
  is_active: boolean;
}

type ProductFormData = {
    description: string;
    unit: "UND" | "PCT" | "CX";
    cost_price: string;
    sale_price: string;
    min_quantity: string;
    supplier_id: string;
};

const initialFormData: ProductFormData = {
    description: "",
    unit: "UND",
    cost_price: "",
    sale_price: "",
    min_quantity: "",
    supplier_id: "",
};

export default function Products() {
  const { user } = useAuth();
  const isAdmin = user?.perfil === 'admin';
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [showInactive, setShowInactive] = useState(false);

  const queryClient = useQueryClient();

  // --- Consultas de Dados (Queries) ---
  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["products", showInactive],
    queryFn: async () => {
      const response = await api.get(`/products?includeInactive=${showInactive}`);
      return response.data;
    },
    enabled: isAdmin || !showInactive,
  });

  const { data: suppliers, isLoading: isLoadingSuppliers } = useQuery<Supplier[]>({
    queryKey: ["suppliers"],
    queryFn: async () => api.get("/suppliers").then(res => res.data),
  });

  // --- Mutações (Mutations) ---
  const mutationOptions = {
    onSuccess: (data: { message?: string }) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(data.message || "Operação realizada com sucesso!");
      handleClose();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error(`Erro: ${errorMessage}`);
    },
  };

  const createMutation = useMutation({ mutationFn: (newData: ProductFormData) => api.post("/products", newData).then(res => res.data), ...mutationOptions });
  const updateMutation = useMutation({ mutationFn: ({ id, data }: { id: number; data: ProductFormData }) => api.put(`/products/${id}`, data).then(res => res.data), ...mutationOptions });
  const deleteMutation = useMutation({ mutationFn: (id: number) => api.delete(`/products/${id}`).then(res => res.data), ...mutationOptions });
  const reactivateMutation = useMutation({ mutationFn: (id: number) => api.put(`/products/${id}`, { is_active: true }).then(res => res.data), ...mutationOptions, onSuccess: (data) => { toast.success("Produto reativado com sucesso!"); queryClient.invalidateQueries({ queryKey: ["products"] }); } });

  // --- Manipuladores (Handlers) ---
  const handleClose = () => { setOpen(false); setEditingProduct(null); setFormData(initialFormData); };

  const handleEdit = (product: Product) => {
      setEditingProduct(product);
      setFormData({
          description: product.description,
          unit: product.unit,
          cost_price: String(product.cost_price),
          sale_price: String(product.sale_price),
          min_quantity: String(product.min_quantity),
          supplier_id: String(product.supplier_id)
      });
      setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplier_id) {
      toast.error("Por favor, selecione um fornecedor.");
      return;
    }

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (product: Product) => { if (confirm(`Tem certeza que deseja excluir o produto "${product.description}"?\n\nSe o produto tiver histórico, ele será INATIVADO.`)) { deleteMutation.mutate(product.id); } };

  // --- Função Mock de Impressão de Etiqueta ---
  const print_label_mdk006 = (barcode: string, description: string) => {
    const labelWindow = window.open('', '_blank', 'width=480,height=300');
    if (labelWindow) {
      labelWindow.document.write(`
        <html>
          <head>
            <title>Etiqueta - ${description}</title>
            <style>
              @page { size: 120mm 60mm; margin: 0; }
              body { font-family: sans-serif; margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; width: 120mm; height: 60mm; box-sizing: border-box; }
              .label { text-align: center; padding: 5mm; width: 100%; height: 100%; box-sizing: border-box; border: 1px dashed #ccc; }
              .description { font-size: 14pt; font-weight: bold; margin: 0 0 10mm 0; }
              .barcode { font-family: monospace; font-size: 18pt; margin: 0; }
            </style>
          </head>
          <body>
            <div class="label">
              <div class="description">${description}</div>
              <div class="barcode">${barcode}</div>
            </div>
            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() { window.close(); };
              }
            </script>
          </body>
        </html>
      `);
      labelWindow.document.close();
    }
  };

  return (
    <div className="space-y-6">
      <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); else setOpen(true); }}>
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-foreground">Produtos</h2>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <div className="flex items-center space-x-2">
                <Checkbox id="show-inactive" checked={showInactive} onCheckedChange={() => setShowInactive(!showInactive)} />
                <Label htmlFor="show-inactive">Mostrar Inativos</Label>
              </div>
            )}
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo Produto</Button></DialogTrigger>
          </div>
        </div>

        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingProduct ? "Editar Produto" : "Novo Produto"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2"><Label htmlFor="description">Descrição*</Label><Input id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required /></div>
            {editingProduct && (
                <div className="col-span-2"><Label>Código de Barras (EAN-13)</Label><Input value={editingProduct.barcode || 'N/A'} readOnly /></div>
            )}
            <div className="col-span-2"><Label htmlFor="supplier_id">Fornecedor*</Label><Select value={formData.supplier_id} onValueChange={(value) => setFormData({ ...formData, supplier_id: value })} required><SelectTrigger><SelectValue placeholder={isLoadingSuppliers ? "Carregando..." : "Selecione"} /></SelectTrigger><SelectContent>{suppliers?.map((s) => (<SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>))}</SelectContent></Select></div>
            <div><Label htmlFor="unit">Unidade*</Label><Select value={formData.unit} onValueChange={(v: any) => setFormData({ ...formData, unit: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="UND">Unidade</SelectItem><SelectItem value="PCT">Pacote</SelectItem><SelectItem value="CX">Caixa</SelectItem></SelectContent></Select></div>
            <div><Label htmlFor="min_quantity">Estoque Mínimo*</Label><Input id="min_quantity" type="number" value={formData.min_quantity} onChange={(e) => setFormData({ ...formData, min_quantity: e.target.value })} required /></div>
            <div><Label htmlFor="cost_price">Preço de Custo*</Label><Input id="cost_price" type="number" step="0.01" value={formData.cost_price} onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })} required /></div>
            <div><Label htmlFor="sale_price">Preço de Venda*</Label><Input id="sale_price" type="number" step="0.01" value={formData.sale_price} onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })} required /></div>
            <DialogFooter className="col-span-2 mt-4">
              <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{(createMutation.isPending || updateMutation.isPending) ? "Salvando..." : (editingProduct ? "Atualizar" : "Criar")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Cód. Barras</TableHead><TableHead>Descrição</TableHead><TableHead>Fornecedor</TableHead><TableHead className="text-right">Estoque</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoadingProducts ? (
              <TableRow><TableCell colSpan={6} className="text-center">Carregando...</TableCell></TableRow>
            ) : products && products.length > 0 ? (
              products.map((product) => (
                <TableRow key={product.id} className={!product.is_active ? "text-muted-foreground/50" : ""}>
                  <TableCell className="font-medium">{product.code}{!product.is_active && <Archive className="h-3 w-3 inline-block ml-2"/>}</TableCell>
                  <TableCell>{product.barcode || '-'}</TableCell>
                  <TableCell>{product.description}</TableCell>
                  <TableCell>{product.supplier_name || "-"}</TableCell>
                  <TableCell className="text-right">{product.stock_quantity}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="ghost" onClick={() => print_label_mdk006(product.barcode || 'N/A', product.description)} disabled={!product.barcode}><Printer className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(product)} disabled={!product.is_active}><Pencil className="h-4 w-4" /></Button>
                      {isAdmin && (
                        <>
                          {product.is_active ? (
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(product)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          ) : (
                            <Button size="icon" variant="ghost" onClick={() => reactivateMutation.mutate(product.id)}><Undo2 className="h-4 w-4 text-green-500"/></Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={6} className="text-center">Nenhum produto encontrado.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
