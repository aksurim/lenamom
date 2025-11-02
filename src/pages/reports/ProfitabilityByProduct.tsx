import { useState, useMemo } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { generateStandardPdf } from "@/lib/pdfUtils"; // <-- Corrigido
import autoTable from 'jspdf-autotable';
import { FileDown } from "lucide-react";

// --- Tipos de Dados ---
interface ProfitabilityRow {
  product_code: string;
  product_description: string;
  total_quantity_sold: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
}

const formatCurrency = (value: number) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// --- Componente Principal ---
export default function ProfitabilityByProduct() {
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [reportData, setReportData] = useState<ProfitabilityRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    };

    try {
      const response = await api.get("/reports/profitability-by-product", { params });
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
      fileName: `Relatorio_Lucratividade_Produto_${new Date().toISOString().split('T')[0]}`,
      title: "Relatório de Lucratividade por Produto",
      drawContent: (doc, startY) => {
        doc.setFontSize(10);
        doc.text(`Período: ${formattedStartDate} a ${formattedEndDate}`, doc.internal.pageSize.getWidth() / 2, startY - 10, { align: 'center' });

        autoTable(doc, {
          head: [['Produto', 'Qtd.', 'Faturamento', 'Custo', 'Lucro', 'Margem (%)']],
          body: reportData.map(row => {
            const margin = row.total_revenue > 0 ? (row.total_profit / row.total_revenue) * 100 : 0;
            return [
              row.product_description,
              row.total_quantity_sold,
              formatCurrency(Number(row.total_revenue)),
              formatCurrency(Number(row.total_cost)),
              formatCurrency(Number(row.total_profit)),
              margin.toFixed(2) + '%'
            ];
          }),
          startY: startY,
          theme: 'grid',
          headStyles: { fillColor: [0, 0, 0] },
        });
      }
    });
  };

  const totals = useMemo(() => {
    if (!reportData) return { totalRevenue: 0, totalCost: 0, totalProfit: 0 };
    return reportData.reduce((acc, row) => ({
      totalRevenue: acc.totalRevenue + Number(row.total_revenue),
      totalCost: acc.totalCost + Number(row.total_cost),
      totalProfit: acc.totalProfit + Number(row.total_profit),
    }), { totalRevenue: 0, totalCost: 0, totalProfit: 0 });
  }, [reportData]);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-foreground">Relatório de Lucratividade por Produto</h2>
      <Card>
        <CardHeader><CardTitle>Filtros do Relatório</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><label htmlFor="start-date">Data de Início</label><DatePicker id="start-date" date={startDate} onSelect={setStartDate} /></div>
            <div className="space-y-2"><label htmlFor="end-date">Data de Fim</label><DatePicker id="end-date" date={endDate} onSelect={setEndDate} /></div>
            <div className="flex items-end"><Button className="w-full" onClick={handleGenerateReport} disabled={isLoading}>{isLoading ? 'Gerando...' : 'Gerar Relatório'}</Button></div>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Resultados da Lucratividade</CardTitle>
            <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={!reportData || reportData.length === 0}>
              <FileDown className="h-4 w-4 mr-2" />Exportar para PDF
            </Button>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Qtd. Vendida</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                    <TableHead className="text-right">Custo Total</TableHead>
                    <TableHead className="text-right">Lucro Bruto</TableHead>
                    <TableHead className="text-right">Margem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.length > 0 ? (
                    reportData.map(row => {
                      const margin = row.total_revenue > 0 ? (row.total_profit / row.total_revenue) * 100 : 0;
                      return (
                        <TableRow key={row.product_code}>
                          <TableCell>{row.product_description}</TableCell>
                          <TableCell className="text-right">{row.total_quantity_sold}</TableCell>
                          <TableCell className="text-right">{formatCurrency(Number(row.total_revenue))}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{formatCurrency(Number(row.total_cost))}</TableCell>
                          <TableCell className="text-right font-bold text-green-500">{formatCurrency(Number(row.total_profit))}</TableCell>
                          <TableCell className={`text-right font-medium ${margin < 0 ? 'text-red-500' : 'text-green-500'}`}>{margin.toFixed(2)}%</TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma venda encontrada para o período selecionado.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {reportData.length > 0 && (
              <div className="mt-4 text-right font-bold flex justify-end gap-8 text-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Faturamento Total</p>
                  <p>{formatCurrency(totals.totalRevenue)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Custo Total</p>
                  <p>{formatCurrency(totals.totalCost)}</p>
                </div>
                <div>
                  <p className="text-sm text-green-500">Lucro Bruto Total</p>
                  <p className="text-green-500">{formatCurrency(totals.totalProfit)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
