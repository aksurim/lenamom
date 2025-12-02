import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { sendTsplOverUsb } from "@/lib/usbPrinter"; // CORREÇÃO: Importa apenas a função unificada

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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Archive, Undo2, Printer, Search } from "lucide-react";
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

// --- COMPONENTE MODAL DE IMPRESSÃO DE ETIQUETA (REFATORADO) ---
function PrintLabelModal({ product, isOpen, onClose }: { product: Product | null; isOpen: boolean; onClose: () => void; }) {
    const [copies, setCopies] = useState(1);
    const [isPrinting, setIsPrinting] = useState(false);

    const handlePrint = async () => {
        if (!product || copies < 1) return;
        setIsPrinting(true);

        const printPromise = async () => {
            // 1. Obter o comando TSPL do backend
            const generateResponse = await api.post('/products/generate-label', { productId: product.id });
            const { tsplCommand } = generateResponse.data;
            if (!tsplCommand) throw new Error("Comando TSPL não foi gerado pelo servidor.");

            // 2. Enviar o comando em loop usando a nova função unificada
            for (let i = 0; i < copies; i++) {
                // A cada chamada, a função pedirá o dispositivo (se necessário) e enviará o comando.
                await sendTsplOverUsb(tsplCommand);
            }
        };

        toast.promise(printPromise(), {
            loading: `Enviando ${copies} etiqueta(s)... Por favor, selecione a impressora na janela do navegador, se solicitado.`,
            success: `${copies} etiqueta(s) enviada(s) com sucesso!`,
            error: (err: any) => `Falha na impressão: ${err.message || 'Erro desconhecido.'}`,
            finally: () => {
                setIsPrinting(false);
                onClose(); // Fecha o modal após a conclusão
            },
        });
    };

    if (!product) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Imprimir Etiqueta via USB</DialogTitle>
                    <DialogDescription>
                        Confirme os detalhes e a quantidade de cópias para a etiqueta do produto.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div>
                        <Label>Produto</Label>
                        <p className="font-semibold">{product.description}</p>
                        <p className="text-sm text-muted-foreground">{product.code} | {product.barcode}</p>
                    </div>
                    <div>
                        <Label htmlFor="copies">Quantidade de Cópias</Label>
                        <Input 
                            id="copies" 
                            type="number" 
                            value={copies} 
                            onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-32"
                            min="1"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isPrinting}>Cancelar</Button>
                    <Button onClick={handlePrint} disabled={isPrinting}>
                        {isPrinting ? "Imprimindo..." : `Imprimir ${copies} cópia(s)`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


export default function Products() {
  const { user } = useAuth();
  const isAdmin = user?.perfil === 'admin';
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [showInactive, setShowInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [productToPrint, setProductToPrint] = useState<Product | null>(null);

  const queryClient = useQueryClient();

  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["products", showInactive],
    queryFn: async () => {
      const response = await api.get(`/products?includeInactive=${showInactive}`);
      return response.data;
    },
    enabled: isAdmin || !showInactive,
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(product =>
      product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const { data: suppliers, isLoading: isLoadingSuppliers } = useQuery<Supplier[]>({
    queryKey: ["suppliers"],
    queryFn: async () => api.get("/suppliers").then(res => res.data),
  });

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

  return (
    <>
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

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por código ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="bg-card rounded-lg border">
          <Table>
            <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Cód. Barras</TableHead><TableHead>Descrição</TableHead><TableHead>Fornecedor</TableHead><TableHead className="text-right">Estoque</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoadingProducts ? (
                <TableRow><TableCell colSpan={6} className="text-center">Carregando...</TableCell></TableRow>
              ) : filteredProducts && filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <TableRow key={product.id} className={!product.is_active ? "text-muted-foreground/50" : ""}>
                    <TableCell className="font-medium">{product.code}{!product.is_active && <Archive className="h-3 w-3 inline-block ml-2"/>}</TableCell>
                    <TableCell>{product.barcode || '-'}</TableCell>
                    <TableCell>{product.description}</TableCell>
                    <TableCell>{product.supplier_name || "-"}</TableCell>
                    <TableCell className="text-right">{product.stock_quantity}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => setProductToPrint(product)}
                          disabled={!product.barcode}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
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
      <PrintLabelModal 
        isOpen={!!productToPrint}
        onClose={() => setProductToPrint(null)}
        product={productToPrint}
      />
    </>
  );
}
