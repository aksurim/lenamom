import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';
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

export interface JewelryLabelData {
    barcode: string;
    description: string;
    productCode: string;
}

export interface ThermalReceiptData {
    saleId: number;
    customerName: string;
    items: { description: string; quantity: number; unit_price: number; total_price: number }[];
    subtotal: number;
    shipping: number;
    discount: number;
    total: number;
    paymentMethod: string;
    amountPaid: number;
    change: number;
}

// --- FUNÇÕES AUXILIARES ---
const getCompanySettings = async (): Promise<Partial<CompanySettings>> => {
  try {
    const response = await api.get('/settings');
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
  const { drawContent, title } = options;
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
    doc.text(settings.instagram || '@seu.instagram', pageW / 2, currentY + 14, { align: 'center' });
    doc.text(settings.contact || 'Contato da Empresa', pageW / 2, currentY + 19, { align: 'center' });
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

export const generateJewelryLabelPdf = (labelData: JewelryLabelData) => {
    const { barcode, description, productCode } = labelData;
    const labelWidth = 60;
    const labelHeight = 12;

    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [labelWidth, labelHeight],
    });

    const canvas = document.createElement('canvas');
    try {
        JsBarcode(canvas, barcode, {
            format: "EAN13",
            width: 1,
            height: 6,
            displayValue: true,
            fontSize: 8,
            margin: 0,
        });
        const barcodeImage = canvas.toDataURL('image/png');
        doc.addImage(barcodeImage, 'PNG', 1, 2, 28, 8);

        const textBlockX = 32;
        const textBlockWidth = 26;
        const truncatedDescription = doc.splitTextToSize(description, textBlockWidth);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(truncatedDescription[0], textBlockX, 5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(`Cód: ${productCode}`, textBlockX, 9);

        window.open(doc.output('bloburl'), '_blank');

    } catch (error) {
        console.error("Erro ao gerar código de barras:", error);
        toast.error("Não foi possível gerar a etiqueta. Verifique o código de barras.");
    }
};

// --- ESTRATÉGIA DE RENDERIZAÇÃO DO RECIBO TÉRMICO COMO IMAGEM (SEM CÓDIGO DE BARRAS) ---
export const generateThermalReceiptPdf = async (data: ThermalReceiptData) => {
    const settings = await getCompanySettings();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        toast.error("Não foi possível criar o contexto de desenho para o recibo.");
        return;
    }

    const DPI = 150;
    const scale = DPI / 96; 
    const canvasWidth = 80 * (DPI / 25.4);
    const margin = 15 * scale;
    const fontBaseSize = 10 * scale;
    const lineHeight = 14 * scale;
    let y = margin;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.textBaseline = 'top';

    const formatCurrency = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;
    const drawText = (text: string, x: number, yPos: number, font: string, align: 'left' | 'center' | 'right' = 'left') => {
        ctx.font = font;
        let xPos = x;
        if (align === 'center') {
            xPos = canvasWidth / 2;
        } else if (align === 'right') {
            xPos = canvasWidth - margin;
        }
        ctx.textAlign = align;
        ctx.fillText(text, xPos, yPos);
    };

    // --- Medir altura total antes de desenhar ---
    let totalHeight = margin;
    if (settings.company_name) totalHeight += lineHeight;
    if (settings.instagram) totalHeight += lineHeight;
    if (settings.contact) totalHeight += lineHeight;
    totalHeight += lineHeight * 4; // Espaço, Pedido, Data, Cliente
    totalHeight += lineHeight * 2; // Divisórias
    totalHeight += lineHeight * 2; // Cabeçalho Itens
    data.items.forEach(item => {
        const maxChars = 30;
        let lineCount = Math.ceil(item.description.length / maxChars);
        totalHeight += lineHeight * lineCount;
    });
    totalHeight += lineHeight; // Divisória
    totalHeight += lineHeight * 2; // Subtotal, Frete/Desconto
    totalHeight += lineHeight; // Espaço
    totalHeight += lineHeight; // TOTAL
    totalHeight += lineHeight; // Espaço
    totalHeight += lineHeight * 3; // Pgto, Pago, Troco
    totalHeight += lineHeight * 3; // Espaço, "Obrigado"
    totalHeight += lineHeight * 2; // "NAO E DOCUMENTO FISCAL", margem final

    // --- Configurar canvas com altura correta e desenhar ---
    canvas.width = canvasWidth;
    canvas.height = totalHeight;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.textBaseline = 'top';

    // --- Desenhar Cabeçalho ---
    if (settings.company_name) { drawText(settings.company_name, 0, y, `bold ${fontBaseSize + 2}px monospace`, 'center'); y += lineHeight; }
    if (settings.instagram) { drawText(settings.instagram, 0, y, `${fontBaseSize}px monospace`, 'center'); y += lineHeight; }
    if (settings.contact) { drawText(settings.contact, 0, y, `${fontBaseSize}px monospace`, 'center'); y += lineHeight; }
    y += lineHeight;
    drawText(`Pedido: ${data.saleId}`, margin, y, `${fontBaseSize}px monospace`); y += lineHeight;
    drawText(`Data: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, margin, y, `${fontBaseSize}px monospace`); y += lineHeight;
    drawText(`Cliente: ${data.customerName}`, margin, y, `${fontBaseSize}px monospace`); y += lineHeight;
    drawText('-'.repeat(50), 0, y, `${fontBaseSize}px monospace`, 'center'); y += lineHeight;

    // --- Desenhar Itens ---
    drawText("PRODUTO", margin, y, `bold ${fontBaseSize}px monospace`);
    drawText("QTD", canvasWidth * 0.6, y, `bold ${fontBaseSize}px monospace`);
    drawText("TOTAL", 0, y, `bold ${fontBaseSize}px monospace`, 'right');
    y += lineHeight;
    drawText('-'.repeat(50), 0, y, `${fontBaseSize}px monospace`, 'center'); y += lineHeight;

    data.items.forEach(item => {
        const maxChars = 30;
        const descriptionLines = [];
        let currentLine = item.description;
        while (currentLine.length > maxChars) { descriptionLines.push(currentLine.substring(0, maxChars)); currentLine = currentLine.substring(maxChars); }
        descriptionLines.push(currentLine);
        descriptionLines.forEach((line, index) => {
            if (index === 0) {
                drawText(line, margin, y, `${fontBaseSize}px monospace`);
                drawText(item.quantity.toString(), canvasWidth * 0.6, y, `${fontBaseSize}px monospace`);
                drawText(formatCurrency(item.total_price), 0, y, `${fontBaseSize}px monospace`, 'right');
            } else {
                drawText(line, margin, y, `${fontBaseSize}px monospace`);
            }
            y += lineHeight;
        });
    });
    drawText('-'.repeat(50), 0, y, `${fontBaseSize}px monospace`, 'center'); y += lineHeight;

    // --- Desenhar Totais ---
    const drawTotalLine = (label: string, value: string, isBold = false) => {
        drawText(label, margin, y, `${isBold ? 'bold ' : ''}${fontBaseSize}px monospace`);
        drawText(value, 0, y, `${isBold ? 'bold ' : ''}${fontBaseSize}px monospace`, 'right');
        y += lineHeight;
    };

    drawTotalLine('Subtotal:', formatCurrency(data.subtotal));
    if (data.shipping > 0) drawTotalLine('Frete:', formatCurrency(data.shipping));
    if (data.discount > 0) drawTotalLine('Desconto:', `- ${formatCurrency(data.discount)}`);
    y += lineHeight / 2;
    drawTotalLine('TOTAL:', formatCurrency(data.total), true);
    y += lineHeight / 2;
    drawTotalLine('Forma Pgto:', data.paymentMethod);
    drawTotalLine('Valor Pago:', formatCurrency(data.amountPaid));
    if (data.change > 0) drawTotalLine('Troco:', formatCurrency(data.change));
    y += lineHeight * 2;

    // --- Rodapé ---
    drawText('Obrigado pela preferencia!', 0, y, `${fontBaseSize}px monospace`, 'center');
    y += lineHeight * 2;
    drawText('*** NAO E DOCUMENTO FISCAL ***', 0, y, `bold ${fontBaseSize + 2}px monospace`, 'center');

    // --- Criar o PDF e adicionar a imagem do canvas ---
    const imageData = canvas.toDataURL('image/png');
    const pdfWidth = 80;
    const pdfHeight = (canvas.height * 25.4) / DPI;

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
    });

    doc.addImage(imageData, 'PNG', 0, 0, pdfWidth, pdfHeight);

    window.open(doc.output('bloburl'), '_blank');
};
