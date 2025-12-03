import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Plus, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";

// --- Tipos de Dados ---
interface Product {
  id: number;
  code: string;
  barcode?: string;
  description: string;
  sale_price: number | string;
  stock_quantity: number;
}

interface StockMovement {
  id: number;
  product_code: string;
  product_description: string;
  quantity: number;
  type: 'ENTRADA' | 'SAIDA_MANUAL';
  observation: string | null;
  movement_date: string;
}

// --- Componente de Busca de Produto (Reutilizado de Sales.tsx) ---
function ProductSearch({ onProductSelect, selectedProduct }: { onProductSelect: (product: Product | null) => void; selectedProduct: Product | null; }) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const { data: products, isLoading } = useQuery<Product[]>({
      queryKey: ["products_search_stock", searchQuery],
      queryFn: async () => {
        if (searchQuery.length < 2) return [];
        // CORREÇÃO: Usar a nova API de busca que não filtra por estoque
        const response = await api.get("/products/search-for-stock", { params: { q: searchQuery } });
        return response.data;
      },
      enabled: searchQuery.length > 1,
    });

    useEffect(() => {
      if (!isLoading && products && products.length === 1 && products[0].barcode === searchQuery) {
        handleSelect(products[0]);
      }
    }, [products, isLoading, searchQuery]);

    const handleSelect = (product: Product) => {
      onProductSelect(product);
      setSearchQuery("");
      setOpen(false);
    };

    const triggerText = selectedProduct
      ? `${selectedProduct.code} - ${selectedProduct.description}`
      : "Buscar por código ou descrição...";

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between">
            {triggerText}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder="Buscar produto..." onValueChange={setSearchQuery} />
            <CommandList>
              {isLoading && <CommandItem disabled>Buscando...</CommandItem>}
              {!isLoading && !products?.length && searchQuery.length > 1 && <CommandItem disabled>Nenhum produto encontrado.</CommandItem>}
              <CommandGroup>
                {products?.map((product) => (
                  <CommandItem key={product.id} onSelect={() => handleSelect(product)} value={`${product.code} - ${product.description}`}>
                    {product.code} - {product.description}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
}


export default function StockEntry() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    product_id: "",
    quantity: "",
    observation: "",
  });

  const queryClient = useQueryClient();
  const isAdmin = user?.perfil === 'admin';

  const { data: stockMovements, isLoading: isLoadingMovements } = useQuery<StockMovement[]>({
    queryKey: ["stock_movements"],
    queryFn: async () => (await api.get("/stock-movements")).data,
  });

  const createMovementMutation = useMutation({
    mutationFn: (newData: typeof formData) => api.post("/stock-movements", newData).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock_movements"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products_search_stock"] }); // Invalida a busca também
      toast.success("Movimentação de estoque registrada com sucesso!");
      handleClose();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error(`Erro ao registrar movimentação: ${errorMessage}`);
    },
  });

  const handleProductSelect = (product: Product | null) => {
    setSelectedProduct(product);
    setFormData(prev => ({ ...prev, product_id: product ? product.id.toString() : "" }));
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedProduct(null);
    setFormData({ product_id: "", quantity: "", observation: "" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const quantityNum = parseInt(formData.quantity, 10);

    if (!isAdmin && quantityNum < 0) {
      toast.error("Permissão negada. Apenas administradores podem registrar saídas de estoque.");
      return;
    }

    if (!formData.product_id || !formData.quantity || isNaN(quantityNum) || quantityNum === 0) {
      toast.error("Selecione um produto e informe uma quantidade diferente de zero.");
      return;
    }

    if (quantityNum < 0 && !formData.observation) {
      toast.error("Para baixas de estoque (quantidades negativas), a observação é obrigatória.");
      return;
    }

    createMovementMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-foreground">Entrada/Saída Manual de Estoque</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Movimentação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Movimentação de Estoque</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="product">Produto</Label>
                <ProductSearch onProductSelect={handleProductSelect} selectedProduct={selectedProduct} />
              </div>
              <div>
                <Label htmlFor="quantity">Quantidade</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                  min={!isAdmin ? "0" : undefined}
                  placeholder={
                    isAdmin
                      ? "Use valores positivos para entrada e negativos para baixa"
                      : "Informe a quantidade de entrada"
                  }
                />
              </div>
              <div>
                <Label htmlFor="observation">Observação</Label>
                <Input
                  id="observation"
                  value={formData.observation}
                  onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
                  placeholder="Ex: Ajuste de inventário, Perda, etc."
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button type="submit" disabled={createMovementMutation.isPending}>
                  {createMovementMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead className="text-right">Quantidade</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Observação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingMovements ? (
              <TableRow><TableCell colSpan={6} className="text-center">Carregando histórico...</TableCell></TableRow>
            ) : stockMovements && stockMovements.length > 0 ? (
              stockMovements.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{new Date(entry.movement_date).toLocaleString('pt-BR')}</TableCell>
                  <TableCell>{entry.product_code}</TableCell>
                  <TableCell>{entry.product_description}</TableCell>
                  <TableCell className={`text-right font-medium ${entry.quantity < 0 ? 'text-red-500' : 'text-green-500'}`}>{entry.quantity}</TableCell>
                  <TableCell>{entry.type}</TableCell>
                  <TableCell>{entry.observation || '-'}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={6} className="text-center">Nenhuma movimentação registrada.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
