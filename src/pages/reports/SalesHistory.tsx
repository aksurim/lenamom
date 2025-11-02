import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, FileDown } from "lucide-react";
import { toast } from "sonner";
import { generateStandardPdf } from "@/lib/pdfUtils"; // <-- Corrigido
import autoTable from 'jspdf-autotable';

// --- Tipos de Dados ---
interface SaleHistoryRow {
  id: number;
  sale_code: string;
  sale_date: string;
  total_amount: number | string;
  paid_amount: number | string;
  change_amount: number | string;
  shipping_cost: number | string;
  customer_name: string | null;
  customer_document?: string;
  customer_address_street?: string;
  customer_address_number?: string;
  customer_address_neighborhood?: string;
  customer_address_city?: string;
  customer_address_state?: string;
}

interface SaleItemForReceipt {
  description: string;
  quantity: number;
  unit_price: number | string;
  subtotal: number | string;
  code: string;
}

interface SaleDetails extends SaleHistoryRow {
  items: SaleItemForReceipt[];
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

  const handleReprintReceipt = async (sale: SaleHistoryRow) => {
    setGeneratingPdfId(sale.id);
    try {
      const response = await api.get<SaleDetails>(`/sales/${sale.id}/details`);
      const saleDetails = response.data;

      await generateStandardPdf({
        fileName: `Pedido-${saleDetails.sale_code}`,
        title: `Pedido de Venda`,
        drawContent: (doc, startY) => {
          let currentY = startY;
          const margin = 15;
          const pageW = doc.internal.pageSize.getWidth();

          if (saleDetails.customer_name) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text("DADOS DO CLIENTE", margin, currentY);
            currentY += 5;
            doc.setLineWidth(0.1);
            doc.rect(margin, currentY, pageW - (margin * 2), 22);
            currentY += 5;
            doc.setFont('helvetica', 'normal');
            const customerAddress = `${sale.customer_address_street || ''}, ${sale.customer_address_number || ''} - ${sale.customer_address_neighborhood || ''}`;
            doc.text(`Nome: ${sale.customer_name}`, margin + 2, currentY);
            doc.text(`CPF/CNPJ: ${sale.customer_document || 'Não informado'}`, margin + 100, currentY);
            currentY += 7;
            doc.text(`Endereço: ${customerAddress}`, margin + 2, currentY);
            currentY += 7;
            doc.text(`Cidade: ${sale.customer_address_city || ''} - ${sale.customer_address_state || ''}`, margin + 2, currentY);
            currentY += 10;
          }

          autoTable(doc, {
            head: [['CÓDIGO', 'DESCRIÇÃO', 'QTD.', 'VL. UNIT.', 'SUBTOTAL']],
            body: saleDetails.items.map(item => [
              (item as any).code || 'N/A', // Assuming item has a code
              item.description,
              item.quantity,
              Number(item.unit_price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
              Number(item.subtotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            ]),
            startY: currentY,
            theme: 'grid',
            headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
            styles: { fontSize: 9, cellPadding: 2 },
            columnStyles: { 4: { halign: 'right' } }
          });

          let finalY = (doc as any).lastAutoTable.finalY + 10;
          const subtotal = saleDetails.items.reduce((sum, item) => sum + Number(item.subtotal), 0);
          const summaryX = pageW - margin - 70;
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text("RESUMO FINANCEIRO", summaryX, finalY);
          finalY += 5;
          doc.setLineWidth(0.1);
          doc.rect(summaryX - 2, finalY, 72, 20);
          finalY += 5;
          doc.setFont('helvetica', 'normal');
          doc.text("Subtotal:", summaryX, finalY);
          doc.text(subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), summaryX + 68, finalY, { align: 'right' });
          finalY += 7;
          doc.text("Frete:", summaryX, finalY);
          doc.text(Number(saleDetails.shipping_cost || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), summaryX + 68, finalY, { align: 'right' });
          finalY += 7;
          doc.setFont('helvetica', 'bold');
          doc.text("TOTAL:", summaryX, finalY);
          doc.text(Number(saleDetails.total_amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), summaryX + 68, finalY, { align: 'right' });
        }
      });

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

    generateStandardPdf({ // <-- Corrigido
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
                          <Button variant="outline" size="sm" onClick={() => handleReprintReceipt(sale)} disabled={generatingPdfId === sale.id}>
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
