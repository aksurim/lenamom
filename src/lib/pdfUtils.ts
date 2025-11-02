import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface CompanySettings {
  logo_url: string;
  company_name: string;
  instagram: string;
  contact: string;
}

// Busca as configurações da empresa
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

// Adiciona o rodapé padronizado
const addStandardFooter = (doc: jsPDF) => {
  const pageCount = doc.internal.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100);

    const footerText = "Aksurim Software + (83) 99123-8327";
    const pageText = `Página ${i} de ${pageCount}`;

    doc.text(footerText, 15, pageH - 10);
    doc.text(pageText, pageW - 15, pageH - 10, { align: 'right' });
  }
};

export interface PdfOptions {
  fileName: string;
  title: string;
  drawContent: (doc: jsPDF, startY: number) => void; // Função que desenha o conteúdo principal
}

// Função principal para gerar qualquer PDF padronizado no sistema
export const generateStandardPdf = async (options: PdfOptions) => {
  const { fileName, drawContent, title } = options;
  const settings = await getCompanySettings();

  const doc = new jsPDF();

  const logoImg = new Image();
  logoImg.src = settings.logo_url || '/logo_pb.png';

  const performPdfGeneration = () => {
    const margin = 15;
    const pageW = doc.internal.pageSize.getWidth();
    let currentY = margin;

    // --- Cabeçalho ---
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

    // --- Conteúdo (desenhado pela função passada) ---
    drawContent(doc, currentY);

    // --- Rodapé ---
    addStandardFooter(doc);

    doc.save(`${fileName}.pdf`);
  };

  if (logoImg.complete) {
    performPdfGeneration();
  } else {
    logoImg.onload = performPdfGeneration;
    logoImg.onerror = () => {
      toast.warning("Falha ao carregar o logo. O PDF será gerado sem a imagem.");
      performPdfGeneration(); // Gera o PDF mesmo sem a logo
    };
  }
};
