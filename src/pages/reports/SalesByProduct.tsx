import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import { generateStandardPdf } from "@/lib/pdfUtils"; // <-- Corrigido
import autoTable from 'jspdf-autotable';

// --- Tipos de Dados ---
interface Product { id: number; description: string; }
interface Supplier { id: number; name: string; }
interface ReportRow {
  product_id: number;
  product_code: string;
  product_description: string;
  total_quantity_sold: number | string;
  total_amount_invoiced: number | string;
}

const formatCurrency = (value: number) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// --- Componente Principal ---
export default function SalesByProduct() {
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [productId, setProductId] = useState<string>('all');
  const [supplierId, setSupplierId] = useState<string>('all');
  const [reportData, setReportData] = useState<ReportRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data: products } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => (await api.get("/products?includeInactive=false")).data,
  });

  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ["suppliers"],
    queryFn: async () => (await api.get("/suppliers")).data,
  });

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      toast.error("Por favor, selecione a data de início e de fim.");
      return;
    }
    setIsLoading(true);
    setReportData(null);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    const params = {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        productId: productId,
        supplierId: supplierId,
    };

    try {
      const response = await api.get("/reports/sales-by-product", { params });
      setReportData(response.data);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error(`Erro ao gerar relatório: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPdf = () => {
    if (!reportData || !startDate || !endDate) return;

    const formattedStartDate = startDate.toLocaleDateString('pt-BR');
    const formattedEndDate = endDate.toLocaleDateString('pt-BR');

    generateStandardPdf({ // <-- Corrigido
      fileName: `Relatorio_Vendas_Produto_${new Date().toISOString().split('T')[0]}`,
      title: "Relatório de Vendas por Produto",
      drawContent: (doc, startY) => {
        doc.setFontSize(10);
        doc.text(`Período: ${formattedStartDate} a ${formattedEndDate}`, doc.internal.pageSize.getWidth() / 2, startY - 10, { align: 'center' });

        autoTable(doc, {
          head: [["Código", "Produto", "Qtd. Vendida", "Valor Faturado"]],
          body: reportData.map(row => [
            row.product_code,
            row.product_description,
            Number(row.total_quantity_sold),
            formatCurrency(Number(row.total_amount_invoiced))
          ]),
          startY: startY,
          theme: 'grid',
          headStyles: { fillColor: [0, 0, 0] },
        });
      }
    });
  };

  const totals = useMemo(() => {
    if (!reportData) return { totalItems: 0, totalRevenue: 0 };
    return reportData.reduce((acc, row) => ({
      totalItems: acc.totalItems + Number(row.total_quantity_sold),
      totalRevenue: acc.totalRevenue + Number(row.total_amount_invoiced),
    }), { totalItems: 0, totalRevenue: 0 });
  }, [reportData]);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-foreground">Relatório de Vendas por Produto</h2>
      <Card>
        <CardHeader><CardTitle>Filtros do Relatório</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2"><Label htmlFor="start-date">Data de Início</Label><DatePicker id="start-date" date={startDate} onSelect={setStartDate} /></div>
            <div className="space-y-2"><Label htmlFor="end-date">Data de Fim</Label><DatePicker id="end-date" date={endDate} onSelect={setEndDate} /></div>

            <div className="space-y-2"><Label htmlFor="supplier-select">Fornecedor</Label>
              <Select onValueChange={setSupplierId} defaultValue="all">
                <SelectTrigger id="supplier-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Fornecedores</SelectItem>
                  {suppliers?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2"><Label htmlFor="product-select">Produto</Label>
              <Select onValueChange={setProductId} defaultValue="all">
                <SelectTrigger id="product-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Produtos</SelectItem>
                  {products?.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.description}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end"><Button className="w-full" onClick={handleGenerateReport} disabled={isLoading}>{isLoading ? 'Gerando...' : 'Gerar Relatório'}</Button></div>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Resultados</CardTitle>
            <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={!reportData || reportData.length === 0}>
              <FileDown className="h-4 w-4 mr-2" />Exportar para PDF
            </Button>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Produto</TableHead><TableHead className="text-right">Quantidade Vendida</TableHead><TableHead className="text-right">Valor Total Faturado</TableHead></TableRow></TableHeader>
                <TableBody>
                  {reportData.length > 0 ? (
                    reportData.map(row => (
                      <TableRow key={row.product_id}>
                        <TableCell>{row.product_code}</TableCell>
                        <TableCell>{row.product_description}</TableCell>
                        <TableCell className="text-right">{Number(row.total_quantity_sold)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(Number(row.total_amount_invoiced))}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum dado para os filtros selecionados.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {reportData.length > 0 && (
              <div className="mt-4 text-right font-bold flex justify-end gap-8">
                <p>Total de Itens Vendidos: {totals.totalItems}</p>
                <p>Faturamento Total do Período: {formatCurrency(totals.totalRevenue)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
