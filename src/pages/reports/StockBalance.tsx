import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileDown, DollarSign, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { generateStandardPdf } from "@/lib/pdfUtils";
import autoTable from 'jspdf-autotable';

// --- Tipos de Dados ---
interface StockBalanceProduct {
  code: string;
  description: string;
  stock_quantity: number;
  cost_price: number;
  sale_price: number;
  total_cost_value: number;
  total_sale_value: number;
}

interface StockBalanceReport {
  products: StockBalanceProduct[];
  totals: {
    totalCost: number;
    totalSale: number;
  };
}

interface Supplier {
  id: number;
  name: string;
}

interface StockForCountingProduct {
  code: string;
  description: string;
  stock_quantity: number;
  is_active: boolean;
}

const formatCurrency = (value: number) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// --- Componente Principal ---
export default function StockBalance() {
  const [isGeneratingCountSheet, setIsGeneratingCountSheet] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');

  // Query para buscar os fornecedores para o filtro
  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ["suppliers"],
    queryFn: async () => (await api.get("/suppliers")).data,
  });

  // Query principal, agora dependente do fornecedor selecionado
  const { data, isLoading, error } = useQuery<StockBalanceReport>({
    queryKey: ["stockBalance", selectedSupplier], // Adiciona o filtro à chave da query
    queryFn: async () => {
      const response = await api.get("/reports/stock-balance", {
        params: { supplierId: selectedSupplier }, // Passa o filtro como parâmetro
      });
      return response.data;
    },
  });

  if (error) {
    const errorMessage = (error as any).response?.data?.message || error.message;
    toast.error(`Erro ao carregar balanço de estoque: ${errorMessage}`);
  }

  const handleGenerateStockCountSheet = async () => {
    setIsGeneratingCountSheet(true);
    try {
      const response = await api.get<StockForCountingProduct[]>("/reports/stock-for-counting");
      const productsForCounting = response.data;

      generateStandardPdf({
        fileName: `Folha_Contagem_Estoque_${new Date().toISOString().split('T')[0]}`,
        title: "Folha de Contagem de Estoque",
        drawContent: (doc, startY) => {
          autoTable(doc, {
            head: [['Código', 'Produto', 'Qtd. (Sistema)', 'Contagem (Manual)']],
            body: productsForCounting.map(p => [
              p.code,
              p.is_active ? p.description : `${p.description} (INATIVO)`,
              p.stock_quantity,
              ''
            ]),
            startY: startY,
            theme: 'grid',
            headStyles: { fillColor: [0, 0, 0] },
          });
        }
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error(`Erro ao gerar PDF: ${errorMessage}`);
    } finally {
      setIsGeneratingCountSheet(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-foreground">Balanço de Estoque</h2>
        <div className="w-full max-w-sm">
          <Label htmlFor="supplier-filter">Filtrar por Fornecedor</Label>
          <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
            <SelectTrigger id="supplier-filter">
              <SelectValue placeholder="Selecione um fornecedor..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Fornecedores</SelectItem>
              {suppliers?.map(supplier => (
                <SelectItem key={supplier.id} value={supplier.id.toString()}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Seção de Balanço Financeiro */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Total do Estoque</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-32 bg-muted rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(data?.totals.totalCost || 0)}</div>
            )}
            <p className="text-xs text-muted-foreground">Valor investido nos produtos filtrados.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Potencial de Venda do Estoque</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-32 bg-muted rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(data?.totals.totalSale || 0)}</div>
            )}
            <p className="text-xs text-muted-foreground">Receita total se o estoque filtrado for vendido.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Inventário Detalhado</CardTitle></CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead className="text-right">Qtd.</TableHead><TableHead className="text-right">Custo Unit.</TableHead><TableHead className="text-right">Custo Total</TableHead><TableHead className="text-right">Venda Unit.</TableHead><TableHead className="text-right">Potencial Venda</TableHead></TableRow></TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center">Carregando inventário...</TableCell></TableRow>
                ) : data?.products && data.products.length > 0 ? (
                  data.products.map(p => (
                    <TableRow key={p.code}>
                      <TableCell>{p.description}</TableCell>
                      <TableCell className="text-right font-medium">{p.stock_quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(p.cost_price))}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(Number(p.total_cost_value))}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(p.sale_price))}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(Number(p.total_sale_value))}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={6} className="text-center">Nenhum produto encontrado para o filtro selecionado.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Seção da Folha de Contagem de Estoque */}
      <Card>
        <CardHeader><CardTitle>Ferramenta de Contagem de Estoque</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">Gere uma folha em PDF com todos os produtos cadastrados para auxiliar na contagem manual do seu inventário físico.</p>
          <Button onClick={handleGenerateStockCountSheet} disabled={isGeneratingCountSheet}>
            {isGeneratingCountSheet ? 'Gerando...' : <><FileDown className="h-4 w-4 mr-2" /> Gerar PDF para Contagem</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
