import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import autoTable from 'jspdf-autotable';

// --- INTERFACES ---
interface CompanySettings {
  logo_url: string;
  company_name: string;
  instagram: string;
  contact: string;
}

export interface PdfOptions {
  fileName: string;
  title: string;
  drawContent: (doc: jsPDF, startY: number) => void;
}

export interface SaleReceiptData {
  id: number;
  sale_code: string;
  sale_date: string;
  total_amount: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  items: {
    description: string;
    quantity: number;
    unit_price: number | string;
    subtotal: number | string;
  }[];
  shipping_cost: number;
  paid_amount: number;
  change_amount: number;
  payment_method_name: string; // Adicionado
}

// --- FUNÇÕES AUXILIARES ---
const getCompanySettings = async (): Promise<Partial<CompanySettings>> => {
  try {
    const response = await api.get('/company-settings');
    return response.data;
  } catch (error) {
    console.error("Falha ao buscar configurações da empresa para o PDF, usando fallback.", error);
    toast.error("Não foi possível carregar os dados da empresa para o PDF.");
    return {};
  }
};

const addStandardFooter = (doc: jsPDF) => {
    const pageCount = doc.internal.getNumberOfPages();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
  
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100);

      const legalText = "Este documento nao possui valor fiscal.";
      doc.text(legalText, pageW / 2, pageH - 15, { align: 'center' });

      const footerText = "Aksurim Software + (83) 99123-8327";
      const pageText = `Página ${i} de ${pageCount}`;
      doc.text(footerText, 15, pageH - 10);
      doc.text(pageText, pageW - 15, pageH - 10, { align: 'right' });
    }
};

// --- FUNÇÕES PRINCIPAIS DE GERAÇÃO DE PDF ---

export const generateStandardPdf = async (options: PdfOptions) => {
  const { drawContent, title, fileName } = options;
  const settings = await getCompanySettings();
  const doc = new jsPDF();
  const logoImg = new Image();
  logoImg.src = settings.logo_url || '/logo_pb.png';

  const performPdfGeneration = () => {
    const margin = 15;
    const pageW = doc.internal.pageSize.getWidth();
    let currentY = margin;

    if (logoImg.complete && logoImg.naturalHeight !== 0) {
        const logoW = 25;
        const logoH = (logoW * logoImg.naturalHeight) / logoImg.naturalWidth;
        doc.addImage(logoImg, 'PNG', margin, currentY, logoW, logoH);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(settings.company_name || 'Nome da Empresa', pageW / 2, currentY + 7, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(settings.instagram || 'Rede Social', pageW / 2, currentY + 14, { align: 'center' });
    doc.text(settings.contact || 'Telefone de Contato', pageW / 2, currentY + 19, { align: 'center' });
    currentY += 30;
    doc.setLineWidth(0.2);
    doc.line(margin, currentY, pageW - margin, currentY);
    currentY += 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(title, pageW / 2, currentY, { align: 'center' });
    currentY += 15;

    drawContent(doc, currentY);
    addStandardFooter(doc);
    
    window.open(doc.output('bloburl'), '_blank');
  };

  if (logoImg.complete) {
    performPdfGeneration();
  } else {
    logoImg.onload = performPdfGeneration;
    logoImg.onerror = () => {
      toast.warning("Falha ao carregar o logo. O PDF será gerado sem a imagem.");
      performPdfGeneration();
    };
  }
};

export const generateSaleReceiptPdf = async (saleData: SaleReceiptData) => {
  const settings = await getCompanySettings();
  const doc = new jsPDF();
  const logoImg = new Image();
  logoImg.src = settings.logo_url || '/logo_pb.png';

  const performPdfGeneration = () => {
    const margin = 15;
    const pageW = doc.internal.pageSize.getWidth();
    let currentY = margin;

    // --- CABEÇALHO DA EMPRESA ---
    if (logoImg.complete && logoImg.naturalHeight !== 0) {
        const logoW = 30;
        const logoH = (logoW * logoImg.naturalHeight) / logoImg.naturalWidth;
        doc.addImage(logoImg, 'PNG', margin, currentY, logoW, logoH);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(settings.company_name || 'Nome da Empresa', pageW / 2, currentY + 10, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(settings.instagram || 'Rede Social', pageW / 2, currentY + 17, { align: 'center' });
    doc.text(settings.contact || 'Telefone de Contato', pageW / 2, currentY + 22, { align: 'center' });
    currentY += 35;
    doc.setLineWidth(0.3);
    doc.line(margin, currentY, pageW - margin, currentY);
    currentY += 10;

    // --- BLOCO DE INFORMAÇÕES DO PEDIDO E CLIENTE (COM BOX) ---
    const customerBoxY = currentY;
    autoTable(doc, {
      startY: currentY,
      body: [
        [
          { content: `Pedido: #${saleData.sale_code}\nData: ${format(new Date(saleData.sale_date), 'dd/MM/yyyy HH:mm')}`, styles: { fontStyle: 'bold', fontSize: 11 } },
          { content: `Cliente: ${saleData.customer_name || 'Não informado'}\nTelefone: ${saleData.customer_phone || 'Não informado'}\nEndereço: ${saleData.customer_address || 'Não informado'}`, styles: { halign: 'right' } },
        ],
      ],
      theme: 'plain',
      styles: { cellPadding: 2, lineWidth: 0 },
    });
    const customerBoxHeight = (doc as any).lastAutoTable.finalY - customerBoxY;
    doc.setDrawColor(200); // Cor cinza claro para a borda
    doc.roundedRect(margin, customerBoxY - 2, pageW - (margin * 2), customerBoxHeight + 8, 3, 3, 'S');
    currentY = (doc as any).lastAutoTable.finalY + 15;

    // --- TABELA DE ITENS ---
    const tableBody = saleData.items.map(item => [
      item.description,
      item.quantity,
      `R$ ${Number(item.unit_price).toFixed(2)}`,
      `R$ ${Number(item.subtotal).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Produto', 'Qtd.', 'Preço Unit.', 'Subtotal']],
      body: tableBody,
      theme: 'striped',
      // MELHORIA: Cor do cabeçalho alterada para preto.
      headStyles: { fillColor: [0, 0, 0], textColor: 255, fontStyle: 'bold' },
      styles: { cellPadding: 3, fontSize: 10 },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right' },
      },
    });

    // --- BLOCO DE TOTAIS (COM BOX) ---
    const subtotal = saleData.items.reduce((acc, item) => acc + Number(item.subtotal), 0);
    const finalY = (doc as any).lastAutoTable.finalY;
    const totalsContent = [
        ['Subtotal:', `R$ ${subtotal.toFixed(2)}`],
        saleData.shipping_cost > 0 ? ['Frete:', `R$ ${Number(saleData.shipping_cost).toFixed(2)}`] : null,
        [{ content: 'TOTAL:', styles: { fontStyle: 'bold' } }, { content: `R$ ${Number(saleData.total_amount).toFixed(2)}`, styles: { fontStyle: 'bold' } }],
        ['', ''], // Linha em branco
        // MELHORIA: Adiciona a forma de pagamento.
        ['Forma de Pagamento:', saleData.payment_method_name || 'Não informada'],
        ['Valor Pago:', `R$ ${Number(saleData.paid_amount).toFixed(2)}`],
        saleData.change_amount > 0 ? ['Troco:', `R$ ${Number(saleData.change_amount).toFixed(2)}`] : null,
    ].filter(row => row !== null) as any[][];

    const totalsTableY = finalY + 8;
    autoTable(doc, {
        startY: totalsTableY,
        body: totalsContent,
        theme: 'plain',
        tableWidth: 80,
        margin: { left: pageW - 80 - margin },
        styles: { fontSize: 10, halign: 'right', cellPadding: 1.5 },
    });
    const totalsBoxHeight = (doc as any).lastAutoTable.finalY - totalsTableY;
    doc.setDrawColor(200);
    doc.roundedRect(pageW - 80 - margin - 3, totalsTableY - 3, 80 + 6, totalsBoxHeight + 6, 3, 3, 'S');

    addStandardFooter(doc);
    window.open(doc.output('bloburl'), '_blank');
  };

  if (logoImg.complete) {
    performPdfGeneration();
  } else {
    logoImg.onload = performPdfGeneration;
    logoImg.onerror = () => {
      toast.warning("Falha ao carregar o logo. O PDF será gerado sem a imagem.");
      performPdfGeneration();
    };
  }
};
