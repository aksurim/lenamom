import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, XCircle, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { generateStandardPdf } from "@/lib/pdfUtils";
import autoTable from 'jspdf-autotable';

// --- Tipos de Dados ---
interface Product { id: number; code: string; description: string; sale_price: number | string; stock_quantity: number; }
// CORREÇÃO: Adicionado `phone` à interface do Cliente
interface Customer { id: number; name: string; document?: string; phone?: string; address_street?: string; address_number?: string; address_neighborhood?: string; address_city?: string; address_state?: string; }
interface PaymentMethod { id: number; description: string; }
interface SaleItem extends Product { quantity: number; unit_price: number; subtotal: number; }

// --- Componentes Auxiliares ---
function PriceInput({ value, onChange }: { value: number; onChange: (newValue: number) => void }) {
  const [displayValue, setDisplayValue] = useState(value.toFixed(2).replace('.', ','));
  useEffect(() => { setDisplayValue(value.toFixed(2).replace('.', ',')); }, [value]);
  const handleBlur = () => {
    const numericValue = parseFloat(displayValue.replace(',', '.'));
    if (!isNaN(numericValue)) onChange(numericValue);
    else setDisplayValue(value.toFixed(2).replace('.', ','));
  };
  return <Input type="text" value={displayValue} onChange={(e) => setDisplayValue(e.target.value)} onBlur={handleBlur} className="w-full text-right" />;
}

function ProductSearch({ onProductSelect }: { onProductSelect: (product: Product) => void }) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["products_search", searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      const response = await api.get("/products/search", { params: { q: searchQuery } });
      return response.data;
    },
    enabled: searchQuery.length > 1,
  });
  const handleSelect = (product: Product) => { onProductSelect(product); setSearchQuery(""); setOpen(false); };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><Button variant="outline" role="combobox" className="w-full justify-between">Buscar por código, descrição ou cód. de barras...<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command>
        <CommandInput placeholder="Buscar produto..." onValueChange={setSearchQuery} />
        <CommandList>
          {isLoading && <CommandItem disabled>Buscando...</CommandItem>}
          {!isLoading && !products?.length && searchQuery.length > 1 && <CommandItem disabled>Nenhum produto encontrado.</CommandItem>}
          <CommandGroup>{products?.map((product) => (<CommandItem key={product.id} onSelect={() => handleSelect(product)} value={`${product.code} - ${product.description}`}>{product.code} - {product.description}</CommandItem>))}</CommandGroup>
        </CommandList>
      </Command></PopoverContent>
    </Popover>
  );
}

function CheckoutModal({ isOpen, onClose, totalAmount, onConfirm, isPending }: { isOpen: boolean; onClose: () => void; totalAmount: number; onConfirm: (details: any) => void; isPending: boolean; }) {
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [paymentMethodId, setPaymentMethodId] = useState<string | undefined>(undefined);
  const [paidAmount, setPaidAmount] = useState("");

  const { data: customers } = useQuery<Customer[]>({ queryKey: ["customers"], queryFn: async () => (await api.get("/customers")).data });
  const { data: paymentMethods } = useQuery<PaymentMethod[]>({ queryKey: ["payment-methods"], queryFn: async () => (await api.get("/payment-methods")).data });

  const changeAmount = useMemo(() => (parseFloat(paidAmount.replace(',', '.')) || 0) - totalAmount, [paidAmount, totalAmount]);

  useEffect(() => { if(isOpen) setPaidAmount(totalAmount.toFixed(2).replace('.', ',')); }, [isOpen, totalAmount]);

  const handleConfirm = () => {
    if (!paymentMethodId) { toast.error("Selecione uma forma de pagamento."); return; }
    const finalPaidAmount = parseFloat(paidAmount.replace(',', '.')) || 0;
    if (finalPaidAmount < totalAmount) { toast.error("O valor pago não pode ser menor que o total do pedido."); return; }

    const customer = customers?.find(c => c.id.toString() === customerId);

    onConfirm({
      customer_id: customerId ? parseInt(customerId) : null,
      payment_method_id: parseInt(paymentMethodId),
      paid_amount: finalPaidAmount,
      change_amount: changeAmount,
      customer: customer,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Finalizar Pedido</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="text-center mb-4"><p className="text-lg text-muted-foreground">Total do Pedido</p><p className="text-5xl font-bold">{totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
          <div><Label>Cliente (Opcional)</Label><Select onValueChange={setCustomerId} value={customerId}><SelectTrigger><SelectValue placeholder="Venda sem cliente" /></SelectTrigger><SelectContent>{customers?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Forma de Pagamento</Label><Select onValueChange={setPaymentMethodId} value={paymentMethodId} required><SelectTrigger><SelectValue placeholder="Selecione a forma de pagamento" /></SelectTrigger><SelectContent>{paymentMethods?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.description}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Valor Pago</Label><Input value={paidAmount} onChange={e => setPaidAmount(e.target.value)} className="text-xl h-12 text-right" /></div>
          <div className="flex justify-between items-center bg-muted p-4 rounded-md"><span className="text-lg font-medium">Troco</span><span className={`text-2xl font-bold ${changeAmount < 0 ? 'text-red-500' : 'text-green-500'}`}>{changeAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
        </div>
        <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="button" size="lg" onClick={handleConfirm} disabled={isPending}>{isPending ? 'Processando...' : 'Confirmar Pedido'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Componente Principal da Página de Vendas ---
export default function Sales() {
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [shippingCost, setShippingCost] = useState(0);
  const [displayShippingCost, setDisplayShippingCost] = useState("0,00");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const queryClient = useQueryClient();

  const subtotal = useMemo(() => saleItems.reduce((sum, i) => sum + i.subtotal, 0), [saleItems]);
  const totalAmount = useMemo(() => subtotal + shippingCost, [subtotal, shippingCost]);

  useEffect(() => {
    setDisplayShippingCost(shippingCost.toFixed(2).replace('.', ','));
  }, [shippingCost]);

  const handleShippingCostBlur = () => {
    const numericValue = parseFloat(displayShippingCost.replace(',', '.'));
    if (!isNaN(numericValue)) {
      setShippingCost(numericValue);
    } else {
      setDisplayShippingCost(shippingCost.toFixed(2).replace('.', ','));
    }
  };

  const saleMutation = useMutation({
    mutationFn: async (params: any) => {
      const { customer, ...saleData } = params;
      const payload = {
        ...saleData,
        items: saleItems.map(item => ({ product_id: item.id, quantity: item.quantity, unit_price: item.unit_price, subtotal: item.subtotal })),
        shipping_cost: shippingCost,
        total_amount: totalAmount,
      };
      const response = await api.post("/sales", payload);
      const result = response.data;
      return {
        ...result,
        customer,
        saleDetails: { ...params, total_amount: totalAmount, shipping_cost: shippingCost, subtotal: subtotal }
      };
    },
    onSuccess: ({ saleCode, customer, saleDetails }) => {
      toast.success(`Pedido ${saleCode} realizado com sucesso!`, {
        duration: 10000,
        action: {
          label: "Imprimir Pedido",
          onClick: () => generateStandardPdf({
            fileName: `Pedido-${saleCode}`,
            title: `Pedido de Venda`,
            drawContent: (doc, startY) => {
              let currentY = startY;
              const margin = 15;
              const pageW = doc.internal.pageSize.getWidth();

              // Bloco de Dados do Cliente
              if (customer) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text("DADOS DO CLIENTE", margin, currentY);
                currentY += 5;
                doc.setLineWidth(0.1);
                doc.rect(margin, currentY, pageW - (margin * 2), 15); // Ajustado para 3 linhas
                currentY += 5;
                doc.setFont('helvetica', 'normal');
                doc.text(`Nome: ${customer.name}`, margin + 2, currentY);
                doc.text(`Telefone: ${customer.phone || 'Não informado'}`, margin + 100, currentY);
                currentY += 7;
                doc.text(`CPF/CNPJ: ${customer.document || 'Não informado'}`, margin + 2, currentY);
                currentY += 10;
              }

              // Tabela de Itens
              autoTable(doc, {
                head: [['CÓDIGO', 'DESCRIÇÃO', 'QTD.', 'VL. UNIT.', 'SUBTOTAL']],
                body: saleItems.map(item => [
                  item.code,
                  item.description,
                  item.quantity,
                  item.unit_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                  item.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                ]),
                startY: currentY,
                theme: 'grid',
                headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
                styles: { fontSize: 9, cellPadding: 2 },
                columnStyles: { 4: { halign: 'right' } }
              });

              // Bloco de Resumo Financeiro
              let finalY = (doc as any).lastAutoTable.finalY + 10;
              const summaryX = pageW - margin - 70;
              doc.setFontSize(10);
              doc.setFont('helvetica', 'bold');
              doc.text("RESUMO FINANCEIRO", summaryX, finalY);
              finalY += 5;
              doc.setLineWidth(0.1);
              doc.rect(summaryX - 2, finalY, 72, 34); // Aumentado para caber mais 2 linhas
              finalY += 5;
              doc.setFont('helvetica', 'normal');
              doc.text("Subtotal:", summaryX, finalY);
              doc.text(saleDetails.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), summaryX + 68, finalY, { align: 'right' });
              finalY += 7;
              doc.text("Frete:", summaryX, finalY);
              doc.text(saleDetails.shipping_cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), summaryX + 68, finalY, { align: 'right' });
              finalY += 7;
              doc.setFont('helvetica', 'bold');
              doc.text("TOTAL:", summaryX, finalY);
              doc.text(saleDetails.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), summaryX + 68, finalY, { align: 'right' });
              finalY += 7;
              doc.setFont('helvetica', 'normal');
              doc.text("Valor Pago:", summaryX, finalY);
              doc.text(saleDetails.paid_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), summaryX + 68, finalY, { align: 'right' });
              finalY += 7;
              doc.text("Troco:", summaryX, finalY);
              doc.text(saleDetails.change_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), summaryX + 68, finalY, { align: 'right' });
            }
          })
        },
      });
      setIsCheckoutOpen(false);
      setSaleItems([]);
      setShippingCost(0);
      queryClient.invalidateQueries({ queryKey: ['products_search'] });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error(`Erro ao realizar pedido: ${errorMessage}`);
    }
  });

  const handleAddProduct = (product: Product) => {
    if (product.stock_quantity <= 0) { toast.error("Produto sem estoque!"); return; }
    const salePrice = Number(product.sale_price);
    if (isNaN(salePrice)) { toast.error("Preço de venda inválido."); return; }

    setSaleItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) { toast.warning("Quantidade máxima em estoque atingida."); return prev; }
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unit_price } : i);
      }
      return [...prev, { ...product, quantity: 1, unit_price: salePrice, subtotal: salePrice }];
    });
  };

  const handleUpdateItem = (id: number, field: 'quantity' | 'unit_price', value: number) => {
    setSaleItems(prev => prev.map(i => {
      if (i.id === id) {
        const newQuantity = field === 'quantity' ? value : i.quantity;
        if (newQuantity > i.stock_quantity) {
          toast.warning(`Estoque máximo: ${i.stock_quantity}.`);
          return { ...i, quantity: i.stock_quantity, subtotal: i.stock_quantity * i.unit_price };
        }
        const newUnitPrice = field === 'unit_price' ? value : i.unit_price;
        return { ...i, [field]: value, subtotal: newQuantity * newUnitPrice };
      }
      return i;
    }));
  };

  const handleRemoveItem = (id: number) => setSaleItems(prev => prev.filter(i => i.id !== id));
  const handleCancelSale = () => { if (saleItems.length > 0 && confirm("Deseja realmente cancelar o pedido?")) { setSaleItems([]); setShippingCost(0); } };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" />Adicionar Produto</CardTitle></CardHeader><CardContent><ProductSearch onProductSelect={handleAddProduct} /></CardContent></Card>
          <Card className="flex-grow"><CardHeader><CardTitle>Itens do Pedido</CardTitle></CardHeader><CardContent><div className="border rounded-md"><Table>
            <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead className="w-[100px]">Qtd.</TableHead><TableHead className="w-[150px] text-right">Preço Unit.</TableHead><TableHead className="w-[150px] text-right">Subtotal</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
            <TableBody>{saleItems.length > 0 ? (saleItems.map(item => (
              <TableRow key={item.id}>
                <TableCell>{item.description}</TableCell>
                <TableCell><Input type="number" value={item.quantity} onChange={e => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 1)} className="w-full text-center" min="1" /></TableCell>
                <TableCell className="text-right"><PriceInput value={item.unit_price} onChange={newPrice => handleUpdateItem(item.id, 'unit_price', newPrice)} /></TableCell>
                <TableCell className="text-right font-medium">{item.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                <TableCell><Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}><XCircle className="h-4 w-4 text-red-500" /></Button></TableCell>
              </TableRow>
            ))) : (<TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum item adicionado ao pedido.</TableCell></TableRow>)}
            </TableBody>
          </Table></div></CardContent></Card>
        </div>
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader><CardTitle>Resumo do Pedido</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between items-center text-sm"><span className="text-muted-foreground">Subtotal</span><span>{subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                <div className="flex justify-between items-center">
                  <Label htmlFor="shipping-cost">Frete</Label>
                  <Input
                    id="shipping-cost"
                    type="text"
                    value={displayShippingCost}
                    onChange={(e) => setDisplayShippingCost(e.target.value)}
                    onBlur={handleShippingCostBlur}
                    className="w-28 h-8 text-right"
                  />
                </div>
                <div className="border-t my-2"></div>
                <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button size="lg" className="w-full text-lg" disabled={saleItems.length === 0} onClick={() => setIsCheckoutOpen(true)}>Finalizar Pedido</Button>
              <Button size="lg" variant="outline" className="w-full" onClick={handleCancelSale} disabled={saleItems.length === 0}>Cancelar Pedido</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} totalAmount={totalAmount} onConfirm={(details) => saleMutation.mutate(details)} isPending={saleMutation.isPending} />
    </>
  );
}
