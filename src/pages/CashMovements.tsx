import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generateStandardPdf } from '../lib/pdfUtils'; // <-- Corrigido
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { DatePickerWithRange } from '../components/DatePickerWithRange';
import { CalendarIcon, PlusCircle, MinusCircle, Trash2, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';


interface Movement {
  id: number;
  data_hora: string;
  tipo_movimento: 'entrada_venda' | 'entrada_avulsa' | 'saida';
  valor: number;
  descricao: string;
  usuario_nome: string;
  forma_pagamento_descricao?: string;
  referencia_venda_id?: number;
}

interface PaymentMethod {
  id: number;
  description: string;
}

const CashMovements: React.FC = () => {
  const { user } = useAuth();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [totalCash, setTotalCash] = useState<number>(0);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined; to: Date | undefined }>(
    {
    from: new Date(),
    to: new Date(),
  });
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);


  // Estados para o formulário de Entrada Avulsa
  const [entryValue, setEntryValue] = useState<string>('');
  const [entryDescription, setEntryDescription] = useState<string>('');
  const [entryPaymentMethod, setEntryPaymentMethod] = useState<string>('');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  // Estados para o formulário de Saída
  const [expenseValue, setExpenseValue] = useState<string>('');
  const [expenseDescription, setExpenseDescription] = useState<string>('');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<string>('');

  const isAdmin = user?.perfil === 'admin';

  const fetchPaymentMethods = async () => {
    try {
      const response = await api.get('/payment-methods');
      setPaymentMethods(response.data);
    } catch (error) {
      console.error('Erro ao buscar formas de pagamento:', error);
      toast.error('Erro ao carregar formas de pagamento.');
    }
  };

  const fetchMovements = async () => {
    try {
      let url = '/cash-movements';
      if (dateRange.from && dateRange.to) {
        const from = format(dateRange.from, 'yyyy-MM-dd');
        const to = format(dateRange.to, 'yyyy-MM-dd');
        url += `?startDate=${from}&endDate=${to}`;
      }
      const response = await api.get<Movement[]>(url);
      setMovements(response.data);

      const total = response.data.reduce((acc, mov) => {
        if (mov.tipo_movimento.startsWith('entrada')) {
          return acc + parseFloat(mov.valor as any);
        } else {
          return acc - parseFloat(mov.valor as any);
        }
      }, 0);
      setTotalCash(total);

    } catch (error) {
      console.error('Erro ao buscar movimentos de caixa:', error);
      toast.error('Erro ao carregar movimentos de caixa.');
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  useEffect(() => {
    fetchMovements();
  }, [dateRange]);

  const handleAddEntry = async () => {
    if (!entryValue || !entryDescription || !entryPaymentMethod) {
      toast.error('Preencha todos os campos para a entrada avulsa.');
      return;
    }
    const valorNumerico = parseFloat(entryValue);
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      toast.error('Valor da entrada inválido.');
      return;
    }

    try {
      await api.post('/cash-movements/entry', {
        valor: valorNumerico,
        descricao: entryDescription,
        forma_pagamento_id: parseInt(entryPaymentMethod),
      });
      toast.success('Entrada avulsa registrada com sucesso!');
      setEntryValue('');
      setEntryDescription('');
      setEntryPaymentMethod('');
      setIsAddingEntry(false);
      fetchMovements();
    } catch (error: any) {
      console.error('Erro ao adicionar entrada avulsa:', error);
      toast.error(error.response?.data?.message || 'Erro ao registrar entrada avulsa.');
    }
  };

  const handleAddExpense = async () => {
    if (!expenseValue || !expenseDescription || !expensePaymentMethod) {
      toast.error('Preencha todos os campos para a saída.');
      return;
    }
    const valorNumerico = parseFloat(expenseValue);
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      toast.error('Valor da saída inválido.');
      return;
    }

    try {
      await api.post('/cash-movements/expense', {
        valor: valorNumerico,
        descricao: expenseDescription,
        forma_pagamento_id: parseInt(expensePaymentMethod),
      });
      toast.success('Saída registrada com sucesso!');
      setExpenseValue('');
      setExpenseDescription('');
      setExpensePaymentMethod('');
      setIsAddingExpense(false);
      fetchMovements();
    } catch (error: any) {
      console.error('Erro ao adicionar saída:', error);
      toast.error(error.response?.data?.message || 'Erro ao registrar saída.');
    }
  };

  const handleDeleteMovement = async (id: number) => {
    if (!isAdmin) {
      toast.error('Você não tem permissão para excluir movimentos.');
      return;
    }
    try {
      await api.delete(`/cash-movements/${id}`);
      toast.success('Movimento excluído com sucesso!');
      fetchMovements();
    } catch (error: any) {
      console.error('Erro ao excluir movimento:', error);
      toast.error(error.response?.data?.message || 'Erro ao excluir movimento.');
    }
  };

  const handleGeneratePdf = () => {
    if (movements.length === 0) {
      toast.info("Não há movimentos para gerar o relatório.");
      return;
    }

    const fileName = `Relatorio_Caixa_${format(new Date(), 'yyyy-MM-dd')}`;
    const period = dateRange.from && dateRange.to ? `${format(dateRange.from, 'dd/MM/yyyy')} a ${format(dateRange.to, 'dd/MM/yyyy')}` : format(new Date(), 'dd/MM/yyyy');

    const totalsByPaymentMethod: { [key: string]: { entradas: number; saidas: number } } = {};
    let totalEntradas = 0;
    let totalSaidas = 0;

    movements.forEach(mov => {
      const valor = parseFloat(mov.valor as any);
      const pm = mov.forma_pagamento_descricao || 'N/A';

      if (!totalsByPaymentMethod[pm]) {
        totalsByPaymentMethod[pm] = { entradas: 0, saidas: 0 };
      }

      if (mov.tipo_movimento.startsWith('entrada')) {
        totalsByPaymentMethod[pm].entradas += valor;
        totalEntradas += valor;
      } else {
        totalsByPaymentMethod[pm].saidas += valor;
        totalSaidas += valor;
      }
    });

    generateStandardPdf({ // <-- Corrigido
      fileName,
      title: 'Relatório de Movimento de Caixa',
      drawContent: (doc: jsPDF, startY: number) => {
        let currentY = startY;

        doc.setFontSize(10);
        doc.text(`Período: ${period}`, 15, currentY);
        currentY += 10;

        autoTable(doc, {
          startY: currentY,
          head: [['Resumo Geral', 'Valor']],
          body: [
            ['Total de Entradas', totalEntradas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
            ['Total de Saídas', totalSaidas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
            ['Saldo Final', (totalEntradas - totalSaidas).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })]
          ],
          theme: 'grid',
          styles: { fontSize: 10 },
          headStyles: { fillColor: [0, 0, 0] }, // <-- Corrigido
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;

        autoTable(doc, {
          startY: currentY,
          head: [['Forma de Pagamento', 'Total Entradas', 'Total Saídas']],
          body: Object.entries(totalsByPaymentMethod).map(([pm, totals]) => [
            pm,
            totals.entradas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            totals.saidas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
          ]),
          theme: 'grid',
          styles: { fontSize: 10 },
          headStyles: { fillColor: [0, 0, 0] }, // <-- Corrigido
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;

        doc.setFontSize(12);
        doc.text('Movimentos Detalhados', 15, currentY);
        currentY += 5;

        autoTable(doc, {
          startY: currentY,
          head: [['Data/Hora', 'Tipo', 'Descrição', 'Forma Pag.', 'Valor']],
          body: movements.map(mov => [
            format(new Date(mov.data_hora), 'dd/MM/yy HH:mm'),
            getMovementTypeLabel(mov.tipo_movimento),
            mov.descricao,
            mov.forma_pagamento_descricao || '-',
            `${mov.tipo_movimento.startsWith('entrada') ? '+' : '-'} ${parseFloat(mov.valor as any).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
          ]),
          theme: 'grid', // <-- Corrigido
          styles: { fontSize: 8 },
          headStyles: { fillColor: [0, 0, 0] }, // <-- Corrigido
        });
      }
    });
  };

  const getMovementTypeLabel = (type: Movement['tipo_movimento']) => {
    switch (type) {
      case 'entrada_venda': return 'Entrada (Venda)';
      case 'entrada_avulsa': return 'Entrada (Avulsa)';
      case 'saida': return 'Saída';
      default: return type;
    }
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-3xl font-bold">Movimento de Caixa</h1>

      {/* Resumo do Caixa */}
      <Card className="bg-gradient-to-r from-green-500 to-green-700 text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total do Caixa {dateRange.from && dateRange.to ? `(${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')})` : '(Hoje)'}
          </CardTitle>
          <span className="text-2xl font-bold">{totalCash.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-white/80">
            Saldo atual do período selecionado.
          </div>
        </CardContent>
      </Card>

      {/* Controles e Filtros */}
      <div className="flex flex-wrap items-center gap-4">
        <DatePickerWithRange date={dateRange} setDate={setDateRange} />
        <Button onClick={() => setDateRange({ from: new Date(), to: new Date() })} variant="outline">
          Ver Hoje
        </Button>
        <Button onClick={() => setIsAddingEntry(true)} className="bg-blue-500 hover:bg-blue-600 text-white">
          <PlusCircle className="mr-2 h-4 w-4" /> Nova Entrada Avulsa
        </Button>
        <Button onClick={() => setIsAddingExpense(true)} className="bg-red-500 hover:bg-red-600 text-white">
          <MinusCircle className="mr-2 h-4 w-4" /> Nova Saída
        </Button>
        <Button onClick={handleGeneratePdf} variant="secondary">
          <FileText className="mr-2 h-4 w-4" /> Gerar Relatório PDF
        </Button>
      </div>

      {/* Formulário de Nova Entrada Avulsa */}
      {isAddingEntry && (
        <Card>
          <CardHeader>
            <CardTitle>Registrar Nova Entrada Avulsa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="entryValue">Valor</Label>
                <Input
                  id="entryValue"
                  type="number"
                  value={entryValue}
                  onChange={(e) => setEntryValue(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                />
              </div>
              <div>
                <Label htmlFor="entryPaymentMethod">Forma de Pagamento</Label>
                <Select value={entryPaymentMethod} onValueChange={setEntryPaymentMethod}>
                  <SelectTrigger id="entryPaymentMethod">
                    <SelectValue placeholder="Selecione a forma de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((pm) => (
                      <SelectItem key={pm.id} value={String(pm.id)}>
                        {pm.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="entryDescription">Descrição</Label>
              <Textarea
                id="entryDescription"
                value={entryDescription}
                onChange={(e) => setEntryDescription(e.target.value)}
                placeholder="Ex: Pagamento de adiantamento, Recebimento de aluguel"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddingEntry(false)}>Cancelar</Button>
              <Button onClick={handleAddEntry}>Registrar Entrada</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulário de Nova Saída */}
      {isAddingExpense && (
        <Card>
          <CardHeader>
            <CardTitle>Registrar Nova Saída</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expenseValue">Valor</Label>
                <Input
                  id="expenseValue"
                  type="number"
                  value={expenseValue}
                  onChange={(e) => setExpenseValue(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                />
              </div>
              <div>
                <Label htmlFor="expensePaymentMethod">Forma de Pagamento</Label>
                <Select value={expensePaymentMethod} onValueChange={setExpensePaymentMethod}>
                  <SelectTrigger id="expensePaymentMethod">
                    <SelectValue placeholder="Selecione a forma de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((pm) => (
                      <SelectItem key={pm.id} value={String(pm.id)}>
                        {pm.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="expenseDescription">Descrição</Label>
              <Textarea
                id="expenseDescription"
                value={expenseDescription}
                onChange={(e) => setExpenseDescription(e.target.value)}
                placeholder="Ex: Pagamento de aluguel, Compra de material de limpeza"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddingExpense(false)}>Cancelar</Button>
              <Button onClick={handleAddExpense} className="bg-red-500 hover:bg-red-600 text-white">Registrar Saída</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Movimentos */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhes dos Movimentos</CardTitle>
        </CardHeader>
        <CardContent>
          {/* ALTERAÇÃO: Adicionado container para rolagem horizontal */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Forma Pagamento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Usuário</TableHead>
                  {isAdmin && <TableHead className="text-center">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">Nenhum movimento encontrado para o período.</TableCell>
                  </TableRow>
                ) : (
                  movements.map((mov) => (
                    <TableRow key={mov.id} className={mov.tipo_movimento === 'saida' ? 'bg-red-50/50' : 'bg-green-50/50'}>
                      <TableCell>{format(new Date(mov.data_hora), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</TableCell>
                      <TableCell>{getMovementTypeLabel(mov.tipo_movimento)}</TableCell>
                      <TableCell>{mov.descricao}</TableCell>
                      <TableCell>{mov.forma_pagamento_descricao || '-'}</TableCell>
                      <TableCell className={`text-right font-medium ${mov.tipo_movimento === 'saida' ? 'text-red-600' : 'text-green-600'}`}>
                        {mov.tipo_movimento === 'saida' ? '- ' : '+ '}
                        {parseFloat(mov.valor as any).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                      <TableCell>{mov.usuario_nome}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-center">
                          {(mov.tipo_movimento === 'entrada_avulsa' || mov.tipo_movimento === 'saida') && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. Isso excluirá permanentemente o movimento de caixa selecionado.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteMovement(mov.id)}>Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CashMovements;
