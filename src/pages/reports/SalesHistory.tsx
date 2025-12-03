import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, FileDown } from "lucide-react";
import { toast } from "sonner";
// CORREÇÃO: Importa a nova função de geração de PDF e a antiga para a lista.
import { generateSaleReceiptPdf, generateStandardPdf, SaleReceiptData } from "@/lib/pdfUtils";
import autoTable from 'jspdf-autotable';

// --- Tipos de Dados ---
interface SaleHistoryRow {
  id: number;
  sale_code: string;
  sale_date: string;
  total_amount: number | string;
  customer_name: string | null;
}

// --- Componente Principal ---
export default function SalesHistory() {
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [reportData, setReportData] = useState<SaleHistoryRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatingPdfId, setGeneratingPdfId] = useState<number | null>(null);

  const handleSearch = async () => {
    if (!startDate || !endDate) { toast.error("Selecione a data de início e de fim."); return; }
    setIsLoading(true);
    setReportData(null);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    try {
      const response = await api.get("/reports/sales-history", {
        params: { startDate: formatDate(startDate), endDate: formatDate(endDate) }
      });
      setReportData(response.data);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error(`Erro ao buscar histórico: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // CORREÇÃO: Função simplificada para chamar a nova lógica de PDF.
  const handleReprintReceipt = async (saleId: number) => {
    setGeneratingPdfId(saleId);
    try {
      // 1. Busca os dados completos e enriquecidos da venda.
      const response = await api.get(`/sales/${saleId}/details`);
      const fullSaleData: SaleReceiptData = response.data;
      
      // 2. Chama a função de geração de PDF centralizada.
      await generateSaleReceiptPdf(fullSaleData);

    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error(`Erro ao gerar recibo: ${errorMessage}`);
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const handleExportListPdf = () => {
    if (!reportData || !startDate || !endDate) {
      toast.error("Não há dados para exportar.");
      return;
    }

    const formattedStartDate = startDate.toLocaleDateString('pt-BR');
    const formattedEndDate = endDate.toLocaleDateString('pt-BR');
    const totalAmount = reportData.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);

    generateStandardPdf({
      fileName: `Historico_Vendas_${formattedStartDate}_a_${formattedEndDate}`,
      title: "Relatório de Histórico de Vendas",
      drawContent: (doc, startY) => {
        doc.setFontSize(10);
        doc.text(`Período: ${formattedStartDate} a ${formattedEndDate}`, doc.internal.pageSize.getWidth() / 2, startY - 10, { align: 'center' });

        autoTable(doc, {
          head: [["Código", "Cliente", "Data e Hora", "Valor Total"]],
          body: reportData.map(sale => [
            sale.sale_code,
            sale.customer_name || 'Não informado',
            new Date(sale.sale_date.replace(' ', 'T')).toLocaleString('pt-BR'),
            Number(sale.total_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          ]),
          startY: startY,
          theme: 'grid',
          headStyles: { fillColor: [0, 0, 0] },
        });

        const finalY = (doc as any).lastAutoTable.finalY;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total de Vendas no Período: ${reportData.length}`, 15, finalY + 10);
        doc.text(`Valor Total: ${totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 15, finalY + 17);
      }
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-foreground">Histórico de Vendas</h2>
      <Card>
        <CardHeader><CardTitle>Filtros do Relatório</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label htmlFor="start-date">Data de Início</Label><DatePicker id="start-date" date={startDate} onSelect={setStartDate} /></div>
            <div className="space-y-2"><Label htmlFor="end-date">Data de Fim</Label><DatePicker id="end-date" date={endDate} onSelect={setEndDate} /></div>
            <div className="flex items-end"><Button className="w-full" onClick={handleSearch} disabled={isLoading}>{isLoading ? 'Buscando...' : 'Buscar Vendas'}</Button></div>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Vendas Realizadas</CardTitle>
            <Button variant="outline" size="sm" onClick={handleExportListPdf} disabled={!reportData || reportData.length === 0}>
                <FileDown className="h-4 w-4 mr-2" />
                Exportar Lista para PDF
            </Button>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Cliente</TableHead><TableHead>Data e Hora</TableHead><TableHead className="text-right">Valor Total</TableHead><TableHead className="w-[160px] text-center">Ações</TableHead></TableRow></TableHeader>
                <TableBody>
                  {reportData.length > 0 ? (
                    reportData.map(sale => (
                      <TableRow key={sale.id}>
                        <TableCell>{sale.sale_code}</TableCell>
                        <TableCell>{sale.customer_name || 'Não informado'}</TableCell>
                        <TableCell>{new Date(sale.sale_date.replace(' ', 'T')).toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-right">{Number(sale.total_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                        <TableCell className="text-center">
                          <Button variant="outline" size="sm" onClick={() => handleReprintReceipt(sale.id)} disabled={generatingPdfId === sale.id}>
                            <FileText className="h-4 w-4 mr-2" />
                            {generatingPdfId === sale.id ? 'Gerando...' : 'Reimprimir Pedido'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma venda encontrada para o período selecionado.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
